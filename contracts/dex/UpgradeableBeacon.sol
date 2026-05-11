// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

contract BeaconShell is UpgradeableBeacon {
    constructor(address _logic, address _initialOwner) UpgradeableBeacon(_logic, _initialOwner) {}
}
