// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../dex/Interfaces.sol";

contract WorkEscrow is UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public tokenDeployer;
    address public feeCollector;   // Treasury — receives platform fee on release

    uint256 public nextJobId;
    mapping(uint256 => Job) private _jobs;

    uint256[47] private __gap;

    // =========================================================================

    uint256 public constant VERSION = 1;

    struct Job {
        address contractor;            // initializes job, deposits tokens, receives ETH on release
        address client;                // deposits ETH, receives tokens on release
        address token;                 // any TokenDeployer-registered token
        uint256 tokenAmount;           // tokens held in escrow (base units)
        uint256 ethRequired;           // ETH client must deposit to activate
        uint256 ethDeposited;          // actual ETH deposited by client
        bool contractorConfirmed;
        bool clientConfirmed;
        bool released;
        bool cancelled;
    }

    event JobCreated(uint256 indexed jobId, address indexed contractor, address indexed client, address token, uint256 tokenAmount, uint256 ethRequired);
    event ETHDeposited(uint256 indexed jobId, address indexed client, uint256 amount);
    event DeliveryConfirmed(uint256 indexed jobId, address indexed confirmedBy);
    event JobReleased(uint256 indexed jobId, address indexed contractor, uint256 ethAmount, uint256 platformFee);
    event JobCancelled(uint256 indexed jobId);

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
    // JOB LIFECYCLE
    // =========================================================================

    // Contractor opens a job, specifies the client and locks tokens into escrow.
    // Token must be registered in TokenDeployer. Contractor must approve this
    // contract to spend tokenAmount before calling.
    function initJob(
        address client,
        address token,
        uint256 tokenAmount,
        uint256 ethRequired
    ) external nonReentrant whenNotPaused returns (uint256 jobId) {
        require(client != address(0),                                    'WorkEscrow: ZERO_CLIENT');
        require(ITokenDeployer(tokenDeployer).isRegistered(token),       'WorkEscrow: UNREGISTERED_TOKEN');
        require(tokenAmount > 0,                                         'WorkEscrow: ZERO_TOKENS');
        require(ethRequired > 0,                                         'WorkEscrow: ZERO_ETH');

        jobId = nextJobId++;

        _jobs[jobId].contractor          = msg.sender;
        _jobs[jobId].client              = client;
        _jobs[jobId].token               = token;
        _jobs[jobId].tokenAmount         = tokenAmount;
        _jobs[jobId].ethRequired         = ethRequired;

        require(
            IERC20(token).transferFrom(msg.sender, address(this), tokenAmount),
            'WorkEscrow: TOKEN_TRANSFER_FAILED'
        );

        emit JobCreated(jobId, msg.sender, client, token, tokenAmount, ethRequired);
    }

    // Client deposits ETH to activate the job. Must match ethRequired exactly.
    function depositETH(uint256 jobId) external payable nonReentrant whenNotPaused {
        Job storage job = _jobs[jobId];
        require(job.contractor != address(0),  'WorkEscrow: JOB_NOT_FOUND');
        require(msg.sender == job.client,      'WorkEscrow: NOT_CLIENT');
        require(job.ethDeposited == 0,         'WorkEscrow: ALREADY_FUNDED');
        require(!job.cancelled,                'WorkEscrow: CANCELLED');
        require(msg.value == job.ethRequired,  'WorkEscrow: WRONG_ETH_AMOUNT');

        job.ethDeposited = msg.value;

        emit ETHDeposited(jobId, msg.sender, msg.value);
    }

    // Either party confirms delivery. Release fires automatically when both confirm.
    function confirmDelivery(uint256 jobId) external nonReentrant whenNotPaused {
        Job storage job = _jobs[jobId];
        require(job.contractor != address(0),  'WorkEscrow: JOB_NOT_FOUND');
        require(job.ethDeposited > 0,          'WorkEscrow: NOT_FUNDED');
        require(!job.released,                 'WorkEscrow: ALREADY_RELEASED');
        require(!job.cancelled,                'WorkEscrow: CANCELLED');
        require(
            msg.sender == job.contractor || msg.sender == job.client,
            'WorkEscrow: NOT_PARTY'
        );

        if (msg.sender == job.contractor) {
            require(!job.contractorConfirmed, 'WorkEscrow: ALREADY_CONFIRMED');
            job.contractorConfirmed = true;
        } else {
            require(!job.clientConfirmed, 'WorkEscrow: ALREADY_CONFIRMED');
            job.clientConfirmed = true;
        }

        emit DeliveryConfirmed(jobId, msg.sender);

        if (job.contractorConfirmed && job.clientConfirmed) {
            _release(jobId);
        }
    }

    // Internal release — fires on dual confirm.
    // Platform fee (marketplaceFeeBps) deducted from ETH, sent to Treasury.
    // Remainder goes to contractor. Tokens go to client.
    function _release(uint256 jobId) internal {
        Job storage job = _jobs[jobId];
        job.released = true;

        uint256 fee        = (job.ethDeposited * ITreasury(feeCollector).marketplaceFeeBps()) / 10000;
        uint256 contractorEth = job.ethDeposited - fee;

        if (fee > 0) {
            (bool feeOk,) = feeCollector.call{value: fee}("");
            require(feeOk, 'WorkEscrow: FEE_FAILED');
        }

        (bool ethOk,) = job.contractor.call{value: contractorEth}("");
        require(ethOk, 'WorkEscrow: ETH_TRANSFER_FAILED');

        require(
            IERC20(job.token).transfer(job.client, job.tokenAmount),
            'WorkEscrow: TOKEN_TRANSFER_FAILED'
        );

        emit JobReleased(jobId, job.contractor, contractorEth, fee);
    }

    // Cancel a job. Before client funds: contractor can cancel unilaterally.
    // After client funds: both parties must call cancel to agree.
    function cancel(uint256 jobId) external nonReentrant {
        Job storage job = _jobs[jobId];
        require(job.contractor != address(0),  'WorkEscrow: JOB_NOT_FOUND');
        require(!job.released,                 'WorkEscrow: ALREADY_RELEASED');
        require(!job.cancelled,                'WorkEscrow: ALREADY_CANCELLED');
        require(
            msg.sender == job.contractor || msg.sender == job.client,
            'WorkEscrow: NOT_PARTY'
        );

        // Before client funds: contractor cancels freely
        if (job.ethDeposited == 0) {
            require(msg.sender == job.contractor, 'WorkEscrow: ONLY_CONTRACTOR');
            job.cancelled = true;
            require(
                IERC20(job.token).transfer(job.contractor, job.tokenAmount),
                'WorkEscrow: TOKEN_RETURN_FAILED'
            );
            emit JobCancelled(jobId);
            return;
        }

        // After client funds: require both parties to confirm cancel.
        // Re-use confirm flags — if both confirmed delivery already, release would have fired.
        // So here confirmed = "I agree to cancel."
        if (msg.sender == job.contractor) job.contractorConfirmed = true;
        if (msg.sender == job.client)     job.clientConfirmed     = true;

        if (job.contractorConfirmed && job.clientConfirmed) {
            job.cancelled = true;

            require(
                IERC20(job.token).transfer(job.contractor, job.tokenAmount),
                'WorkEscrow: TOKEN_RETURN_FAILED'
            );
            (bool ok,) = job.client.call{value: job.ethDeposited}("");
            require(ok, 'WorkEscrow: ETH_RETURN_FAILED');

            emit JobCancelled(jobId);
        }
    }

    // =========================================================================
    // READ
    // =========================================================================

    function getJob(uint256 jobId) external view returns (
        address contractor,
        address client,
        address token,
        uint256 tokenAmount,
        uint256 ethRequired,
        uint256 ethDeposited,
        bool contractorConfirmed,
        bool clientConfirmed,
        bool released,
        bool cancelled
    ) {
        Job storage job = _jobs[jobId];
        return (
            job.contractor,
            job.client,
            job.token,
            job.tokenAmount,
            job.ethRequired,
            job.ethDeposited,
            job.contractorConfirmed,
            job.clientConfirmed,
            job.released,
            job.cancelled
        );
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
