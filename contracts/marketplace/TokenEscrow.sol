// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../dex/Interfaces.sol";

contract TokenEscrow is UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public tokenDeployer;
    address public feeCollector;

    uint256 public nextEscrowId;
    mapping(uint256 => Escrow) private _escrows;

    uint256[47] private __gap;

    // =========================================================================

    uint256 public constant VERSION = 1;

    struct Escrow {
        address initiator;      // opens escrow, receives ETH on release
        address counterparty;   // deposits ETH, receives minted tokens on release
        address token;          // any TokenDeployer-registered token (must have this contract as minter)
        uint256 tokenAmount;    // tokens to mint to counterparty on release (base units)
        uint256 ethRequired;    // ETH counterparty must deposit to activate
        uint256 ethDeposited;   // actual ETH deposited
        bool initiatorConfirmed;
        bool counterpartyConfirmed;
        bool released;
        bool cancelled;
    }

    event EscrowCreated(uint256 indexed escrowId, address indexed initiator, address indexed counterparty, address token, uint256 tokenAmount, uint256 ethRequired);
    event Funded(uint256 indexed escrowId, address indexed counterparty, uint256 amount);
    event Confirmed(uint256 indexed escrowId, address indexed confirmedBy);
    event Released(uint256 indexed escrowId, address indexed initiator, uint256 ethAmount, uint256 platformFee);
    event Cancelled(uint256 indexed escrowId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _tokenDeployer,
        address _feeCollector
    ) initializer public {
        __Ownable_init(msg.sender);
        __Pausable_init();
        __ReentrancyGuard_init();

        tokenDeployer = _tokenDeployer;
        feeCollector  = _feeCollector;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // =========================================================================
    // ESCROW LIFECYCLE
    // =========================================================================

    // Owner opens an OTC offer: specifies recipient, token to mint, amount, and ETH price.
    // Token must be registered in TokenDeployer and have this contract set as a minter.
    // No tokens are deposited — they are minted directly to the recipient on release.
    function create(
        address counterparty,
        address token,
        uint256 tokenAmount,
        uint256 ethRequired
    ) external onlyOwner nonReentrant whenNotPaused returns (uint256 escrowId) {
        require(counterparty != address(0),                        'TokenEscrow: ZERO_COUNTERPARTY');
        require(ITokenDeployer(tokenDeployer).isRegistered(token), 'TokenEscrow: UNREGISTERED_TOKEN');
        require(tokenAmount > 0,                                   'TokenEscrow: ZERO_TOKENS');
        require(ethRequired > 0,                                   'TokenEscrow: ZERO_ETH');

        escrowId = nextEscrowId++;

        _escrows[escrowId].initiator    = msg.sender;
        _escrows[escrowId].counterparty = counterparty;
        _escrows[escrowId].token        = token;
        _escrows[escrowId].tokenAmount  = tokenAmount;
        _escrows[escrowId].ethRequired  = ethRequired;

        emit EscrowCreated(escrowId, msg.sender, counterparty, token, tokenAmount, ethRequired);
    }

    // Counterparty deposits ETH to activate the escrow. Must match ethRequired exactly.
    function fund(uint256 escrowId) external payable nonReentrant whenNotPaused {
        Escrow storage e = _escrows[escrowId];
        require(e.initiator != address(0),    'TokenEscrow: NOT_FOUND');
        require(msg.sender == e.counterparty, 'TokenEscrow: NOT_COUNTERPARTY');
        require(e.ethDeposited == 0,          'TokenEscrow: ALREADY_FUNDED');
        require(!e.cancelled,                 'TokenEscrow: CANCELLED');
        require(msg.value == e.ethRequired,   'TokenEscrow: WRONG_ETH_AMOUNT');

        e.ethDeposited = msg.value;

        emit Funded(escrowId, msg.sender, msg.value);
    }

    // Either party confirms. Release fires automatically when both have confirmed.
    function confirm(uint256 escrowId) external nonReentrant whenNotPaused {
        Escrow storage e = _escrows[escrowId];
        require(e.initiator != address(0),                                    'TokenEscrow: NOT_FOUND');
        require(e.ethDeposited > 0,                                           'TokenEscrow: NOT_FUNDED');
        require(!e.released,                                                  'TokenEscrow: ALREADY_RELEASED');
        require(!e.cancelled,                                                 'TokenEscrow: CANCELLED');
        require(msg.sender == e.initiator || msg.sender == e.counterparty,   'TokenEscrow: NOT_PARTY');

        if (msg.sender == e.initiator) {
            require(!e.initiatorConfirmed,    'TokenEscrow: ALREADY_CONFIRMED');
            e.initiatorConfirmed = true;
        } else {
            require(!e.counterpartyConfirmed, 'TokenEscrow: ALREADY_CONFIRMED');
            e.counterpartyConfirmed = true;
        }

        emit Confirmed(escrowId, msg.sender);

        if (e.initiatorConfirmed && e.counterpartyConfirmed) {
            _release(escrowId);
        }
    }

    // Internal release — fires on dual confirm.
    // Platform fee (marketplaceFeeBps) deducted from ETH → Treasury.
    // Remainder → initiator. Tokens minted directly to counterparty.
    function _release(uint256 escrowId) internal {
        Escrow storage e = _escrows[escrowId];
        e.released = true;

        uint256 fee          = (e.ethDeposited * ITreasury(feeCollector).marketplaceFeeBps()) / 10000;
        uint256 initiatorEth = e.ethDeposited - fee;

        if (fee > 0) {
            (bool feeOk,) = feeCollector.call{value: fee}("");
            require(feeOk, 'TokenEscrow: FEE_FAILED');
        }

        (bool ethOk,) = e.initiator.call{value: initiatorEth}("");
        require(ethOk, 'TokenEscrow: ETH_TRANSFER_FAILED');

        IProductionToken(e.token).mintExact(e.counterparty, e.tokenAmount);

        emit Released(escrowId, e.initiator, initiatorEth, fee);
    }

    // Cancel an escrow.
    // Before funded: initiator cancels unilaterally — nothing was deposited.
    // After funded: both parties must agree — ETH returned to counterparty.
    function cancel(uint256 escrowId) external nonReentrant {
        Escrow storage e = _escrows[escrowId];
        require(e.initiator != address(0),                                    'TokenEscrow: NOT_FOUND');
        require(!e.released,                                                  'TokenEscrow: ALREADY_RELEASED');
        require(!e.cancelled,                                                 'TokenEscrow: ALREADY_CANCELLED');
        require(msg.sender == e.initiator || msg.sender == e.counterparty,   'TokenEscrow: NOT_PARTY');

        if (e.ethDeposited == 0) {
            require(msg.sender == e.initiator, 'TokenEscrow: ONLY_INITIATOR');
            e.cancelled = true;
            emit Cancelled(escrowId);
            return;
        }

        // After funded: both must agree. Reuse confirm flags for cancel vote.
        if (msg.sender == e.initiator)    e.initiatorConfirmed    = true;
        if (msg.sender == e.counterparty) e.counterpartyConfirmed = true;

        if (e.initiatorConfirmed && e.counterpartyConfirmed) {
            e.cancelled = true;
            (bool ok,) = e.counterparty.call{value: e.ethDeposited}("");
            require(ok, 'TokenEscrow: ETH_RETURN_FAILED');
            emit Cancelled(escrowId);
        }
    }

    // =========================================================================
    // READ
    // =========================================================================

    function getEscrow(uint256 escrowId) external view returns (
        address initiator,
        address counterparty,
        address token,
        uint256 tokenAmount,
        uint256 ethRequired,
        uint256 ethDeposited,
        bool initiatorConfirmed,
        bool counterpartyConfirmed,
        bool released,
        bool cancelled
    ) {
        Escrow storage e = _escrows[escrowId];
        return (
            e.initiator,
            e.counterparty,
            e.token,
            e.tokenAmount,
            e.ethRequired,
            e.ethDeposited,
            e.initiatorConfirmed,
            e.counterpartyConfirmed,
            e.released,
            e.cancelled
        );
    }

    // Returns open escrow IDs for a given counterparty. Paginated: pass fromId=0, limit=50 to start.
    function getOpenEscrowsFor(address counterparty, uint256 fromId, uint256 limit)
        external view returns (uint256[] memory ids)
    {
        uint256 cap = nextEscrowId < fromId + limit ? nextEscrowId : fromId + limit;
        uint256 count = 0;
        for (uint256 i = fromId; i < cap; i++) {
            Escrow storage e = _escrows[i];
            if (e.counterparty == counterparty && !e.released && !e.cancelled) count++;
        }
        ids = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = fromId; i < cap; i++) {
            Escrow storage e = _escrows[i];
            if (e.counterparty == counterparty && !e.released && !e.cancelled) ids[idx++] = i;
        }
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    function setFeeCollector(address _feeCollector) external onlyOwner {
        feeCollector = _feeCollector;
    }

    function setTokenDeployer(address _tokenDeployer) external onlyOwner {
        tokenDeployer = _tokenDeployer;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    receive() external payable {}
}
