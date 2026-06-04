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

interface IRelay {
    function recordRedemption(address redeemer, address token, uint256 tokenId) external;
    function quantumFee() external view returns (uint256);
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
    // buyer's tokens held in escrow per NFT token ID — burned on redemption (deflationary)
    mapping(uint256 => uint256) private _escrowedTokens;

    // Attestation relay — best-effort call after economic settlement completes.
    // A Relay failure never reverts the redemption; Treasury and producer are protected first.
    address public relay;

    // $FARM governance token — collected upfront as quantum messaging subsidy at listing creation.
    address public farmToken;
    // $FARM balance held in escrow per listing — burned per subsidized delivery message.
    mapping(uint256 => uint256) private _subsidyBalance;

    // DEX Router — swaps buyer's escrowed tokens → ETH → producer on redemption.
    address public router;

    uint256[38] private __gap;

    // =========================================================================

    uint256 public constant VERSION = 1;

    struct Listing {
        address nftContract;
        address paymentToken;
        uint256 price;       // in paymentToken's smallest unit (e.g. 1e18 = 1 token)
        address proceeds;    // producer wallet — receives sale revenue after platform fee
        uint256[] inventory; // token IDs held in custody, popped on purchase
        bool active;
    }

    event RelaySet(address indexed relay);
    event RouterSet(address indexed router);
    event FarmTokenSet(address indexed farmToken);
    event ProducerPaid(uint256 indexed listingId, uint256 indexed tokenId, address indexed producer, uint256 ethAmount);
    event SubsidyDeposited(uint256 indexed listingId, address indexed seller, uint256 amount);
    event SubsidyCharged(uint256 indexed listingId, uint256 fee, uint256 remaining);
    event SubsidyReclaimed(uint256 indexed listingId, address indexed to, uint256 amount);
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
        uint256 batchId,
        uint256 subsidyCount  // number of quantum delivery messages seller covers; 0 = no subsidy
    ) external nonReentrant whenNotPaused returns (uint256 listingId) {
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
        _listings[listingId].price        = price * 1e18;
        _listings[listingId].proceeds     = msg.sender;
        _listings[listingId].active       = true;

        if (batchId > 0) {
            _listingBatch[listingId] = batchId;
            ITreasury(feeCollector).markListed(batchId, listingId);
        }

        if (subsidyCount > 0) {
            require(farmToken != address(0), 'Marketplace: FARM_NOT_SET');
            require(relay != address(0),     'Marketplace: RELAY_NOT_SET');
            uint256 fee = IRelay(relay).quantumFee();
            require(fee > 0, 'Marketplace: QUANTUM_FEE_NOT_SET');
            uint256 totalSubsidy = subsidyCount * fee;
            require(
                IERC20(farmToken).transferFrom(msg.sender, address(this), totalSubsidy),
                'Marketplace: SUBSIDY_TRANSFER_FAILED'
            );
            _subsidyBalance[listingId] = totalSubsidy;
            emit SubsidyDeposited(listingId, msg.sender, totalSubsidy);
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

        // Auto-return unused subsidy when seller deactivates — natural "I'm done" signal.
        if (!active && farmToken != address(0)) {
            uint256 subBal = _subsidyBalance[listingId];
            if (subBal > 0) {
                _subsidyBalance[listingId] = 0;
                IERC20(farmToken).transfer(_listings[listingId].proceeds, subBal);
                emit SubsidyReclaimed(listingId, _listings[listingId].proceeds, subBal);
            }
        }
    }

    function updatePrice(uint256 listingId, uint256 newPrice) external {
        require(newPrice > 0, 'Marketplace: ZERO_PRICE');
        require(
            msg.sender == owner() || msg.sender == _listings[listingId].proceeds,
            'Marketplace: NOT_AUTHORIZED'
        );
        _listings[listingId].price = newPrice * 1e18;
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
        _escrowedTokens[tokenId] = escrowed;

        // Deliver NFT from custody to buyer
        IERC721(listing.nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit Purchased(listingId, msg.sender, tokenId, listing.price);
    }

    // =========================================================================
    // REDEMPTION
    // Buyer confirms physical delivery by calling redeem(). Burns buyer's escrowed
    // tokens (deflationary). Treasury releases producer's escrowed tokens, which
    // Marketplace swaps → ETH → producer as sale proceeds.
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

            address payToken = _listings[listingId].paymentToken;
            address producer = _listings[listingId].proceeds;

            // Burn buyer's escrowed tokens — deflationary, ~50% of tokens touched per sale
            uint256 escrowed = _escrowedTokens[tokenId];
            if (escrowed > 0) {
                delete _escrowedTokens[tokenId];
                IBurnableToken(payToken).burn(escrowed);
            }

            // Treasury releases producer's escrowed tokens (held since mintLotNFTs).
            // Marketplace swaps them → ETH → producer as sale proceeds.
            uint256 batchId = _listingBatch[listingId];
            if (batchId > 0) {
                (address releaseToken, uint256 releaseAmount) = ITreasury(feeCollector).onRedeem(batchId);
                if (releaseAmount > 0 && router != address(0)) {
                    address weth = IRouter(router).WETH();
                    address[] memory path = new address[](2);
                    path[0] = releaseToken;
                    path[1] = weth;
                    IERC20(releaseToken).approve(router, releaseAmount);
                    uint256[] memory amounts = IRouter(router).swapExactTokensForETH(
                        releaseAmount,
                        0,
                        path,
                        producer,
                        block.timestamp
                    );
                    emit ProducerPaid(listingId, tokenId, producer, amounts[amounts.length - 1]);
                }
            }
        }

        // Best-effort attestation — Relay failure never reverts economic settlement.
        // Treasury and producer are protected first; Relay provides provenance on top.
        if (relay != address(0)) {
            try IRelay(relay).recordRedemption(msg.sender, nftContract, tokenId) {} catch {}
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

    // Returns the listingId and batchId for a given tokenId purchased via this marketplace.
    // listingId is 0 when the token was never sold through a listing (minted directly, etc.).
    function getTokenListing(uint256 tokenId) external view returns (uint256 listingId, uint256 batchId) {
        uint256 stored = _tokenListingId[tokenId];
        if (stored == 0) return (0, 0);
        listingId = stored - 1;
        batchId   = _listingBatch[listingId];
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    // Called by relay on a subsidized delivery message — burns $FARM from escrowed balance.
    // Returns true if subsidy was applied; false if listing has no balance (buyer pays normally).
    function chargeSubsidy(
        address nftContract,
        uint256 tokenId,
        uint256 fee
    ) external returns (bool) {
        require(msg.sender == relay, 'Marketplace: NOT_RELAY');
        uint256 storedId = _tokenListingId[tokenId];
        if (storedId == 0) return false;
        uint256 listingId = storedId - 1;
        if (_listings[listingId].nftContract != nftContract) return false;
        uint256 balance = _subsidyBalance[listingId];
        if (balance < fee) return false;
        _subsidyBalance[listingId] = balance - fee;
        IBurnableToken(farmToken).burn(fee);
        emit SubsidyCharged(listingId, fee, balance - fee);
        return true;
    }

    // Seller (or owner) reclaims unused $FARM subsidy — call when listing is withdrawn or closed.
    function reclaimSubsidy(uint256 listingId) external nonReentrant {
        Listing storage listing = _listings[listingId];
        require(
            msg.sender == owner() || msg.sender == listing.proceeds,
            'Marketplace: NOT_AUTHORIZED'
        );
        uint256 balance = _subsidyBalance[listingId];
        require(balance > 0, 'Marketplace: NO_SUBSIDY');
        _subsidyBalance[listingId] = 0;
        require(
            IERC20(farmToken).transfer(listing.proceeds, balance),
            'Marketplace: RECLAIM_FAILED'
        );
        emit SubsidyReclaimed(listingId, listing.proceeds, balance);
    }

    function subsidyBalance(uint256 listingId) external view returns (uint256) {
        return _subsidyBalance[listingId];
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        feeCollector = _feeCollector;
    }

    function setFarmToken(address _farmToken) external onlyOwner {
        farmToken = _farmToken;
        emit FarmTokenSet(_farmToken);
    }

    function setRelay(address _relay) external onlyOwner {
        relay = _relay;
        emit RelaySet(_relay);
    }

    function setRouter(address _router) external onlyOwner {
        router = _router;
        emit RouterSet(_router);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
