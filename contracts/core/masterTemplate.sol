// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IFarmDEX {
    function onTokenMinted(uint256 amount) external;
}

contract masterTemplate is ERC20Upgradeable, ERC20PausableUpgradeable, UUPSUpgradeable, OwnableUpgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    mapping(address => bool) public isMinter;
    string private _nameOverride;
    string private _symbolOverride;

    uint256[47] private __gap;

    // =========================================================================

    modifier onlyMinter() {
        require(owner() == msg.sender || isMinter[msg.sender], "Caller is not a minter");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        address initialOwner
    ) initializer public {
        __ERC20_init(_name, _symbol);
        __ERC20Pausable_init();
        __Ownable_init(initialOwner);
        isMinter[initialOwner] = true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // --- Metadata ---

    function name() public view override returns (string memory) {
        return bytes(_nameOverride).length > 0 ? _nameOverride : super.name();
    }

    function symbol() public view override returns (string memory) {
        return bytes(_symbolOverride).length > 0 ? _symbolOverride : super.symbol();
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    function updateMetadata(string memory newName, string memory newSymbol) external onlyMinter {
        _nameOverride = newName;
        _symbolOverride = newSymbol;
    }

    // --- Access Control ---

    function setMinter(address minter, bool status) external onlyOwner {
        isMinter[minter] = status;
    }

    // --- Supply ---

    function mintToWallet(address wallet, uint256 amount) external onlyMinter {
        _mint(wallet, amount * (10 ** uint256(decimals())));
    }

    function mintToPool(address poolAddress, uint256 amount) external onlyMinter {
        uint256 scaledAmount = amount * (10 ** uint256(decimals()));
        _mint(poolAddress, scaledAmount);
        IFarmDEX(poolAddress).onTokenMinted(scaledAmount);
    }

    // Emergency use only — burn tokens from any address to correct inventory parity.
    // To be removed in a future upgrade once the system is stable.
    function burnFromSupply(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
    }

    // --- Emergency ---

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Overrides ---

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        super._update(from, to, value);
    }
}
