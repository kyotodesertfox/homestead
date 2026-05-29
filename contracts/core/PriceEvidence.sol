// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMintable {
    function mintToWallet(address wallet, uint256 amount) external;
}

interface IRouter {
    function swapExactETHForTokens(
        uint256        amountOutMin,
        address[] calldata path,
        address        to,
        uint256        deadline
    ) external payable returns (uint256[] memory amounts);

    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external view returns (uint256[] memory amounts);
}

interface IMarketplace {
    function buy(uint256 listingId) external;
    function getListing(uint256 listingId) external view returns (
        address nftContract,
        address paymentToken,
        uint256 price,
        address proceeds,
        uint256 inventoryCount,
        bool    active
    );
    function getInventory(uint256 listingId) external view returns (uint256[] memory);
}

/// @notice Community price-discovery and deal-orchestration contract.
///
/// Flow:
///   1. Anyone with ≥ minEthBalance ETH calls submit() with a photo IPFS hash.
///   2. Owner reviews and calls approve() — mints 1 $EGG to this contract,
///      credits the submitter's address.
///   3. Submitter can either:
///      a. claimEgg()          — withdraw just the 1 $EGG.
///      b. completeTheDeal()   — send ETH; contract swaps for the remaining
///         tokens, buys the 6-egg carton NFT from the Marketplace, forwards
///         the NFT to the submitter. One transaction, they walk away with an
///         egg carton ready to redeem.
///
/// Post-deploy:
///   EGG_TOKEN.setMinter(address(this), true)   — grant mint access
///   setDealConfig(...)                          — wire up Router + Marketplace
contract PriceEvidence is UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {

    // =========================================================================
    // Types
    // =========================================================================

    enum Status { Pending, Approved, Rejected }

    struct Submission {
        address submitter;
        string  ipfsHash;           // Pinata/IPFS CID of the price photo
        uint256 claimedPriceCents;  // e.g. 619 = $6.19
        string  remarks;            // optional: store name, brand, notes
        Status  status;
        bool    dealCompleted;      // true once completeTheDeal() has been called
    }

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    IMintable public eggToken;
    uint256   public rewardAmount;      // whole $EGG tokens minted per approved submission (default 1)
    uint256   public minEthBalance;     // submitter must hold at least this much ETH (wei)

    uint256 public nextId;
    mapping(uint256 => Submission) public submissions;

    uint256 public featuredId;
    uint256 public featuredPriceCents;

    // Deal orchestrator config — set via setDealConfig()
    address public router;
    address public weth;
    address public marketplace;
    address public eggNftContract;
    uint256 public eggCartonListingId;

    // false  = mint remaining $EGG directly (use while pool liquidity is shallow)
    // true   = swap ETH → $EGG through the pool (switch on once depth supports it)
    bool public usePool;

    // 1 $EGG minted to this contract on approval; tracked per submitter in wei
    mapping(address => uint256) public eggCredit;

    uint256[36] private __gap;

    // =========================================================================

    uint256 public constant VERSION = 1;

    // =========================================================================
    // Events
    // =========================================================================

    event Submitted(
        uint256 indexed id,
        address indexed submitter,
        uint256 claimedPriceCents,
        string  ipfsHash
    );
    event Approved(
        uint256 indexed id,
        address indexed submitter,
        uint256 verifiedPriceCents,
        uint256 eggCredited,
        bool    featured
    );
    event Rejected(uint256 indexed id);
    event FeaturedUpdated(uint256 indexed id, uint256 priceCents);
    event EggClaimed(address indexed submitter, uint256 amount);
    event DealCompleted(
        uint256 indexed submissionId,
        address indexed submitter,
        uint256 indexed tokenId,
        uint256 ethSpent
    );

    // =========================================================================
    // Init
    // =========================================================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _eggToken,
        uint256 _rewardAmount,
        uint256 _minEthBalance,
        address _owner
    ) initializer public {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        eggToken      = IMintable(_eggToken);
        rewardAmount  = _rewardAmount;
        minEthBalance = _minEthBalance;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // =========================================================================
    // Public — submit a price photo
    // =========================================================================

    /// Submitter must hold ≥ minEthBalance ETH — proves they've bridged.
    /// Photo is pinned to IPFS/Pinata by the frontend before this call.
    function submit(
        string  calldata ipfsHash,
        uint256          claimedPriceCents,
        string  calldata remarks
    ) external returns (uint256 id) {
        require(msg.sender.balance >= minEthBalance, "PriceEvidence: insufficient ETH balance");
        require(bytes(ipfsHash).length > 0,          "PriceEvidence: no hash");
        require(claimedPriceCents > 0,               "PriceEvidence: invalid price");

        id = nextId++;
        submissions[id] = Submission({
            submitter:         msg.sender,
            ipfsHash:          ipfsHash,
            claimedPriceCents: claimedPriceCents,
            remarks:           remarks,
            status:            Status.Pending,
            dealCompleted:     false
        });

        emit Submitted(id, msg.sender, claimedPriceCents, ipfsHash);
    }

    // =========================================================================
    // Submitter actions — after approval
    // =========================================================================

    /// Take just the 1 $EGG — no carton purchase.
    function claimEgg() external nonReentrant {
        uint256 credit = eggCredit[msg.sender];
        require(credit > 0, "PriceEvidence: no credit");
        eggCredit[msg.sender] = 0;
        require(
            IERC20(address(eggToken)).transfer(msg.sender, credit),
            "PriceEvidence: transfer failed"
        );
        emit EggClaimed(msg.sender, credit);
    }

    /// Full deal orchestration. Two modes controlled by owner via setUsePool():
    ///
    ///   Mint mode (usePool = false, default):
    ///     The remaining $EGG are minted directly — no ETH required, no price impact.
    ///     Use this while pool liquidity is too shallow for clean trades.
    ///
    ///   Pool mode (usePool = true):
    ///     msg.value ETH is swapped for the remaining $EGG through the Router.
    ///     LP providers earn the swap fee. Switch on once pool depth supports it.
    ///
    ///   Either way: contract buys the carton NFT from the Marketplace and
    ///   forwards it to the submitter in the same transaction.
    function completeTheDeal(uint256 submissionId) external payable nonReentrant {
        require(
            marketplace != address(0) && eggNftContract != address(0),
            "PriceEvidence: deal not configured"
        );

        Submission storage s = submissions[submissionId];
        require(s.submitter == msg.sender,   "PriceEvidence: not your submission");
        require(s.status == Status.Approved, "PriceEvidence: not approved");
        require(!s.dealCompleted,            "PriceEvidence: already completed");

        uint256 credit = eggCredit[msg.sender];
        require(credit > 0, "PriceEvidence: no egg credit");

        // Read current listing price and state
        (,, uint256 listingPrice,, uint256 inventoryCount, bool active) =
            IMarketplace(marketplace).getListing(eggCartonListingId);
        require(active && inventoryCount > 0, "PriceEvidence: listing unavailable");
        require(listingPrice > credit,        "PriceEvidence: listing price <= credit");

        // Commit — prevent reuse
        s.dealCompleted       = true;
        eggCredit[msg.sender] = 0;

        uint256 eggsToAcquire = listingPrice - credit;

        if (usePool) {
            // Pool mode: swap msg.value ETH → eggsToAcquire $EGG via Router.
            // Frontend calls getAmountsIn(eggsToAcquire, [WETH, EGG]) to size msg.value.
            require(router != address(0) && weth != address(0), "PriceEvidence: router not set");
            require(msg.value > 0, "PriceEvidence: ETH required in pool mode");
            address[] memory path = new address[](2);
            path[0] = weth;
            path[1] = address(eggToken);
            IRouter(router).swapExactETHForTokens{value: msg.value}(
                eggsToAcquire * 95 / 100, // 5% slippage tolerance on output
                path,
                address(this),
                block.timestamp + 1200
            );
        } else {
            // Mint mode: create the remaining tokens directly — no price impact.
            eggToken.mintToWallet(address(this), eggsToAcquire / 1e18);
        }

        // Approve Marketplace to pull exactly listingPrice $EGG
        IERC20(address(eggToken)).approve(marketplace, listingPrice);

        // Peek at which tokenId will be dequeued — Marketplace pops the last element.
        // Safe: all in one transaction, no interleaving possible.
        uint256[] memory inv = IMarketplace(marketplace).getInventory(eggCartonListingId);
        uint256 tokenId = inv[inv.length - 1];

        // Buy: Marketplace pulls listingPrice $EGG from us, transfers NFT to us.
        IMarketplace(marketplace).buy(eggCartonListingId);

        // Forward NFT to submitter — we are the owner after buy(), so this is valid.
        IERC721(eggNftContract).transferFrom(address(this), msg.sender, tokenId);

        emit DealCompleted(submissionId, msg.sender, tokenId, msg.value);
    }

    // =========================================================================
    // Owner — review queue
    // =========================================================================

    /// Approve a submission. Mints rewardAmount $EGG to this contract and
    /// credits the submitter — they claim it via claimEgg() or completeTheDeal().
    function approve(
        uint256 id,
        uint256 verifiedPriceCents,
        bool    setAsFeatured
    ) external onlyOwner {
        Submission storage s = submissions[id];
        require(s.submitter != address(0), "PriceEvidence: not found");
        require(s.status == Status.Pending, "PriceEvidence: already resolved");
        require(verifiedPriceCents > 0,     "PriceEvidence: invalid price");

        s.status = Status.Approved;

        uint256 credited = 0;
        if (rewardAmount > 0) {
            // Mint to this contract; submitter redeems via claimEgg / completeTheDeal
            eggToken.mintToWallet(address(this), rewardAmount);
            credited = rewardAmount * 1e18;
            eggCredit[s.submitter] += credited;
        }

        if (setAsFeatured) {
            featuredId         = id;
            featuredPriceCents = verifiedPriceCents;
            emit FeaturedUpdated(id, verifiedPriceCents);
        }

        emit Approved(id, s.submitter, verifiedPriceCents, credited, setAsFeatured);
    }

    function reject(uint256 id) external onlyOwner {
        Submission storage s = submissions[id];
        require(s.submitter != address(0), "PriceEvidence: not found");
        require(s.status == Status.Pending, "PriceEvidence: already resolved");
        s.status = Status.Rejected;
        emit Rejected(id);
    }

    /// Promote any approved submission to the featured homepage slot.
    function setFeatured(uint256 id, uint256 verifiedPriceCents) external onlyOwner {
        require(submissions[id].status == Status.Approved, "PriceEvidence: not approved");
        require(verifiedPriceCents > 0, "PriceEvidence: invalid price");
        featuredId         = id;
        featuredPriceCents = verifiedPriceCents;
        emit FeaturedUpdated(id, verifiedPriceCents);
    }

    function setDealConfig(
        address _router,
        address _weth,
        address _marketplace,
        address _eggNftContract,
        uint256 _eggCartonListingId
    ) external onlyOwner {
        router             = _router;
        weth               = _weth;
        marketplace        = _marketplace;
        eggNftContract     = _eggNftContract;
        eggCartonListingId = _eggCartonListingId;
    }

    /// Switch between mint mode (false, default) and pool-swap mode (true).
    /// Only flip to true once pool depth can absorb the trade without significant price impact.
    function setUsePool(bool _usePool) external onlyOwner {
        usePool = _usePool;
    }

    function setRewardAmount(uint256 amount) external onlyOwner {
        rewardAmount = amount;
    }

    function setMinEthBalance(uint256 amount) external onlyOwner {
        minEthBalance = amount;
    }

    function setEggToken(address token) external onlyOwner {
        eggToken = IMintable(token);
    }

    /// Recover any token dust left after deal swaps.
    function withdrawTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).transfer(to, amount);
    }

    function withdrawETH(address to, uint256 amount) external onlyOwner {
        payable(to).transfer(amount);
    }

    // =========================================================================
    // View
    // =========================================================================

    function getFeatured() external view returns (
        address submitter,
        string  memory ipfsHash,
        uint256 priceCents,
        string  memory remarks
    ) {
        Submission storage s = submissions[featuredId];
        return (s.submitter, s.ipfsHash, featuredPriceCents, s.remarks);
    }

    function getSubmission(uint256 id) external view returns (Submission memory) {
        return submissions[id];
    }

    receive() external payable {}
}
