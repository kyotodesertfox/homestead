// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../dex/Interfaces.sol";

interface IBurnableToken {
    function burn(uint256 amount) external;
}

contract Marketplace is UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public tokenDeployer;
    address public nftDeployer;
    address public feeCollector;

    mapping(uint256 => Listing) private _listings;
    uint256 public nextListingId;

    // batchId associated with a listing (0 = pre-upgrade listing, no stake tracking)
    mapping(uint256 => uint256) private _listingBatch;
    // tracks which listing a token was sold from (stored as listingId+1; 0 = untracked)
    mapping(uint256 => uint256) private _tokenListingId;
    // $BEER held in escrow per token — burned on redemption to release brewer's stake
    mapping(uint256 => uint256) private _escrowedBeer;

    uint256[42] private __gap;

    // =========================================================================

    struct Listing {
        address nftContract;
        address paymentToken;
        uint256 price;       // in paymentToken's smallest unit (e.g. 1e18 = 1 token)
        address proceeds;    // producer wallet — receives sale revenue after platform fee
        uint256[] inventory; // token IDs held in custody, popped on purchase
        bool active;
    }

    event ListingCreated(uint256 indexed listingId, address indexed nftContract, address indexed paymentToken, address proceeds, uint256 price);
    event InventoryDeposited(uint256 indexed listingId, uint256 count, uint256 totalInventory);
    event InventoryWithdrawn(uint256 indexed listingId, uint256 count);
    event Purchased(uint256 indexed listingId, address indexed buyer, uint256 indexed tokenId, uint256 price);
    event Redeemed(address indexed nftContract, uint256 indexed tokenId, address indexed redeemer);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _tokenDeployer,
        address _nftDeployer,
        address _feeCollector
    ) initializer public {
        __Ownable_init(msg.sender);
        __Pausable_init();
        __ReentrancyGuard_init();

        tokenDeployer = _tokenDeployer;
        nftDeployer   = _nftDeployer;
        feeCollector  = _feeCollector;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // =========================================================================
    // LISTING MANAGEMENT — owner only
    // Both the NFT contract and payment token must be from the trust hierarchy.
    // =========================================================================

    // batchId = 0 is owner-only bypass (pre-upgrade / admin listings).
    // Non-owners must supply a valid batchId from Treasury.postStake().
    function createListing(
        address nftContract,
        address paymentToken,
        uint256 price,
        uint256 batchId
    ) external whenNotPaused returns (uint256 listingId) {
        require(
            INFTDeployer(nftDeployer).isRegistered(nftContract),
            'Marketplace: UNREGISTERED_NFT'
        );
        require(
            ITokenDeployer(tokenDeployer).isRegistered(paymentToken),
            'Marketplace: UNREGISTERED_TOKEN'
        );
        require(price > 0, 'Marketplace: ZERO_PRICE');

        if (msg.sender != owner()) {
            require(batchId > 0, 'Marketplace: BATCH_REQUIRED');
            require(
                ITreasury(feeCollector).validateListingCaller(batchId, msg.sender, nftContract),
                'Marketplace: INVALID_BATCH'
            );
        }

        listingId = nextListingId++;
        _listings[listingId].nftContract  = nftContract;
        _listings[listingId].paymentToken = paymentToken;
        _listings[listingId].price        = price;
        _listings[listingId].proceeds     = msg.sender;
        _listings[listingId].active       = true;

        if (batchId > 0) {
            _listingBatch[listingId] = batchId;
            ITreasury(feeCollector).markListed(batchId, listingId);
        }

        emit ListingCreated(listingId, nftContract, paymentToken, msg.sender, price);
    }

    // Transfer producer NFTs into marketplace custody.
    // Caller must approve this contract on the NFT contract first.
    function depositInventory(uint256 listingId, uint256[] calldata tokenIds) external {
        Listing storage listing = _listings[listingId];
        require(listing.nftContract != address(0), 'Marketplace: LISTING_NOT_FOUND');
        require(
            msg.sender == owner() || msg.sender == listing.proceeds,
            'Marketplace: NOT_AUTHORIZED'
        );

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(
                !INFTTemplate(listing.nftContract).redeemed(tokenIds[i]),
                'Marketplace: TOKEN_ALREADY_REDEEMED'
            );
            IERC721(listing.nftContract).transferFrom(msg.sender, address(this), tokenIds[i]);
            listing.inventory.push(tokenIds[i]);
        }

        emit InventoryDeposited(listingId, tokenIds.length, listing.inventory.length);
    }

    // Pull unsold NFTs back from custody.
    function withdrawInventory(uint256 listingId, uint256 count) external {
        Listing storage listing = _listings[listingId];
        require(
            msg.sender == owner() || msg.sender == listing.proceeds,
            'Marketplace: NOT_AUTHORIZED'
        );
        require(listing.inventory.length >= count, 'Marketplace: INSUFFICIENT_INVENTORY');

        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = listing.inventory[listing.inventory.length - 1];
            listing.inventory.pop();
            IERC721(listing.nftContract).transferFrom(address(this), msg.sender, tokenId);
        }

        emit InventoryWithdrawn(listingId, count);
    }

    function setActive(uint256 listingId, bool active) external {
        require(_listings[listingId].nftContract != address(0), 'Marketplace: LISTING_NOT_FOUND');
        require(
            msg.sender == owner() || msg.sender == _listings[listingId].proceeds,
            'Marketplace: NOT_AUTHORIZED'
        );
        _listings[listingId].active = active;
    }

    function updatePrice(uint256 listingId, uint256 newPrice) external {
        require(newPrice > 0, 'Marketplace: ZERO_PRICE');
        require(
            msg.sender == owner() || msg.sender == _listings[listingId].proceeds,
            'Marketplace: NOT_AUTHORIZED'
        );
        _listings[listingId].price = newPrice;
    }

    // =========================================================================
    // PURCHASE
    // Buyer spends paymentToken; platform fee routes to Treasury immediately.
    // Remainder held in escrow — burned on redemption to release brewer's ETH stake.
    // Caller must approve this contract on the payment token first.
    // =========================================================================

    function buy(uint256 listingId) external nonReentrant whenNotPaused {
        Listing storage listing = _listings[listingId];
        require(listing.active,              'Marketplace: LISTING_NOT_ACTIVE');
        require(listing.inventory.length > 0, 'Marketplace: OUT_OF_STOCK');

        uint256 tokenId = listing.inventory[listing.inventory.length - 1];
        listing.inventory.pop();

        // Record which listing this token came from so redeem() can release the correct stake.
        // Only set on first custody — preserves original batch link if resold through marketplace.
        if (_tokenListingId[tokenId] == 0) {
            _tokenListingId[tokenId] = listingId + 1;
        }

        uint256 fee      = (listing.price * ITreasury(feeCollector).marketplaceFeeBps()) / 10000;
        uint256 escrowed = listing.price - fee;

        // Collect full payment from buyer
        require(
            IERC20(listing.paymentToken).transferFrom(msg.sender, address(this), listing.price),
            'Marketplace: PAYMENT_FAILED'
        );

        // Platform fee → Treasury
        if (fee > 0) {
            require(
                IERC20(listing.paymentToken).transfer(feeCollector, fee),
                'Marketplace: FEE_FAILED'
            );
        }

        // Remainder locked in escrow until physical delivery is confirmed via redeem()
        _escrowedBeer[tokenId] = escrowed;

        // Deliver NFT from custody to buyer
        IERC721(listing.nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit Purchased(listingId, msg.sender, tokenId, listing.price);
    }

    // =========================================================================
    // REDEMPTION
    // Buyer confirms physical delivery by calling redeem(). This burns escrowed
    // $BEER (deflation) and marks the brewer's pro-rata ETH stake as claimable.
    // Caller must be the token holder. Marketplace must be set as a redemptionOperator
    // on the nftTemplate after deployment so it can call through without a separate
    // per-token approval from the holder.
    // =========================================================================

    function redeem(address nftContract, uint256 tokenId) external nonReentrant whenNotPaused {
        require(
            INFTDeployer(nftDeployer).isRegistered(nftContract),
            'Marketplace: UNREGISTERED_NFT'
        );
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender,
            'Marketplace: NOT_OWNER'
        );

        INFTTemplate(nftContract).redeem(tokenId);

        uint256 storedId = _tokenListingId[tokenId];
        if (storedId > 0) {
            uint256 listingId = storedId - 1;

            // Burn escrowed $BEER — this is the unlock key for the brewer's ETH stake
            uint256 escrowed = _escrowedBeer[tokenId];
            if (escrowed > 0) {
                delete _escrowedBeer[tokenId];
                IBurnableToken(_listings[listingId].paymentToken).burn(escrowed);
            }

            // Notify Treasury: mark pro-rata ETH stake claimable for this batch
            uint256 batchId = _listingBatch[listingId];
            if (batchId > 0) {
                ITreasury(feeCollector).onRedeem(batchId);
            }
        }

        emit Redeemed(nftContract, tokenId, msg.sender);
    }

    // =========================================================================
    // READ
    // =========================================================================

    function getListing(uint256 listingId) external view returns (
        address nftContract,
        address paymentToken,
        uint256 price,
        address proceeds,
        uint256 inventoryCount,
        bool active
    ) {
        Listing storage listing = _listings[listingId];
        return (
            listing.nftContract,
            listing.paymentToken,
            listing.price,
            listing.proceeds,
            listing.inventory.length,
            listing.active
        );
    }

    function getInventory(uint256 listingId) external view returns (uint256[] memory) {
        return _listings[listingId].inventory;
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    function setFeeCollector(address _feeCollector) external onlyOwner {
        feeCollector = _feeCollector;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
