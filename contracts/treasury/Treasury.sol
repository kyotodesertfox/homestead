// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../dex/Interfaces.sol";

interface IMintableToken {
    function mintToWallet(address to, uint256 amount) external;
    function burnFromSupply(address from, uint256 amount) external;
    function totalSupply() external view returns (uint256);
}

contract Treasury is UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public tokenDeployer;
    address public dexFactory;

    // Platform fee parameters (governable)
    uint256 public entryFeeBps;  // fee on ETH→token (default 0)
    uint256 public exitFeeBps;   // fee on token→ETH (default 500 = 5%)

    // Collateral accounting per producer per token
    // producer => token => ETH posted (wei)
    mapping(address => mapping(address => uint256)) public collateralPosted;
    // producer => token => token units allocated (unlocked for minting)
    mapping(address => mapping(address => uint256)) public tokensAllocated;
    // producer => token => token units already minted
    mapping(address => mapping(address => uint256)) public tokensMinted;

    // Total ETH collateral held per token (across all producers)
    mapping(address => uint256) public totalCollateral;

    // Safety multiplier: producer must post (safetyMultiplier * tokenPrice) worth of ETH
    // to unlock one token unit. Expressed as a fraction: safetyNumerator / 1e18.
    // e.g. safetyNumerator = 1.2e18 means 120% collateral required.
    uint256 public safetyNumerator;

    // Accumulated protocol fees (ETH) — claimable by owner
    uint256 public accumulatedFees;

    uint256[43] private __gap;

    // =========================================================================

    event CollateralPosted(address indexed producer, address indexed token, uint256 ethAmount, uint256 tokensUnlocked);
    event CollateralReleased(address indexed producer, address indexed token, uint256 ethAmount, uint256 tokensRevoked);
    event TokensMinted(address indexed producer, address indexed token, address indexed to, uint256 amount);
    event TokensBurned(address indexed token, uint256 amount);
    event FeeParametersUpdated(uint256 entryFeeBps, uint256 exitFeeBps);
    event SafetyMultiplierUpdated(uint256 safetyNumerator);
    event FeesCollected(address indexed token, uint256 amount);
    event FeesWithdrawn(address indexed to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _tokenDeployer,
        address _dexFactory,
        uint256 _entryFeeBps,
        uint256 _exitFeeBps
    ) initializer public {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        tokenDeployer  = _tokenDeployer;
        dexFactory     = _dexFactory;
        entryFeeBps    = _entryFeeBps;
        exitFeeBps     = _exitFeeBps;
        safetyNumerator = 1.2e18; // 120% collateral required by default
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // =========================================================================
    // RECEIVE — accepts ETH from Router (platform fees) and direct deposits
    // =========================================================================

    receive() external payable {
        accumulatedFees += msg.value;
    }

    // =========================================================================
    // COLLATERAL — producers post ETH to unlock token minting capacity
    //
    // The ratio is: tokensUnlocked = (ethPosted * 1e18) / (tokenPrice * safetyNumerator)
    // where tokenPrice is the DEX spot price in ETH per token unit.
    //
    // If there is no DEX price yet (pair not seeded), the owner must manually
    // call setAllocation() to bootstrap the first producer.
    // =========================================================================

    function postCollateral(address token, address weth) external payable nonReentrant whenNotPaused {
        require(ITokenDeployer(tokenDeployer).isRegistered(token), 'Treasury: UNREGISTERED_TOKEN');
        require(msg.value > 0, 'Treasury: ZERO_COLLATERAL');

        uint256 unlocked = _computeUnlock(token, weth, msg.value);
        require(unlocked > 0, 'Treasury: UNLOCK_TOO_SMALL');

        collateralPosted[msg.sender][token] += msg.value;
        tokensAllocated[msg.sender][token]  += unlocked;
        totalCollateral[token]              += msg.value;

        emit CollateralPosted(msg.sender, token, msg.value, unlocked);
    }

    // Release unused collateral (only the portion backing unminted tokens).
    // Minted tokens remain backed; producer cannot pull collateral already deployed.
    function releaseCollateral(address token, address weth, uint256 ethAmount) external nonReentrant whenNotPaused {
        uint256 posted  = collateralPosted[msg.sender][token];
        uint256 minted  = tokensMinted[msg.sender][token];
        require(posted > 0, 'Treasury: NO_COLLATERAL');

        // Compute how much ETH is required to back already-minted tokens
        uint256 mintedBackingRequired = _backingRequired(token, weth, minted);
        uint256 freeable = posted > mintedBackingRequired ? posted - mintedBackingRequired : 0;
        require(ethAmount <= freeable, 'Treasury: INSUFFICIENT_FREE_COLLATERAL');

        uint256 tokensRevoked = _computeUnlock(token, weth, ethAmount);

        collateralPosted[msg.sender][token] -= ethAmount;
        tokensAllocated[msg.sender][token]  -= tokensRevoked;
        totalCollateral[token]              -= ethAmount;

        (bool ok, ) = msg.sender.call{value: ethAmount}("");
        require(ok, 'Treasury: ETH_RETURN_FAILED');

        emit CollateralReleased(msg.sender, token, ethAmount, tokensRevoked);
    }

    // =========================================================================
    // MINTING — producer mints against their allocated capacity
    // =========================================================================

    function mintTokens(address token, address to, uint256 amount) external nonReentrant whenNotPaused {
        uint256 remaining = tokensAllocated[msg.sender][token] - tokensMinted[msg.sender][token];
        require(amount <= remaining, 'Treasury: EXCEEDS_ALLOCATION');

        tokensMinted[msg.sender][token] += amount;

        IMintableToken(token).mintToWallet(to, amount);

        emit TokensMinted(msg.sender, token, to, amount);
    }

    // =========================================================================
    // BURN ON REDEEM — called by Marketplace after NFT burn
    // Burns the payment tokens that were sent to feeCollector (this contract)
    // to maintain 1:1 backing proof: if an NFT is redeemed, the ETH collateral
    // backing that unit is also released (goods delivered, backing no longer needed).
    // Owner calls this after confirming physical delivery has happened.
    // =========================================================================

    function burnRedeemedTokens(address token, address producer, uint256 amount) external onlyOwner {
        require(ITokenDeployer(tokenDeployer).isRegistered(token), 'Treasury: UNREGISTERED_TOKEN');

        // Reduce the producer's minted count — goods have left the system
        if (tokensMinted[producer][token] >= amount) {
            tokensMinted[producer][token] -= amount;
        }

        // Burn tokens held by this contract (payment received from buy() in Marketplace)
        IMintableToken(token).burnFromSupply(address(this), amount);

        emit TokensBurned(token, amount);
    }

    // =========================================================================
    // FEE MANAGEMENT
    // =========================================================================

    function setFeeParameters(uint256 _entryFeeBps, uint256 _exitFeeBps) external onlyOwner {
        require(_entryFeeBps <= 500, 'Treasury: ENTRY_FEE_TOO_HIGH');  // 5% max
        require(_exitFeeBps  <= 1000, 'Treasury: EXIT_FEE_TOO_HIGH');  // 10% max
        entryFeeBps = _entryFeeBps;
        exitFeeBps  = _exitFeeBps;
        emit FeeParametersUpdated(_entryFeeBps, _exitFeeBps);
    }

    function setSafetyMultiplier(uint256 _safetyNumerator) external onlyOwner {
        require(_safetyNumerator >= 1e18, 'Treasury: BELOW_100_PERCENT'); // minimum 100%
        safetyNumerator = _safetyNumerator;
        emit SafetyMultiplierUpdated(_safetyNumerator);
    }

    function withdrawFees(address to, uint256 amount) external onlyOwner nonReentrant {
        require(amount <= accumulatedFees, 'Treasury: INSUFFICIENT_FEES');
        accumulatedFees -= amount;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, 'Treasury: WITHDRAW_FAILED');
        emit FeesWithdrawn(to, amount);
    }

    // =========================================================================
    // ADMIN — override allocation without DEX price (bootstrap / emergency)
    // =========================================================================

    function setAllocation(address producer, address token, uint256 amount) external onlyOwner {
        tokensAllocated[producer][token] = amount;
    }

    function setDexFactory(address _dexFactory) external onlyOwner {
        dexFactory = _dexFactory;
    }

    function setTokenDeployer(address _tokenDeployer) external onlyOwner {
        tokenDeployer = _tokenDeployer;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // =========================================================================
    // READ
    // =========================================================================

    function floorBalance() external view returns (uint256) {
        return address(this).balance - accumulatedFees;
    }

    function availableToMint(address producer, address token) external view returns (uint256) {
        uint256 allocated = tokensAllocated[producer][token];
        uint256 minted    = tokensMinted[producer][token];
        return allocated > minted ? allocated - minted : 0;
    }

    function collateralRatio(address token, address weth) external view returns (uint256 ratioBps) {
        uint256 supply    = IMintableToken(token).totalSupply();
        if (supply == 0) return type(uint256).max;

        uint256 spotPrice = _getSpotPrice(token, weth); // ETH per token (1e18 scale)
        if (spotPrice == 0) return 0;

        uint256 backing = (totalCollateral[token] * 1e18) / (supply * spotPrice / 1e18);
        ratioBps = (backing * 10000) / 1e18;
    }

    // =========================================================================
    // INTERNAL
    // =========================================================================

    function _computeUnlock(address token, address weth, uint256 ethAmount) internal view returns (uint256) {
        uint256 spotPrice = _getSpotPrice(token, weth); // ETH per 1 token (1e18 scale)
        if (spotPrice == 0) return 0;

        // tokensUnlocked = ethAmount * 1e18 / (spotPrice * safetyNumerator / 1e18)
        //                = ethAmount * 1e36 / (spotPrice * safetyNumerator)
        return (ethAmount * 1e36) / (spotPrice * safetyNumerator);
    }

    function _backingRequired(address token, address weth, uint256 tokenAmount) internal view returns (uint256) {
        uint256 spotPrice = _getSpotPrice(token, weth);
        if (spotPrice == 0) return 0;
        // ethRequired = tokenAmount * spotPrice * safetyNumerator / 1e36
        return (tokenAmount * spotPrice * safetyNumerator) / 1e36;
    }

    function _getSpotPrice(address token, address weth) internal view returns (uint256 ethPerToken) {
        address pair = IFactory(dexFactory).getPair(token, weth);
        if (pair == address(0)) return 0;

        (uint112 r0, uint112 r1) = IPair(pair).getReserves();
        if (r0 == 0 || r1 == 0) return 0;

        address t0 = IPair(pair).token0();

        // price = reserveETH / reserveToken, scaled to 1e18
        if (t0 == weth) {
            ethPerToken = (uint256(r0) * 1e18) / uint256(r1);
        } else {
            ethPerToken = (uint256(r1) * 1e18) / uint256(r0);
        }
    }
}
