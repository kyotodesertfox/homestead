// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../dex/Interfaces.sol";

interface IProductionToken {
    function mintToWallet(address to, uint256 amount) external;
    function totalSupply() external view returns (uint256);
    function burn(uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IStkToken {
    function mintExact(address to, uint256 amount) external;
    function burnFromMinter(address account, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

interface INFTBurnable {
    function burnToken(address from, uint256 tokenId) external;
}

contract Treasury is UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public tokenDeployer;
    address public nftDeployer;
    address public dexFactory;

    uint256 public dexEntryFeeBps;
    uint256 public dexExitFeeBps;
    uint256 public marketplaceFeeBps;

    uint256 public accumulatedFees;

    mapping(address => uint256) public nftPrices;

    // ---- STAKE SYSTEM ----
    address public farmToken;
    uint256 public farmStakeBps;
    uint256 public farmLpBps;
    uint256 public nextBatchId;
    mapping(uint256 => Batch) public batches;
    mapping(address => bool) public isTrustedCaller;

    // ---- LP REWARDS ----
    address public weth;
    uint256 public lpRewardFeeBps;

    mapping(uint256 => uint256) private _claimedAmount;

    // ---- REPUTATION SYSTEM ----
    mapping(address => uint256) public cumulativeStake;
    mapping(uint8 => uint256) public tierThreshold;

    address public trustedRelay;

    // ---- COLLATERAL SYSTEM ----
    address public stkHomestead;
    uint256 public collateralRatioBps;

    // ---- COLLATERAL TRACKING ----
    mapping(address => uint256) public usedCollateral;                      // collateral committed per producer
    mapping(address => mapping(uint256 => uint256)) public tokenBatch;     // nftContract → tokenId → batchId

    uint256[26] private __gap;

    // =========================================================================

    struct Batch {
        address producer;
        address nftContract;
        address token;              // production token for this lot
        uint256 stakedAmount;       // ETH value of lot at spot price when opened
        uint256 collateralLocked;   // usedCollateral contribution (stkHomestead-equivalent)
        uint256 tokenAmount;        // production tokens minted (base units, 1e18 per human unit)
        uint256 collateralReleased; // collateral freed so far (via redemptions + burnLotTokens)
        uint256 tokenPerNFT;        // production tokens held in escrow per NFT (base units)
        uint256 totalNFTs;
        uint256 redeemedCount;
        uint256 returnedCount;      // NFTs returned via graceful exit
        uint256 startTokenId;
        bool listed;
        bool slashed;
    }

    error UnregisteredNFT();
    error UnregisteredToken();
    error FeeTooHigh();
    error InsufficientFees();
    error WithdrawFailed();
    error NoEth();
    error NoCids();
    error InvalidCid();
    error NotTrusted();
    error BatchNotFound();
    error AlreadyListed();
    error AlreadySlashed();
    error FullyRedeemed();
    error NotProducer();
    error Slashed();
    error NoNfts();
    error NothingToClaim();
    error ClaimFailed();
    error InvalidTier();
    error WethNotSet();
    error PairNotFound();
    error NoLiquidity();
    error ZeroReward();
    error ExceedsExitFee();
    error StkNotSet();
    error InsufficientCollateral();
    error AlreadyMinted();
    error TransferFailed();
    error ExceedsRemaining();
    error TokenNotInBatch();
    error ZeroAmount();

    event TokensIssued(address indexed to, address indexed token, uint256 amount);
    event DexEntryFeeUpdated(uint256 feeBps);
    event DexExitFeeUpdated(uint256 feeBps);
    event MarketplaceFeeUpdated(uint256 feeBps);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event StakeDeposited(address indexed producer, uint256 ethAmount);
    event LotOpened(uint256 indexed batchId, address indexed producer, address indexed token, uint256 amount, uint256 collateralLocked);
    event LotNFTsMinted(uint256 indexed batchId, address indexed nftContract, uint256 count, uint256 tokenPerNFT);
    event NFTsReturned(uint256 indexed batchId, address indexed producer, uint256 count, uint256 tokensReleased);
    event LotTokensBurned(uint256 indexed batchId, address indexed producer, uint256 amount, uint256 collateralFreed);
    event StakeClaimed(uint256 indexed batchId, address indexed producer, uint256 amount, uint256 redeemedCount);
    event StakeSlashed(uint256 indexed batchId, address indexed producer, uint256 remaining);
    event TierThresholdSet(uint8 indexed tier, uint256 ethAmount);
    event BatchListed(uint256 indexed batchId, uint256 indexed listingId);
    event TrustedCallerSet(address indexed caller, bool trusted);
    event TrustedRelaySet(address indexed relay);
    event LPRewardClaimed(address indexed to, address indexed token, uint256 ethIn, uint256 tokenOut);
    event WethSet(address indexed weth);
    event LpRewardFeeBpsUpdated(uint256 feeBps);
    event StkHomesteadSet(address indexed stk);
    event CollateralRatioSet(uint256 bps);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _tokenDeployer,
        address _nftDeployer,
        address _dexFactory,
        uint256 _dexEntryFeeBps,
        uint256 _dexExitFeeBps,
        uint256 _marketplaceFeeBps
    ) initializer public {
        __Ownable_init(msg.sender);
        __Pausable_init();
        __ReentrancyGuard_init();

        tokenDeployer     = _tokenDeployer;
        nftDeployer       = _nftDeployer;
        dexFactory        = _dexFactory;
        dexEntryFeeBps    = _dexEntryFeeBps;
        dexExitFeeBps     = _dexExitFeeBps;
        marketplaceFeeBps = _marketplaceFeeBps;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // All user-facing token amounts are in human units (e.g. 50 = 50 tokens).
    // This function is the single conversion point — never multiply by 1e18 anywhere else.
    function _toBase(uint256 humanAmount) internal pure returns (uint256) {
        return humanAmount * 1e18;
    }

    // =========================================================================
    // RECEIVE
    // =========================================================================

    receive() external payable {
        accumulatedFees += msg.value;
    }

    // =========================================================================
    // LABOR MINTING
    // =========================================================================

    function issueTokens(address token, address to, uint256 amount) external onlyOwner {
        if (!ITokenDeployer(tokenDeployer).isRegistered(token)) revert UnregisteredToken();
        IProductionToken(token).mintToWallet(to, amount);
        emit TokensIssued(to, token, amount);
    }

    // =========================================================================
    // FEE GOVERNANCE
    // =========================================================================

    function setDexEntryFee(uint256 _feeBps) external onlyOwner {
        if (_feeBps > 500) revert FeeTooHigh();
        dexEntryFeeBps = _feeBps;
        emit DexEntryFeeUpdated(_feeBps);
    }

    function setDexExitFee(uint256 _feeBps) external onlyOwner {
        if (_feeBps > 1000) revert FeeTooHigh();
        dexExitFeeBps = _feeBps;
        emit DexExitFeeUpdated(_feeBps);
    }

    function setMarketplaceFee(uint256 _feeBps) external onlyOwner {
        if (_feeBps > 1000) revert FeeTooHigh();
        marketplaceFeeBps = _feeBps;
        emit MarketplaceFeeUpdated(_feeBps);
    }

    function withdrawFees(address to, uint256 amount) external onlyOwner nonReentrant {
        if (amount > accumulatedFees) revert InsufficientFees();
        accumulatedFees -= amount;
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert WithdrawFailed();
        emit FeesWithdrawn(to, amount);
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    function setTokenDeployer(address _tokenDeployer) external onlyOwner { tokenDeployer = _tokenDeployer; }
    function setNFTDeployer(address _nftDeployer)     external onlyOwner { nftDeployer   = _nftDeployer; }
    function setDexFactory(address _dexFactory)       external onlyOwner { dexFactory    = _dexFactory; }
    function pause()                                  external onlyOwner { _pause(); }
    function unpause()                                external onlyOwner { _unpause(); }

    // =========================================================================
    // READ
    // =========================================================================

    function floorBalance() public view returns (uint256) {
        uint256 bal = address(this).balance;
        return bal > accumulatedFees ? bal - accumulatedFees : 0;
    }

    function floorRatio(address token, address _weth) external view returns (uint256 ratioBps) {
        uint256 supply = IProductionToken(token).totalSupply();
        if (supply == 0) return type(uint256).max;

        address pair = IFactory(dexFactory).getPair(token, _weth);
        if (pair == address(0)) return 0;

        (uint112 r0, uint112 r1,) = IPair(pair).getReserves();
        if (r0 == 0 || r1 == 0) return 0;

        address t0 = IPair(pair).token0();
        uint256 spotPrice = (t0 == _weth)
            ? (uint256(r0) * 1e18) / uint256(r1)
            : (uint256(r1) * 1e18) / uint256(r0);

        if (spotPrice == 0) return 0;

        uint256 marketCapEth = (supply * spotPrice) / 1e18;
        ratioBps = (floorBalance() * 10000) / marketCapEth;
    }

    function availableCollateral(address producer) external view returns (uint256) {
        if (stkHomestead == address(0)) return 0;
        uint256 balance = IStkToken(stkHomestead).balanceOf(producer);
        uint256 used = usedCollateral[producer];
        return balance > used ? balance - used : 0;
    }

    // =========================================================================
    // POST STAKE — deposit ETH, receive stkHomestead 1:1 in wei
    //
    // ETH is permanently locked as the ecosystem floor.
    // stkHomestead is a perpetual credential — never burned.
    // cumulativeStake drives attestation tiers and never decreases.
    // =========================================================================

    function postStake() external payable nonReentrant whenNotPaused {
        if (msg.value == 0)               revert NoEth();
        if (stkHomestead == address(0))   revert StkNotSet();

        cumulativeStake[msg.sender] += msg.value;
        IStkToken(stkHomestead).mintExact(msg.sender, msg.value);

        emit StakeDeposited(msg.sender, msg.value);
    }

    // =========================================================================
    // OPEN LOT — mint production tokens against collateral
    //
    // stkHomestead is NOT burned. usedCollateral tracks committed capacity.
    // Capacity is freed as NFTs are redeemed or returned.
    // Producer may gift or hold tokens before committing any to NFTs.
    // =========================================================================

    function openLot(
        address token,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (uint256 batchId) {
        if (stkHomestead == address(0))                             revert StkNotSet();
        if (!ITokenDeployer(tokenDeployer).isRegistered(token))     revert UnregisteredToken();
        if (weth == address(0))                                     revert WethNotSet();
        if (amount == 0)                                            revert ZeroAmount();

        address pair = IFactory(dexFactory).getPair(token, weth);
        if (pair == address(0))     revert PairNotFound();

        (uint112 r0, uint112 r1,) = IPair(pair).getReserves();
        if (r0 == 0 || r1 == 0)    revert NoLiquidity();

        address t0 = IPair(pair).token0();
        uint256 ethValueWei = (t0 == weth)
            ? (uint256(amount) * 1e18 * uint256(r0)) / uint256(r1)
            : (uint256(amount) * 1e18 * uint256(r1)) / uint256(r0);

        uint256 collateralRequired = (ethValueWei * collateralRatioBps) / 10000;

        uint256 stkBalance = IStkToken(stkHomestead).balanceOf(msg.sender);
        if (stkBalance < usedCollateral[msg.sender] + collateralRequired) revert InsufficientCollateral();

        usedCollateral[msg.sender] += collateralRequired;

        IProductionToken(token).mintToWallet(msg.sender, amount);

        batchId = ++nextBatchId;
        batches[batchId] = Batch({
            producer:         msg.sender,
            nftContract:      address(0),
            token:            token,
            stakedAmount:     ethValueWei,
            collateralLocked: collateralRequired,
            tokenAmount:      _toBase(amount),
            tokenPerNFT:      0,
            totalNFTs:        0,
            redeemedCount:    0,
            returnedCount:    0,
            startTokenId:     0,
            listed:           false,
            slashed:          false
        });

        emit LotOpened(batchId, msg.sender, token, amount, collateralRequired);
    }

    // =========================================================================
    // MINT LOT NFTs — commit production tokens to escrow, receive NFTs
    //
    // Producer transfers tokenPerNFT * count tokens to Treasury (base units).
    // Tokens held in escrow: burned on redemption, returned on graceful exit.
    // One mintLotNFTs call per lot — open a new lot for additional NFTs.
    // =========================================================================

    function mintLotNFTs(
        uint256 batchId,
        address nftContract,
        string[] calldata cids,
        uint256 tokenPerNFT
    ) external nonReentrant whenNotPaused {
        Batch storage batch = batches[batchId];
        if (batch.producer != msg.sender)                           revert NotProducer();
        if (batch.slashed)                                          revert Slashed();
        if (batch.totalNFTs > 0)                                    revert AlreadyMinted();
        if (cids.length == 0)                                       revert NoCids();
        if (!INFTDeployer(nftDeployer).isRegistered(nftContract))   revert UnregisteredNFT();
        if (tokenPerNFT == 0)                                       revert ZeroAmount();

        for (uint256 i = 0; i < cids.length; i++) {
            if (bytes(cids[i]).length < 46) revert InvalidCid();
        }

        uint256 tokenPerNFTBase = _toBase(tokenPerNFT);
        uint256 totalEscrow    = cids.length * tokenPerNFTBase;

        bool ok = IProductionToken(batch.token).transferFrom(msg.sender, address(this), totalEscrow);
        if (!ok) revert TransferFailed();

        uint256 startId = INFTTemplate(nftContract).mintBatch(msg.sender, cids);

        for (uint256 i = 0; i < cids.length; i++) {
            tokenBatch[nftContract][startId + i] = batchId;
        }

        batch.nftContract  = nftContract;
        batch.tokenPerNFT  = tokenPerNFTBase;
        batch.totalNFTs    = cids.length;
        batch.startTokenId = startId;

        emit LotNFTsMinted(batchId, nftContract, cids.length, tokenPerNFT);
    }

    // =========================================================================
    // RETURN NFTs — graceful exit for unsold inventory
    //
    // Producer returns NFTs from their wallet. Treasury burns them and releases
    // escrowed production tokens back to the producer. Proportional
    // usedCollateral is freed. ETH backing returned units becomes permanent floor.
    // =========================================================================

    function returnNFTs(
        uint256 batchId,
        uint256[] calldata tokenIds
    ) external nonReentrant whenNotPaused {
        Batch storage batch = batches[batchId];
        if (batch.producer != msg.sender) revert NotProducer();
        if (batch.slashed)                revert Slashed();
        if (batch.totalNFTs == 0)         revert NoNfts();

        uint256 count     = tokenIds.length;
        uint256 remaining = batch.totalNFTs - batch.redeemedCount - batch.returnedCount;
        if (count == 0 || count > remaining) revert ExceedsRemaining();

        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = tokenIds[i];
            if (tokenBatch[batch.nftContract][tokenId] != batchId) revert TokenNotInBatch();
            tokenBatch[batch.nftContract][tokenId] = 0;
            INFTBurnable(batch.nftContract).burnToken(msg.sender, tokenId);
        }

        batch.returnedCount += count;

        uint256 tokensToRelease = count * batch.tokenPerNFT;
        bool ok = IProductionToken(batch.token).transfer(msg.sender, tokensToRelease);
        if (!ok) revert TransferFailed();

        emit NFTsReturned(batchId, msg.sender, count, tokensToRelease);
    }

    // =========================================================================
    // TRUSTED CALLER CALLBACKS
    // =========================================================================

    function markListed(uint256 batchId, uint256 listingId) external {
        if (!isTrustedCaller[msg.sender])  revert NotTrusted();
        Batch storage batch = batches[batchId];
        if (batch.producer == address(0))  revert BatchNotFound();
        if (batch.listed)                  revert AlreadyListed();
        batch.listed = true;
        emit BatchListed(batchId, listingId);
    }

    function onRedeem(uint256 batchId) external {
        if (!isTrustedCaller[msg.sender])           revert NotTrusted();
        Batch storage batch = batches[batchId];
        if (batch.producer == address(0))           revert BatchNotFound();
        if (batch.slashed)                          revert AlreadySlashed();

        uint256 active = batch.totalNFTs - batch.returnedCount;
        if (batch.redeemedCount >= active)          revert FullyRedeemed();

        batch.redeemedCount++;

        // Burn escrowed production tokens for this unit — physical delivery confirmed
        if (batch.tokenPerNFT > 0) {
            IProductionToken(batch.token).burn(batch.tokenPerNFT);
        }

        uint256 collateralToRelease = batch.collateralLocked / batch.totalNFTs;
        batch.collateralReleased += collateralToRelease;
        if (usedCollateral[batch.producer] >= collateralToRelease) {
            usedCollateral[batch.producer] -= collateralToRelease;
        }
    }

    // =========================================================================
    // STAKE CLAIM — pro-rata ETH released as NFTs are redeemed
    // =========================================================================

    function claimStake(uint256 batchId) external nonReentrant {
        Batch storage batch = batches[batchId];
        if (batch.producer != msg.sender) revert NotProducer();
        if (batch.slashed)                revert Slashed();
        if (batch.totalNFTs == 0)         revert NoNfts();

        uint256 earned    = (batch.stakedAmount * batch.redeemedCount) / batch.totalNFTs;
        uint256 claimable = earned - _claimedAmount[batchId];
        if (claimable == 0) revert NothingToClaim();

        _claimedAmount[batchId] += claimable;

        // Burn stkHomestead proportional to ETH leaving Treasury — credential consumed as collateral resolves
        if (stkHomestead != address(0)) {
            IStkToken(stkHomestead).burnFromMinter(msg.sender, claimable);
        }

        (bool ok, ) = batch.producer.call{value: claimable}("");
        if (!ok) revert ClaimFailed();

        emit StakeClaimed(batchId, batch.producer, claimable, batch.redeemedCount);
    }

    function slashStake(uint256 batchId) external onlyOwner {
        Batch storage batch = batches[batchId];
        if (batch.producer == address(0)) revert BatchNotFound();
        if (batch.slashed)                revert AlreadySlashed();
        batch.slashed = true;
        uint256 remaining = batch.stakedAmount - _claimedAmount[batchId];
        emit StakeSlashed(batchId, batch.producer, remaining);
    }

    // =========================================================================
    // BURN LOT TOKENS — exit token position and free collateral
    //
    // Producer burns production tokens from their wallet against a specific lot.
    // Collateral (usedCollateral) is freed proportionally to tokens burned.
    // ETH backing that lot stays in Treasury permanently as floor.
    // Use after returnNFTs to fully close a lot and reclaim collateral capacity.
    // =========================================================================

    function burnLotTokens(uint256 batchId, uint256 amount) external nonReentrant whenNotPaused {
        Batch storage batch = batches[batchId];
        if (batch.producer != msg.sender) revert NotProducer();
        if (batch.slashed)                revert Slashed();
        if (amount == 0)                  revert ZeroAmount();
        if (batch.tokenAmount == 0)       revert NoNfts();

        uint256 baseAmount = _toBase(amount);

        uint256 collateralToRelease = (baseAmount * batch.collateralLocked) / batch.tokenAmount;

        uint256 releasable = batch.collateralLocked - batch.collateralReleased;
        if (collateralToRelease > releasable) collateralToRelease = releasable;

        bool ok = IProductionToken(batch.token).transferFrom(msg.sender, address(this), baseAmount);
        if (!ok) revert TransferFailed();

        IProductionToken(batch.token).burn(baseAmount);

        batch.collateralReleased += collateralToRelease;

        if (usedCollateral[msg.sender] >= collateralToRelease) {
            usedCollateral[msg.sender] -= collateralToRelease;
        }

        emit LotTokensBurned(batchId, msg.sender, amount, collateralToRelease);
    }

    // =========================================================================
    // STAKE + COLLATERAL ADMIN
    // =========================================================================

    function setTrustedCaller(address caller, bool trusted) external onlyOwner {
        isTrustedCaller[caller] = trusted;
        emit TrustedCallerSet(caller, trusted);
    }

    function setTrustedRelay(address relay) external onlyOwner {
        trustedRelay = relay;
        emit TrustedRelaySet(relay);
    }

    function setStkHomestead(address stk) external onlyOwner {
        stkHomestead = stk;
        emit StkHomesteadSet(stk);
    }

    function setCollateralRatioBps(uint256 bps) external onlyOwner {
        if (bps < 10000) revert FeeTooHigh();
        collateralRatioBps = bps;
        emit CollateralRatioSet(bps);
    }

    // =========================================================================
    // STAKE READ
    // =========================================================================

    function validateListingCaller(uint256 batchId, address caller, address nftContract) external view returns (bool) {
        Batch storage batch = batches[batchId];
        return (
            batch.producer    == caller      &&
            batch.nftContract == nftContract &&
            !batch.slashed                   &&
            batch.producer    != address(0)
        );
    }

    function claimableStake(uint256 batchId) external view returns (uint256) {
        Batch storage batch = batches[batchId];
        if (batch.totalNFTs == 0 || batch.slashed) return 0;
        uint256 earned = (batch.stakedAmount * batch.redeemedCount) / batch.totalNFTs;
        return earned > _claimedAmount[batchId] ? earned - _claimedAmount[batchId] : 0;
    }

    function attestationTier(address wallet) external view returns (uint8) {
        uint256 staked = cumulativeStake[wallet];
        if (tierThreshold[3] > 0 && staked >= tierThreshold[3]) return 3;
        if (tierThreshold[2] > 0 && staked >= tierThreshold[2]) return 2;
        if (tierThreshold[1] > 0 && staked >= tierThreshold[1]) return 1;
        return 0;
    }

    function setTierThreshold(uint8 tier, uint256 ethAmount) external onlyOwner {
        if (tier < 1 || tier > 3) revert InvalidTier();
        tierThreshold[tier] = ethAmount;
        emit TierThresholdSet(tier, ethAmount);
    }

    // =========================================================================
    // LP REWARDS
    // =========================================================================

    function receiveAndMintLPReward(address rewardToken, address to) external payable nonReentrant {
        if (!isTrustedCaller[msg.sender])                             revert NotTrusted();
        if (msg.value == 0)                                           revert NoEth();
        if (weth == address(0))                                       revert WethNotSet();
        if (!ITokenDeployer(tokenDeployer).isRegistered(rewardToken)) revert UnregisteredToken();

        address pair = IFactory(dexFactory).getPair(rewardToken, weth);
        if (pair == address(0)) revert PairNotFound();

        (uint112 r0, uint112 r1,) = IPair(pair).getReserves();
        if (r0 == 0 || r1 == 0) revert NoLiquidity();

        address t0 = IPair(pair).token0();
        uint256 tokenBaseUnits = (t0 == weth)
            ? (msg.value * uint256(r1)) / uint256(r0)
            : (msg.value * uint256(r0)) / uint256(r1);
        uint256 tokenHuman = tokenBaseUnits / 1e18;

        if (tokenHuman == 0) revert ZeroReward();

        IProductionToken(rewardToken).mintToWallet(to, tokenHuman);
        emit LPRewardClaimed(to, rewardToken, msg.value, tokenHuman);
    }

    function setWeth(address _weth) external onlyOwner {
        weth = _weth;
        emit WethSet(_weth);
    }

    function setLpRewardFeeBps(uint256 bps) external onlyOwner {
        if (bps > dexExitFeeBps) revert ExceedsExitFee();
        lpRewardFeeBps = bps;
        emit LpRewardFeeBpsUpdated(bps);
    }
}
