// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../dex/Interfaces.sol";

contract Marketplace is UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuard {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public tokenDeployer;
    address public nftDeployer;
    address public feeCollector;

    mapping(uint256 => Listing) private _listings;
    uint256 public nextListingId;

    uint256[45] private __gap;

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

        tokenDeployer = _tokenDeployer;
        nftDeployer   = _nftDeployer;
        feeCollector  = _feeCollector;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // =========================================================================
    // LISTING MANAGEMENT — owner only
    // Both the NFT contract and payment token must be from the trust hierarchy.
    // =========================================================================

    function createListing(
        address nftContract,
        address paymentToken,
        uint256 price,
        address proceeds
    ) external onlyOwner returns (uint256 listingId) {
        require(
            INFTDeployer(nftDeployer).isRegistered(nftContract),
            'Marketplace: UNREGISTERED_NFT'
        );
        require(
            ITokenDeployer(tokenDeployer).isRegistered(paymentToken),
            'Marketplace: UNREGISTERED_TOKEN'
        );
        require(price > 0,              'Marketplace: ZERO_PRICE');
        require(proceeds != address(0), 'Marketplace: ZERO_PROCEEDS');

        listingId = nextListingId++;
        _listings[listingId].nftContract  = nftContract;
        _listings[listingId].paymentToken = paymentToken;
        _listings[listingId].price        = price;
        _listings[listingId].proceeds     = proceeds;
        _listings[listingId].active       = true;

        emit ListingCreated(listingId, nftContract, paymentToken, proceeds, price);
    }

    // Transfer producer NFTs into marketplace custody.
    // Caller must approve this contract on the NFT contract first.
    function depositInventory(uint256 listingId, uint256[] calldata tokenIds) external onlyOwner {
        Listing storage listing = _listings[listingId];
        require(listing.nftContract != address(0), 'Marketplace: LISTING_NOT_FOUND');

        for (uint256 i = 0; i < tokenIds.length; i++) {
            IERC721(listing.nftContract).transferFrom(msg.sender, address(this), tokenIds[i]);
            listing.inventory.push(tokenIds[i]);
        }

        emit InventoryDeposited(listingId, tokenIds.length, listing.inventory.length);
    }

    // Pull unsold NFTs back from custody.
    function withdrawInventory(uint256 listingId, uint256 count) external onlyOwner {
        Listing storage listing = _listings[listingId];
        require(listing.inventory.length >= count, 'Marketplace: INSUFFICIENT_INVENTORY');

        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = listing.inventory[listing.inventory.length - 1];
            listing.inventory.pop();
            IERC721(listing.nftContract).transferFrom(address(this), msg.sender, tokenId);
        }

        emit InventoryWithdrawn(listingId, count);
    }

    function setActive(uint256 listingId, bool active) external onlyOwner {
        require(_listings[listingId].nftContract != address(0), 'Marketplace: LISTING_NOT_FOUND');
        _listings[listingId].active = active;
    }

    function updatePrice(uint256 listingId, uint256 newPrice) external onlyOwner {
        require(newPrice > 0, 'Marketplace: ZERO_PRICE');
        _listings[listingId].price = newPrice;
    }

    // =========================================================================
    // PURCHASE
    // Buyer spends paymentToken, receives the next available NFT from inventory.
    // Platform fee routes to feeCollector (Treasury); remainder to producer.
    // Caller must approve this contract on the payment token first.
    // =========================================================================

    function buy(uint256 listingId) external nonReentrant whenNotPaused {
        Listing storage listing = _listings[listingId];
        require(listing.active,              'Marketplace: LISTING_NOT_ACTIVE');
        require(listing.inventory.length > 0, 'Marketplace: OUT_OF_STOCK');

        uint256 tokenId = listing.inventory[listing.inventory.length - 1];
        listing.inventory.pop();

        uint256 fee      = (listing.price * ITreasury(feeCollector).marketplaceFeeBps()) / 10000;
        uint256 proceeds = listing.price - fee;

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

        // Sale proceeds → producer
        if (proceeds > 0) {
            require(
                IERC20(listing.paymentToken).transfer(listing.proceeds, proceeds),
                'Marketplace: PROCEEDS_FAILED'
            );
        }

        // Deliver NFT from custody to buyer
        IERC721(listing.nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit Purchased(listingId, msg.sender, tokenId, listing.price);
    }

    // =========================================================================
    // REDEMPTION
    // Burns the NFT on physical pickup.
    // Emits an event the POS system can listen for.
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

        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        (bool success, ) = nftContract.call(
            abi.encodeWithSignature("burn(uint256)", tokenId)
        );
        require(success, 'Marketplace: BURN_FAILED');

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
