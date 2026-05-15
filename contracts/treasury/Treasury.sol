// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../dex/Interfaces.sol";

interface IMintableToken {
    function mintToWallet(address to, uint256 amount) external;
    function totalSupply() external view returns (uint256);
}

contract Treasury is UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {

    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    address public tokenDeployer;
    address public nftDeployer;
    address public dexFactory;

    // Each component has its own named fee. Components read their own variable;
    // all are set here so there is one place to govern the entire system.
    uint256 public dexEntryFeeBps;      // DEX Router: ETH → token (default 0, free entry)
    uint256 public dexExitFeeBps;       // DEX Router: token → ETH (default 500 = 5%)
    uint256 public marketplaceFeeBps;   // Marketplace: fee on NFT purchases (default 200 = 2%)

    uint256 public accumulatedFees;

    // ETH price to purchase one production NFT, set per collection by the owner.
    // ETH paid is permanently locked — it is never returned. This is the floor.
    mapping(address => uint256) public nftPrices;

    // ---- STAKE SYSTEM (added in upgrade) ----
    address public beerToken;
    uint256 public stakeRatioBps;       // e.g. 1000 = brewer must stake 10% of beerToEmit
    uint256 public minListingBalance;   // minimum $BEER balance to call postStake
    uint256 public nextBatchId;         // auto-starts at 1 (pre-increment on first use)
    mapping(uint256 => Batch) public batches;
    mapping(address => bool) public isTrustedCaller;

    // ---- LP REWARDS (added in upgrade) ----
    address public weth;
    uint256 public lpRewardFeeBps;      // portion of dexExitFeeBps routed to LP rewards (e.g. 200 = 2%)

    // ETH claimed per batch — offsets claimable so partial claims are safe
    mapping(uint256 => uint256) private _claimedAmount;

    // ---- REPUTATION SYSTEM ----
    // Cumulative ETH staked lifetime per wallet — never decreases, drives attestation tier
    mapping(address => uint256) public cumulativeStake;
    // ETH thresholds per tier: tier → minimum cumulative ETH (in wei)
    mapping(uint8 => uint256) public tierThreshold;

    uint256[31] private __gap;

    // =========================================================================

    struct Batch {
        address brewer;
        address nftContract;
        uint256 stakedAmount;
        uint256 beerToEmit;
        uint256 totalNFTs;
        uint256 redeemedCount;
        uint256 startTokenId;
        bool listed;
        bool slashed;
    }

    event NFTPriceSet(address indexed nftContract, uint256 priceWei);
    event InventoryNFTPurchased(address indexed producer, address indexed nftContract, uint256 indexed tokenId, uint256 ethPaid);
    event LaborMinted(address indexed to, address indexed token, uint256 amount);
    event DexEntryFeeUpdated(uint256 feeBps);
    event DexExitFeeUpdated(uint256 feeBps);
    event MarketplaceFeeUpdated(uint256 feeBps);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event StakePosted(uint256 indexed batchId, address indexed brewer, address indexed nftContract, uint256 stakedAmount, uint256 tokenToEmit, uint256 nftCount);
    event StakeClaimed(uint256 indexed batchId, address indexed brewer, uint256 amount, uint256 redeemedCount);
    event StakeSlashed(uint256 indexed batchId, address indexed brewer, uint256 remaining);
    event TierThresholdSet(uint8 indexed tier, uint256 ethAmount);
    event BatchListed(uint256 indexed batchId, uint256 indexed listingId);
    event TrustedCallerSet(address indexed caller, bool trusted);
    event LPRewardClaimed(address indexed to, address indexed token, uint256 ethIn, uint256 tokenOut);
    event WethSet(address indexed weth);
    event LpRewardFeeBpsUpdated(uint256 feeBps);

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

        tokenDeployer      = _tokenDeployer;
        nftDeployer        = _nftDeployer;
        dexFactory         = _dexFactory;
        dexEntryFeeBps     = _dexEntryFeeBps;
        dexExitFeeBps      = _dexExitFeeBps;
        marketplaceFeeBps  = _marketplaceFeeBps;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // =========================================================================
    // RECEIVE — accepts ETH from Router (platform fees) and direct deposits
    // =========================================================================

    receive() external payable {
        accumulatedFees += msg.value;
    }

    // =========================================================================
    // NFT VENDING — producer pays ETH to acquire a production NFT
    //
    // Owner mints a batch to Treasury via nftTemplate.mintBatch(treasury, cids),
    // then sets a price per collection via setNFTPrice(). Producer calls
    // purchaseInventoryNFT() sending the exact ETH price; Treasury transfers
    // the NFT to them. ETH paid is permanently locked as the ecosystem floor —
    // it is never refunded. The producer then lists the NFT on the Marketplace.
    // =========================================================================

    function setNFTPrice(address nftContract, uint256 priceWei) external onlyOwner {
        require(INFTDeployer(nftDeployer).isRegistered(nftContract), 'Treasury: UNREGISTERED_NFT');
        nftPrices[nftContract] = priceWei;
        emit NFTPriceSet(nftContract, priceWei);
    }

    function purchaseInventoryNFT(
        address nftContract,
        uint256 tokenId
    ) external payable nonReentrant whenNotPaused {
        require(INFTDeployer(nftDeployer).isRegistered(nftContract), 'Treasury: UNREGISTERED_NFT');

        uint256 price = nftPrices[nftContract];
        require(price > 0,          'Treasury: PRICE_NOT_SET');
        require(msg.value >= price, 'Treasury: INSUFFICIENT_PAYMENT');

        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        uint256 excess = msg.value - price;
        if (excess > 0) {
            (bool ok, ) = msg.sender.call{value: excess}("");
            require(ok, 'Treasury: REFUND_FAILED');
        }

        emit InventoryNFTPurchased(msg.sender, nftContract, tokenId, price);
    }

    // =========================================================================
    // LABOR MINTING — owner mints tokens directly to a worker as compensation.
    // This path creates supply without a direct ETH entry, so issuance must be
    // managed proportionally by the owner to avoid diluting the floor ratio.
    // Token contract must have Treasury set as an authorized minter.
    // =========================================================================

    function mintLaborReward(address token, address to, uint256 amount) external onlyOwner {
        require(ITokenDeployer(tokenDeployer).isRegistered(token), 'Treasury: UNREGISTERED_TOKEN');
        IMintableToken(token).mintToWallet(to, amount);
        emit LaborMinted(to, token, amount);
    }

    // =========================================================================
    // FEE GOVERNANCE — each component has its own setter and cap
    // Add a new setter here whenever a new fee-bearing component is deployed.
    // =========================================================================

    function setDexEntryFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, 'Treasury: FEE_TOO_HIGH');
        dexEntryFeeBps = _feeBps;
        emit DexEntryFeeUpdated(_feeBps);
    }

    function setDexExitFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, 'Treasury: FEE_TOO_HIGH');
        dexExitFeeBps = _feeBps;
        emit DexExitFeeUpdated(_feeBps);
    }

    function setMarketplaceFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, 'Treasury: FEE_TOO_HIGH');
        marketplaceFeeBps = _feeBps;
        emit MarketplaceFeeUpdated(_feeBps);
    }

    function withdrawFees(address to, uint256 amount) external onlyOwner nonReentrant {
        require(amount <= accumulatedFees, 'Treasury: INSUFFICIENT_FEES');
        accumulatedFees -= amount;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, 'Treasury: WITHDRAW_FAILED');
        emit FeesWithdrawn(to, amount);
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    function setTokenDeployer(address _tokenDeployer) external onlyOwner {
        tokenDeployer = _tokenDeployer;
    }

    function setNFTDeployer(address _nftDeployer) external onlyOwner {
        nftDeployer = _nftDeployer;
    }

    function setDexFactory(address _dexFactory) external onlyOwner {
        dexFactory = _dexFactory;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // =========================================================================
    // READ
    // =========================================================================

    // ETH permanently locked from NFT purchases (excludes accumulated fees).
    // This is the hard floor — it only ever grows.
    function floorBalance() public view returns (uint256) {
        uint256 bal = address(this).balance;
        return bal > accumulatedFees ? bal - accumulatedFees : 0;
    }

    // How many bps of the token's ETH market cap is covered by the Treasury floor.
    // e.g. 12000 = 120% backed. Requires a live DEX pair; returns 0 if not seeded.
    function floorRatio(address token, address _weth) external view returns (uint256 ratioBps) {
        uint256 supply = IMintableToken(token).totalSupply();
        if (supply == 0) return type(uint256).max;

        address pair = IFactory(dexFactory).getPair(token, _weth);
        if (pair == address(0)) return 0;

        (uint112 r0, uint112 r1) = IPair(pair).getReserves();
        if (r0 == 0 || r1 == 0) return 0;

        address t0 = IPair(pair).token0();
        uint256 spotPrice = (t0 == _weth)
            ? (uint256(r0) * 1e18) / uint256(r1)
            : (uint256(r1) * 1e18) / uint256(r0);

        if (spotPrice == 0) return 0;

        uint256 marketCapEth = (supply * spotPrice) / 1e18;
        ratioBps = (floorBalance() * 10000) / marketCapEth;
    }

    // =========================================================================
    // STAKE — producer stakes ETH; their chosen token is minted to them
    //
    // ETH is permanently locked in Treasury as the ecosystem floor.
    // The minted token is what the producer uses to price and sell their inventory.
    // Cumulative ETH staked drives on-chain reputation / attestation tier.
    // On physical delivery (redeem), ETH unlocks pro-rata and becomes claimable.
    // =========================================================================

    function postStake(
        address token,
        address nftContract,
        string[] calldata cids,
        uint256 tokenToEmit
    ) external payable nonReentrant whenNotPaused returns (uint256 batchId) {
        require(msg.value > 0,   'Treasury: NO_ETH');
        require(cids.length > 0, 'Treasury: NO_CIDS');
        require(tokenToEmit > 0, 'Treasury: ZERO_EMIT');
        require(
            ITokenDeployer(tokenDeployer).isRegistered(token),
            'Treasury: UNREGISTERED_TOKEN'
        );
        require(
            INFTDeployer(nftDeployer).isRegistered(nftContract),
            'Treasury: UNREGISTERED_NFT'
        );

        // Basic IPFS CID sanity check — CIDv0 is exactly 46 chars, CIDv1 is longer
        for (uint256 i = 0; i < cids.length; i++) {
            require(bytes(cids[i]).length >= 46, 'Treasury: INVALID_CID');
        }

        // ETH stays in Treasury as permanent floor; producer's token minted to them
        IMintableToken(token).mintToWallet(msg.sender, tokenToEmit);

        // Mint NFT batch to producer's wallet; Treasury must be set as a minter on nftTemplate
        uint256 startTokenId = INFTTemplate(nftContract).mintBatch(msg.sender, cids);

        // Accumulate lifetime stake — drives attestation tier, never decreases
        cumulativeStake[msg.sender] += msg.value;

        batchId = ++nextBatchId; // pre-increment: first batchId = 1, 0 stays as sentinel
        batches[batchId] = Batch({
            brewer:        msg.sender,
            nftContract:   nftContract,
            stakedAmount:  msg.value,
            beerToEmit:    tokenToEmit,
            totalNFTs:     cids.length,
            redeemedCount: 0,
            startTokenId:  startTokenId,
            listed:        false,
            slashed:       false
        });

        emit StakePosted(batchId, msg.sender, nftContract, msg.value, tokenToEmit, cids.length);
    }

    // =========================================================================
    // TRUSTED CALLER CALLBACKS — Marketplace calls these on listing + redemption
    // =========================================================================

    // Called by Marketplace.createListing when a brewer's listing goes live.
    function markListed(uint256 batchId, uint256 listingId) external {
        require(isTrustedCaller[msg.sender],   'Treasury: NOT_TRUSTED');
        Batch storage batch = batches[batchId];
        require(batch.brewer != address(0),    'Treasury: BATCH_NOT_FOUND');
        require(!batch.listed,                 'Treasury: ALREADY_LISTED');
        batch.listed = true;
        emit BatchListed(batchId, listingId);
    }

    // Called by Marketplace.redeem when a physical bottle is claimed.
    // Marks this redemption in the count — brewer's pro-rata ETH becomes claimable.
    // Brewer pulls their ETH explicitly via claimStake(batchId).
    function onRedeem(uint256 batchId) external {
        require(isTrustedCaller[msg.sender],           'Treasury: NOT_TRUSTED');
        Batch storage batch = batches[batchId];
        require(batch.brewer != address(0),            'Treasury: BATCH_NOT_FOUND');
        require(!batch.slashed,                        'Treasury: ALREADY_SLASHED');
        require(batch.redeemedCount < batch.totalNFTs, 'Treasury: FULLY_REDEEMED');

        batch.redeemedCount++;
    }

    // =========================================================================
    // STAKE CLAIM + ADMIN
    // =========================================================================

    // Brewer pulls their claimable ETH after physical deliveries have been confirmed.
    // Can be called multiple times — each call drains the currently claimable amount.
    function claimStake(uint256 batchId) external nonReentrant {
        Batch storage batch = batches[batchId];
        require(batch.brewer == msg.sender, 'Treasury: NOT_BREWER');
        require(!batch.slashed,             'Treasury: SLASHED');
        require(batch.totalNFTs > 0,        'Treasury: NO_NFTS');

        uint256 earned   = (batch.stakedAmount * batch.redeemedCount) / batch.totalNFTs;
        uint256 claimable = earned - _claimedAmount[batchId];
        require(claimable > 0, 'Treasury: NOTHING_TO_CLAIM');

        _claimedAmount[batchId] += claimable;

        (bool ok, ) = batch.brewer.call{value: claimable}("");
        require(ok, 'Treasury: CLAIM_FAILED');

        emit StakeClaimed(batchId, batch.brewer, claimable, batch.redeemedCount);
    }

    // Forfeit unclaimed ETH from a batch; ETH stays in Treasury floor permanently.
    function slashStake(uint256 batchId) external onlyOwner {
        Batch storage batch = batches[batchId];
        require(batch.brewer != address(0), 'Treasury: BATCH_NOT_FOUND');
        require(!batch.slashed,             'Treasury: ALREADY_SLASHED');

        batch.slashed = true;

        uint256 remaining = batch.stakedAmount - _claimedAmount[batchId];
        emit StakeSlashed(batchId, batch.brewer, remaining);
    }

    function setTrustedCaller(address caller, bool trusted) external onlyOwner {
        isTrustedCaller[caller] = trusted;
        emit TrustedCallerSet(caller, trusted);
    }

    function setBeerToken(address _beerToken) external onlyOwner {
        beerToken = _beerToken;
    }

    function setStakeRatioBps(uint256 bps) external onlyOwner {
        stakeRatioBps = bps;
    }

    function setMinListingBalance(uint256 amount) external onlyOwner {
        minListingBalance = amount;
    }

    // =========================================================================
    // STAKE READ
    // =========================================================================

    // Used by Marketplace.createListing to gate permissionless listings.
    function validateListingCaller(
        uint256 batchId,
        address caller,
        address nftContract
    ) external view returns (bool) {
        Batch storage batch = batches[batchId];
        return (
            batch.brewer      == caller      &&
            batch.nftContract == nftContract &&
            !batch.slashed                   &&
            batch.brewer      != address(0)
        );
    }

    // Frontend: how much ETH a producer can claim right now from a batch.
    function claimableStake(uint256 batchId) external view returns (uint256) {
        Batch storage batch = batches[batchId];
        if (batch.totalNFTs == 0 || batch.slashed) return 0;
        uint256 earned = (batch.stakedAmount * batch.redeemedCount) / batch.totalNFTs;
        return earned > _claimedAmount[batchId] ? earned - _claimedAmount[batchId] : 0;
    }

    // Attestation tier derived from lifetime cumulative ETH staked.
    // Tier 0 = none, 1 = holder, 2 = brewer/producer, 3 = verified.
    // Thresholds set by owner via setTierThreshold(). Returns the highest tier earned.
    function attestationTier(address wallet) external view returns (uint8) {
        uint256 staked = cumulativeStake[wallet];
        if (tierThreshold[3] > 0 && staked >= tierThreshold[3]) return 3;
        if (tierThreshold[2] > 0 && staked >= tierThreshold[2]) return 2;
        if (tierThreshold[1] > 0 && staked >= tierThreshold[1]) return 1;
        return 0;
    }

    function setTierThreshold(uint8 tier, uint256 ethAmount) external onlyOwner {
        require(tier >= 1 && tier <= 3, 'Treasury: INVALID_TIER');
        tierThreshold[tier] = ethAmount;
        emit TierThresholdSet(tier, ethAmount);
    }

    // =========================================================================
    // LP REWARDS — called by DEXPair when an LP holder claims
    // ETH flows permanently into Treasury floor; tokens are minted at spot price.
    // =========================================================================

    function receiveAndMintLPReward(
        address rewardToken,
        address to
    ) external payable nonReentrant {
        require(isTrustedCaller[msg.sender], 'Treasury: NOT_TRUSTED');
        require(msg.value > 0,              'Treasury: NO_ETH');
        require(weth != address(0),         'Treasury: WETH_NOT_SET');
        require(ITokenDeployer(tokenDeployer).isRegistered(rewardToken), 'Treasury: UNREGISTERED_TOKEN');

        address pair = IFactory(dexFactory).getPair(rewardToken, weth);
        require(pair != address(0), 'Treasury: PAIR_NOT_FOUND');

        (uint112 r0, uint112 r1) = IPair(pair).getReserves();
        require(r0 > 0 && r1 > 0, 'Treasury: NO_LIQUIDITY');

        address t0 = IPair(pair).token0();
        // Convert ETH value to token amount using spot price
        uint256 tokenAmount = (t0 == weth)
            ? (msg.value * uint256(r1)) / uint256(r0)   // r0=WETH, r1=token
            : (msg.value * uint256(r0)) / uint256(r1);  // r0=token, r1=WETH

        require(tokenAmount > 0, 'Treasury: ZERO_REWARD');

        // ETH stays in Treasury as permanent floor (not added to accumulatedFees)
        IMintableToken(rewardToken).mintToWallet(to, tokenAmount);
        emit LPRewardClaimed(to, rewardToken, msg.value, tokenAmount);
    }

    function setWeth(address _weth) external onlyOwner {
        weth = _weth;
        emit WethSet(_weth);
    }

    function setLpRewardFeeBps(uint256 bps) external onlyOwner {
        require(bps <= dexExitFeeBps, 'Treasury: EXCEEDS_EXIT_FEE');
        lpRewardFeeBps = bps;
        emit LpRewardFeeBpsUpdated(bps);
    }
}
