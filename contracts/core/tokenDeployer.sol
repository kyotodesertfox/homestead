// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenDeployer is Ownable {

    // This is your "Gold Image" Blueprint
    address public templateAddress;

    // Log for your "Server" history
    event tokenDeployed(address indexed proxyAddress, string name, string symbol);

    constructor(address _initialTemplate) Ownable(msg.sender) {
        templateAddress = _initialTemplate;
    }

    /**
     * @dev Sets a new "Gold Image" if you ever upgrade the masterTemplate logic.
     */
    function updateTemplate(address _newTemplate) external onlyOwner {
        templateAddress = _newTemplate;
    }

    /**
     * @dev The main "Provisioning" command.
     * This creates the proxy (writable / public) and initializes it in one atomic step.
     */
    function deployNewToken(
        string memory _name,
        string memory _symbol,
        address _initialOwner
    ) external onlyOwner returns (address) {

        // 1. Prepare the "Setup Script" (Initialization Data)
        // This encodes the call to the 'initialize' function in the blueprint
        bytes memory _initData = abi.encodeWithSignature(
            "initialize(string,string,address)",
                                                         _name,
                                                         _symbol,
                                                         _initialOwner
        );

        // 2. Deploy the proxy (writable / public)
        // This links the new address to your implementation (read-only / internal)
        ERC1967Proxy _proxy = new ERC1967Proxy(templateAddress, _initData);

        // 3. Log the event
        emit tokenDeployed(address(_proxy), _name, _symbol);

        return address(_proxy);
    }
}
