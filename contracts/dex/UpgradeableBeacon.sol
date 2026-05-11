// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

/**
 * @dev This contract acts as the "Source of Truth" for all DEX Pairs.
 * When you upgrade this, every ART/ETH, ART/TAIKO, etc. pair updates instantly.
 */
contract BeaconShell is UpgradeableBeacon {
    constructor(address _logic, address _initialOwner) UpgradeableBeacon(_logic, _initialOwner) {}
}
