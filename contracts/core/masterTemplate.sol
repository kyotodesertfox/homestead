// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract masterTemplate is ERC20Upgradeable, ERC20PausableUpgradeable, UUPSUpgradeable, OwnableUpgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    mapping(address => bool) public isMinter;
    string private _nameOverride;
    string private _symbolOverride;
    string private _contractURI;

    uint256[46] private __gap;

    // =========================================================================

    uint256 public constant VERSION = 1;

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

    function setContractURI(string memory uri) external onlyOwner {
        _contractURI = uri;
    }

    function contractURI() external view returns (string memory) {
        return _contractURI;
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
        _mint(poolAddress, amount * (10 ** uint256(decimals())));
    }

    // Standard burn — any holder may destroy their own tokens.
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    // Approved spender may burn on behalf of an account (e.g. Marketplace, Relay).
    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }

    function mintExact(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    function burnFromMinter(address account, uint256 amount) external onlyMinter {
        _burn(account, amount);
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
