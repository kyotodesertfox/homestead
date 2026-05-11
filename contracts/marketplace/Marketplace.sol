// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../dex/Interfaces.sol";

contract Marketplace is UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public tokenDeployer;
    address public nftDeployer;
    address public feeCollector;
    uint256 public platformFeeBps;

    mapping(uint256 => SKU) private _skus;
    uint256 public nextSkuId;

    uint256[44] private __gap;

    // =========================================================================

    struct SKU {
        address nftContract;
        address paymentToken;
        uint256 price;           // in paymentToken's smallest unit (e.g. 1e18 = 1 token)
        uint256[] inventory;     // token IDs held in custody, popped on purchase
        bool active;
    }

    event SKUCreated(uint256 indexed skuId, address indexed nftContract, address indexed paymentToken, uint256 price);
    event InventoryDeposited(uint256 indexed skuId, uint256 count, uint256 totalInventory);
    event InventoryWithdrawn(uint256 indexed skuId, uint256 count);
    event Purchased(uint256 indexed skuId, address indexed buyer, uint256 indexed tokenId, uint256 price);
    event Redeemed(address indexed nftContract, uint256 indexed tokenId, address indexed redeemer);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _tokenDeployer,
        address _nftDeployer,
        address _feeCollector,
        uint256 _platformFeeBps
    ) initializer public {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        tokenDeployer  = _tokenDeployer;
        nftDeployer    = _nftDeployer;
        feeCollector   = _feeCollector;
        platformFeeBps = _platformFeeBps;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // =========================================================================
    // SKU MANAGEMENT — owner only
    // Both the NFT contract and payment token must be from the trust hierarchy.
    // =========================================================================

    function createSKU(
        address nftContract,
        address paymentToken,
        uint256 price
    ) external onlyOwner returns (uint256 skuId) {
        require(
            INFTDeployer(nftDeployer).isRegistered(nftContract),
            'Marketplace: UNREGISTERED_NFT'
        );
        require(
            ITokenDeployer(tokenDeployer).isRegistered(paymentToken),
            'Marketplace: UNREGISTERED_TOKEN'
        );
        require(price > 0, 'Marketplace: ZERO_PRICE');

        skuId = nextSkuId++;
        _skus[skuId].nftContract   = nftContract;
        _skus[skuId].paymentToken  = paymentToken;
        _skus[skuId].price         = price;
        _skus[skuId].active        = true;

        emit SKUCreated(skuId, nftContract, paymentToken, price);
    }

    // Transfer pre-minted NFTs into marketplace custody.
    // Caller must approve this contract on the NFT contract first.
    function depositInventory(uint256 skuId, uint256[] calldata tokenIds) external onlyOwner {
        SKU storage sku = _skus[skuId];
        require(sku.nftContract != address(0), 'Marketplace: SKU_NOT_FOUND');

        for (uint256 i = 0; i < tokenIds.length; i++) {
            IERC721(sku.nftContract).transferFrom(msg.sender, address(this), tokenIds[i]);
            sku.inventory.push(tokenIds[i]);
        }

        emit InventoryDeposited(skuId, tokenIds.length, sku.inventory.length);
    }

    // Pull unsold NFTs back from custody.
    function withdrawInventory(uint256 skuId, uint256 count) external onlyOwner {
        SKU storage sku = _skus[skuId];
        require(sku.inventory.length >= count, 'Marketplace: INSUFFICIENT_INVENTORY');

        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = sku.inventory[sku.inventory.length - 1];
            sku.inventory.pop();
            IERC721(sku.nftContract).transferFrom(address(this), msg.sender, tokenId);
        }

        emit InventoryWithdrawn(skuId, count);
    }

    function setActive(uint256 skuId, bool active) external onlyOwner {
        require(_skus[skuId].nftContract != address(0), 'Marketplace: SKU_NOT_FOUND');
        _skus[skuId].active = active;
    }

    function updatePrice(uint256 skuId, uint256 newPrice) external onlyOwner {
        require(newPrice > 0, 'Marketplace: ZERO_PRICE');
        _skus[skuId].price = newPrice;
    }

    // =========================================================================
    // PURCHASE
    // Buyer spends paymentToken, receives the next available NFT from inventory.
    // 2% platform fee routes to feeCollector (Treasury).
    // Caller must approve this contract on the payment token first.
    // =========================================================================

    function buy(uint256 skuId) external nonReentrant whenNotPaused {
        SKU storage sku = _skus[skuId];
        require(sku.active, 'Marketplace: SKU_NOT_ACTIVE');
        require(sku.inventory.length > 0, 'Marketplace: OUT_OF_STOCK');

        uint256 tokenId = sku.inventory[sku.inventory.length - 1];
        sku.inventory.pop();

        uint256 fee      = (sku.price * platformFeeBps) / 10000;
        uint256 proceeds = sku.price - fee;

        // Collect full payment from buyer
        require(
            IERC20(sku.paymentToken).transferFrom(msg.sender, address(this), sku.price),
            'Marketplace: PAYMENT_FAILED'
        );

        // Route fee to Treasury
        if (fee > 0) {
            require(
                IERC20(sku.paymentToken).transfer(feeCollector, fee),
                'Marketplace: FEE_FAILED'
            );
        }

        // Route proceeds to Treasury (single-operator: same address for now)
        if (proceeds > 0) {
            require(
                IERC20(sku.paymentToken).transfer(feeCollector, proceeds),
                'Marketplace: PROCEEDS_FAILED'
            );
        }

        // Deliver NFT from custody to buyer
        IERC721(sku.nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit Purchased(skuId, msg.sender, tokenId, sku.price);
    }

    // =========================================================================
    // REDEMPTION
    // Burns the NFT on physical pickup. The corresponding payment token balance
    // in the Treasury is burned separately by the owner to maintain 1:1 parity.
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

        // Approve and burn via nftTemplate's burn function
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        // Call burn on the nftTemplate (ERC721Burnable)
        (bool success, ) = nftContract.call(
            abi.encodeWithSignature("burn(uint256)", tokenId)
        );
        require(success, 'Marketplace: BURN_FAILED');

        emit Redeemed(nftContract, tokenId, msg.sender);
    }

    // =========================================================================
    // READ
    // =========================================================================

    function getSKU(uint256 skuId) external view returns (
        address nftContract,
        address paymentToken,
        uint256 price,
        uint256 inventoryCount,
        bool active
    ) {
        SKU storage sku = _skus[skuId];
        return (sku.nftContract, sku.paymentToken, sku.price, sku.inventory.length, sku.active);
    }

    function getInventory(uint256 skuId) external view returns (uint256[] memory) {
        return _skus[skuId].inventory;
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    function setFeeCollector(address _feeCollector) external onlyOwner {
        feeCollector = _feeCollector;
    }

    function setPlatformFee(uint256 _platformFeeBps) external onlyOwner {
        require(_platformFeeBps <= 1000, 'Marketplace: FEE_TOO_HIGH'); // 10% max
        platformFeeBps = _platformFeeBps;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
