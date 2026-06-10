// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./Interfaces.sol";

contract DEXFactory is UUPSUpgradeable, OwnableUpgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public beacon;
    address public feeTo;
    address public feeToSetter;
    address public tokenDeployer;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    address public pairTreasury;  // forwarded to each new pair for LP reward claims

    uint256[43] private __gap;

    // =========================================================================

    uint256 public constant VERSION = 1;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 totalPairs);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _feeToSetter,
        address _pairImplementation,
        address _tokenDeployer
    ) initializer public {
        __Ownable_init(msg.sender);

        feeToSetter   = _feeToSetter;
        tokenDeployer = _tokenDeployer;
        beacon        = address(new UpgradeableBeacon(_pairImplementation, msg.sender));
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // =========================================================================
    // PAIR CREATION
    // Both tokens must be registered by the canonical TokenDeployer.
    // WETH is the only permitted unregistered token (native ETH wrapper).
    // =========================================================================

    function createPair(address tokenA, address tokenB, address weth) external returns (address pair) {
        require(tokenA != tokenB, 'DEX: IDENTICAL_ADDRESSES');

        // Verify both tokens are from the hierarchy — WETH is the only exception
        ITokenDeployer deployer = ITokenDeployer(tokenDeployer);
        require(
            deployer.isRegistered(tokenA) || tokenA == weth,
            'DEX: UNREGISTERED_TOKEN_A'
        );
        require(
            deployer.isRegistered(tokenB) || tokenB == weth,
            'DEX: UNREGISTERED_TOKEN_B'
        );

        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'DEX: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'DEX: PAIR_EXISTS');

        bytes memory data = abi.encodeWithSignature("initialize(address,address,address)", token0, token1, weth);
        BeaconProxy proxy = new BeaconProxy(beacon, data);
        pair = address(proxy);

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        if (pairTreasury != address(0)) {
            IDEXPair(pair).setRewardsTreasury(pairTreasury);
        }

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'DEX: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, 'DEX: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }

    function setTokenDeployer(address _tokenDeployer) external onlyOwner {
        tokenDeployer = _tokenDeployer;
    }

    function setPairTreasury(address _treasury) external onlyOwner {
        pairTreasury = _treasury;
    }

    // Upgrade the logic for every pair simultaneously
    function upgradePairs(address newImplementation) external onlyOwner {
        UpgradeableBeacon(beacon).upgradeTo(newImplementation);
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
}
