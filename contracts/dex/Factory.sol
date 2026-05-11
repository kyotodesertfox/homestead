// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

contract DEXFactory is UUPSUpgradeable, OwnableUpgradeable {
    address public beacon; // The "Source of Truth" for all Pair logic
    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    /// @custom:oz-upgrader-external-delta
    function initialize(address _feeToSetter, address _pairImplementation) initializer public {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        feeToSetter = _feeToSetter;
        // Deploy the Beacon that will manage all future pairs
        beacon = address(new UpgradeableBeacon(_pairImplementation, msg.sender));
    }

    // Required for UUPS - The "Hot Swap" security gate for the Factory itself
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    /**
     * @dev Creates a new Pair using the Beacon Proxy pattern.
     * Every pair deployed this way can be "Hot Swapped" simultaneously.
     */
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, 'DEX: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'DEX: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'DEX: PAIR_EXISTS');

        // Deploy a BeaconProxy that points to our Factory's beacon
        // This is much cheaper than a full deployment and is fully upgradeable.
        bytes memory data = abi.encodeWithSignature("initialize(address,address)", token0, token1);
        BeaconProxy proxy = new BeaconProxy(beacon, data);
        pair = address(proxy);

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in both directions
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    // --- Admin Functions ---

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'DEX: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, 'DEX: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }

    /**
     * @dev The "Master Hot Swap": Update the logic for EVERY pair in existence.
     */
    function upgradePairs(address newImplementation) external onlyOwner {
        UpgradeableBeacon(beacon).upgradeTo(newImplementation);
    }
}
