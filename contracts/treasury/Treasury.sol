// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../dex/Interfaces.sol";

interface IMintableToken {
    function mintToWallet(address to, uint256 amount) external;
    function totalSupply() external view returns (uint256);
}

contract Treasury is UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuard {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public tokenDeployer;
    address public nftDeployer;
    address public dexFactory;

    // Each component has its own named fee. Components read their own variable;
    // all are set here so there is one place to govern the entire system.
    uint256 public dexEntryFeeBps;      // DEX Router: ETH → token (default 0, free entry)
    uint256 public dexExitFeeBps;       // DEX Router: token → ETH (default 500 = 5%)
    uint256 public marketplaceFeeBps;   // Marketplace: fee on NFT purchases (default 200 = 2%)

    uint256 public accumulatedFees;

    // ETH price to purchase one production NFT, set per collection by the owner.
    // ETH paid is permanently locked — it is never returned. This is the floor.
    mapping(address => uint256) public nftPrices;

    uint256[42] private __gap;

    // =========================================================================

    event NFTPriceSet(address indexed nftContract, uint256 priceWei);
    event InventoryNFTPurchased(address indexed producer, address indexed nftContract, uint256 indexed tokenId, uint256 ethPaid);
    event LaborMinted(address indexed to, address indexed token, uint256 amount);
    event DexEntryFeeUpdated(uint256 feeBps);
    event DexExitFeeUpdated(uint256 feeBps);
    event MarketplaceFeeUpdated(uint256 feeBps);
    event FeesWithdrawn(address indexed to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _tokenDeployer,
        address _nftDeployer,
        address _dexFactory,
        uint256 _dexEntryFeeBps,
        uint256 _dexExitFeeBps,
        uint256 _marketplaceFeeBps
    ) initializer public {
        __Ownable_init(msg.sender);
        __Pausable_init();

        tokenDeployer      = _tokenDeployer;
        nftDeployer        = _nftDeployer;
        dexFactory         = _dexFactory;
        dexEntryFeeBps     = _dexEntryFeeBps;
        dexExitFeeBps      = _dexExitFeeBps;
        marketplaceFeeBps  = _marketplaceFeeBps;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // =========================================================================
    // RECEIVE — accepts ETH from Router (platform fees) and direct deposits
    // =========================================================================

    receive() external payable {
        accumulatedFees += msg.value;
    }

    // =========================================================================
    // NFT VENDING — producer pays ETH to acquire a production NFT
    //
    // Owner mints a batch to Treasury via nftTemplate.mintBatch(treasury, cids),
    // then sets a price per collection via setNFTPrice(). Producer calls
    // purchaseInventoryNFT() sending the exact ETH price; Treasury transfers
    // the NFT to them. ETH paid is permanently locked as the ecosystem floor —
    // it is never refunded. The producer then lists the NFT on the Marketplace.
    // =========================================================================

    function setNFTPrice(address nftContract, uint256 priceWei) external onlyOwner {
        require(INFTDeployer(nftDeployer).isRegistered(nftContract), 'Treasury: UNREGISTERED_NFT');
        nftPrices[nftContract] = priceWei;
        emit NFTPriceSet(nftContract, priceWei);
    }

    function purchaseInventoryNFT(
        address nftContract,
        uint256 tokenId
    ) external payable nonReentrant whenNotPaused {
        require(INFTDeployer(nftDeployer).isRegistered(nftContract), 'Treasury: UNREGISTERED_NFT');

        uint256 price = nftPrices[nftContract];
        require(price > 0,          'Treasury: PRICE_NOT_SET');
        require(msg.value >= price, 'Treasury: INSUFFICIENT_PAYMENT');

        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        uint256 excess = msg.value - price;
        if (excess > 0) {
            (bool ok, ) = msg.sender.call{value: excess}("");
            require(ok, 'Treasury: REFUND_FAILED');
        }

        emit InventoryNFTPurchased(msg.sender, nftContract, tokenId, price);
    }

    // =========================================================================
    // LABOR MINTING — owner mints tokens directly to a worker as compensation.
    // This path creates supply without a direct ETH entry, so issuance must be
    // managed proportionally by the owner to avoid diluting the floor ratio.
    // Token contract must have Treasury set as an authorized minter.
    // =========================================================================

    function mintLaborReward(address token, address to, uint256 amount) external onlyOwner {
        require(ITokenDeployer(tokenDeployer).isRegistered(token), 'Treasury: UNREGISTERED_TOKEN');
        IMintableToken(token).mintToWallet(to, amount);
        emit LaborMinted(to, token, amount);
    }

    // =========================================================================
    // FEE GOVERNANCE — each component has its own setter and cap
    // Add a new setter here whenever a new fee-bearing component is deployed.
    // =========================================================================

    function setDexEntryFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, 'Treasury: FEE_TOO_HIGH');
        dexEntryFeeBps = _feeBps;
        emit DexEntryFeeUpdated(_feeBps);
    }

    function setDexExitFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, 'Treasury: FEE_TOO_HIGH');
        dexExitFeeBps = _feeBps;
        emit DexExitFeeUpdated(_feeBps);
    }

    function setMarketplaceFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, 'Treasury: FEE_TOO_HIGH');
        marketplaceFeeBps = _feeBps;
        emit MarketplaceFeeUpdated(_feeBps);
    }

    function withdrawFees(address to, uint256 amount) external onlyOwner nonReentrant {
        require(amount <= accumulatedFees, 'Treasury: INSUFFICIENT_FEES');
        accumulatedFees -= amount;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, 'Treasury: WITHDRAW_FAILED');
        emit FeesWithdrawn(to, amount);
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    function setTokenDeployer(address _tokenDeployer) external onlyOwner {
        tokenDeployer = _tokenDeployer;
    }

    function setNFTDeployer(address _nftDeployer) external onlyOwner {
        nftDeployer = _nftDeployer;
    }

    function setDexFactory(address _dexFactory) external onlyOwner {
        dexFactory = _dexFactory;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // =========================================================================
    // READ
    // =========================================================================

    // ETH permanently locked from NFT purchases (excludes accumulated fees).
    // This is the hard floor — it only ever grows.
    function floorBalance() public view returns (uint256) {
        uint256 bal = address(this).balance;
        return bal > accumulatedFees ? bal - accumulatedFees : 0;
    }

    // How many bps of the token's ETH market cap is covered by the Treasury floor.
    // e.g. 12000 = 120% backed. Requires a live DEX pair; returns 0 if not seeded.
    function floorRatio(address token, address weth) external view returns (uint256 ratioBps) {
        uint256 supply = IMintableToken(token).totalSupply();
        if (supply == 0) return type(uint256).max;

        address pair = IFactory(dexFactory).getPair(token, weth);
        if (pair == address(0)) return 0;

        (uint112 r0, uint112 r1) = IPair(pair).getReserves();
        if (r0 == 0 || r1 == 0) return 0;

        address t0 = IPair(pair).token0();
        uint256 spotPrice = (t0 == weth)
            ? (uint256(r0) * 1e18) / uint256(r1)
            : (uint256(r1) * 1e18) / uint256(r0);

        if (spotPrice == 0) return 0;

        uint256 marketCapEth = (supply * spotPrice) / 1e18;
        ratioBps = (floorBalance() * 10000) / marketCapEth;
    }
}
