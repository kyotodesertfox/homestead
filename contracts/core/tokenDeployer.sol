// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract TokenDeployer is UUPSUpgradeable, OwnableUpgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public templateAddress;
    mapping(address => bool) public isRegistered;
    address[] public allTokens;

    uint256[47] private __gap;

    // =========================================================================

    uint256 public constant VERSION = 1;

    event TokenDeployed(address indexed proxyAddress, string name, string symbol);

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

    function deployNewToken(
        string memory _name,
        string memory _symbol,
        address _initialOwner
    ) external onlyOwner returns (address) {
        bytes memory _initData = abi.encodeWithSignature(
            "initialize(string,string,address)",
            _name,
            _symbol,
            _initialOwner
        );

        ERC1967Proxy _proxy = new ERC1967Proxy(templateAddress, _initData);
        isRegistered[address(_proxy)] = true;
        allTokens.push(address(_proxy));

        emit TokenDeployed(address(_proxy), _name, _symbol);
        return address(_proxy);
    }

    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    function totalTokens() external view returns (uint256) {
        return allTokens.length;
    }
}
