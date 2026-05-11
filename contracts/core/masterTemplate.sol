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
    // STORAGE BRIDGEHEAD - DO NOT REORDER OR DELETE EXISTING VARIABLES
    // =========================================================================
    // When upgrading (V2, V3, etc.), ONLY add new variables BELOW this line.
    // Changing the order, type, or names of existing variables will cause
    // storage collisions and permanent contract failure.
    // -------------------------------------------------------------------------

    /// @dev Mapping to allow multiple wallets or bots to mint tokens.
    mapping(address => bool) public isMinter;

    // =========================================================================

    /**
     * @dev Restricts access to only addresses registered as minters or the owner.
     */
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

        string private _nameOverride;
        string private _symbolOverride;

        // Reserve 50 slots for future logic expansion (e.g., taxes, tiers, etc.)
        uint256[50] private __gap;

        function name() public view override returns (string memory) {
            return bytes(_nameOverride).length > 0 ? _nameOverride : super.name();
        }

        function symbol() public view override returns (string memory) {
            return bytes(_symbolOverride).length > 0 ? _symbolOverride : super.symbol();
        }

        function updateMetadata(string memory newName, string memory newSymbol) external onlyMinter {
            _nameOverride = newName;
            _symbolOverride = newSymbol;
        }    


    // Whole numbers only
    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    /**
     * @dev Add or remove a wallet from the minter list.
     */
    function setMinter(address minter, bool status) external onlyOwner {
        isMinter[minter] = status;
    }

    /**
     * @dev Stops all token transfers. Useful for emergencies or maintenance.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Restumes all token transfers.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Mint tokens directly to a personal wallet.
     */
    function mintToWallet(address wallet, uint256 amount) external onlyMinter {
        uint256 scaledAmount = amount * (10 ** uint256(decimals()));
        _mint(wallet, scaledAmount);
    }

    /**
     * @dev Mint tokens directly into a Liquidity Pool or Marketplace contract.
     * Automatically notifies the DEX to update its internal inventory state.
     */
    function mintToPool(address poolAddress, uint256 amount) external onlyMinter {
        uint256 scaledAmount = amount * (10 ** uint256(decimals()));
        _mint(poolAddress, scaledAmount);
        IFarmDEX(poolAddress).onTokenMinted(scaledAmount);
    }

    /**
     * @dev Farn owner can burn tokens from any address
     * EMERGENCY USE ONLY to correct any major errors affecting parity w/inventory
     * especially due to a severe hack or compromise. Function will be removed in
     * the future after significant testing
     */
    function burnFromSupply(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
    }

    function _update(address from, address to, uint256 value)
    internal
    override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        super._update(from, to, value);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
}
