// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract NFTDeployer is UUPSUpgradeable, OwnableUpgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public templateAddress;
    mapping(address => bool) public isRegistered;
    address[] public allContracts;

    uint256[47] private __gap;

    // =========================================================================

    uint256 public constant VERSION = 1;

    event ContractDeployed(address indexed proxyAddress, string name, string symbol);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _initialTemplate, address _initialOwner) initializer public {
        __Ownable_init(_initialOwner);
        templateAddress = _initialTemplate;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function updateTemplate(address _newTemplate) external onlyOwner {
        templateAddress = _newTemplate;
    }

    function deploy(
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

        ERC1967Proxy _proxy = new ERC1967Proxy(templateAddress, _initData);
        isRegistered[address(_proxy)] = true;
        allContracts.push(address(_proxy));

        emit ContractDeployed(address(_proxy), _name, _symbol);
        return address(_proxy);
    }

    function getAllContracts() external view returns (address[] memory) {
        return allContracts;
    }

    function totalContracts() external view returns (uint256) {
        return allContracts.length;
    }
}
