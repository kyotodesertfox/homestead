// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract NFTDeployer is UUPSUpgradeable, OwnableUpgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public beacon;
    mapping(address => bool) public isRegistered;
    address[] public allContracts;
    mapping(address => bool) public approvedImplementations;

    uint256[46] private __gap;

    // =========================================================================

    uint256 public constant VERSION = 2;

    event CollectionDeployed(address indexed collection, address indexed beacon, string name, string symbol);
    event CustomCollectionDeployed(address indexed collection, address indexed impl, string name, string symbol);
    event ImplementationApproved(address indexed impl);
    event ImplementationRevoked(address indexed impl);

    error NotApprovedImplementation();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _beacon, address _initialOwner) initializer public {
        __Ownable_init(_initialOwner);
        beacon = _beacon;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function deployCollection(
        string memory _name,
        string memory _symbol,
        string memory _contractCID,
        address _initialOwner
    ) external onlyOwner returns (address) {
        bytes memory _initData = abi.encodeWithSignature(
            "initialize(string,string,string,address)",
            _name,
            _symbol,
            _contractCID,
            _initialOwner
        );

        BeaconProxy _proxy = new BeaconProxy(beacon, _initData);
        isRegistered[address(_proxy)] = true;
        allContracts.push(address(_proxy));

        emit CollectionDeployed(address(_proxy), beacon, _name, _symbol);
        return address(_proxy);
    }

    function deployCustomCollection(
        address _impl,
        string memory _name,
        string memory _symbol,
        string memory _contractCID,
        address _initialOwner
    ) external onlyOwner returns (address) {
        if (!approvedImplementations[_impl]) revert NotApprovedImplementation();

        bytes memory _initData = abi.encodeWithSignature(
            "initialize(string,string,string,address)",
            _name,
            _symbol,
            _contractCID,
            _initialOwner
        );

        ERC1967Proxy _proxy = new ERC1967Proxy(_impl, _initData);
        isRegistered[address(_proxy)] = true;
        allContracts.push(address(_proxy));

        emit CustomCollectionDeployed(address(_proxy), _impl, _name, _symbol);
        return address(_proxy);
    }

    function approveImplementation(address _impl) external onlyOwner {
        approvedImplementations[_impl] = true;
        emit ImplementationApproved(_impl);
    }

    function revokeImplementation(address _impl) external onlyOwner {
        approvedImplementations[_impl] = false;
        emit ImplementationRevoked(_impl);
    }

    function setBeacon(address _beacon) external onlyOwner {
        beacon = _beacon;
    }

    function getAllContracts() external view returns (address[] memory) {
        return allContracts;
    }

    function totalContracts() external view returns (uint256) {
        return allContracts.length;
    }
}
