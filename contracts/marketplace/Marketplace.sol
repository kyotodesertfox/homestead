// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol"; // Added for NFT support

contract ArtMarketplace is UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    IERC20 public artToken;
    address public treasury;
    uint256 public rewardMultiplier;
    uint256 public constant FEE_BPS = 200;

    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    // Mapping of listingId to Listing details
    mapping(uint256 => Listing) public listings;
    uint256 public nextListingId;

    mapping(address => mapping(uint256 => bool)) public isNFTListed; // Prevent duplicate listings

    event Listed(uint256 indexed listingId, address indexed seller, address nftContract, uint256 tokenId, uint256 price);
    event Sale(uint256 indexed listingId, address indexed seller, address indexed buyer, uint256 price, uint256 reward);

    /// @custom:oz-upgrader-external-delta
    function initialize(address _artToken, address _treasury, uint256 _initialReward) initializer public {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        artToken = IERC20(_artToken);
        treasury = _treasury;
        rewardMultiplier = _initialReward;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}



    // NEW: List function to store the NFT data on-chain
    function list(address _nftContract, uint256 _tokenId, uint256 _price) external {
        // THE GUARD: This prevents the duplicate listing
        require(!isNFTListed[_nftContract][_tokenId], "NFT is already listed");
        require(_price > 0, "Price must be > 0");
        // Verify ownership before listing
        require(IERC721(_nftContract).ownerOf(_tokenId) == msg.sender, "Not owner");

        listings[nextListingId] = Listing({
            seller: msg.sender,
            nftContract: _nftContract,
            tokenId: _tokenId,
            price: _price,
            active: true
        });

        isNFTListed[_nftContract][_tokenId] = true; // Mark as listed
        emit Listed(nextListingId, msg.sender, _nftContract, _tokenId, _price);
        nextListingId++;
    }

    function cancelListing(uint256 _listingId) external {
        Listing storage listing = listings[_listingId];
        // Law: Only the owner can retract their intent to sell
        require(msg.sender == listing.seller, "Not the seller");
        require(listing.active, "Listing not active");

        listing.active = false;
        isNFTListed[listing.nftContract][listing.tokenId] = false; // Unlock for future listing
    }

    // UPDATED: Buy function now references a listingId
    function buy(uint256 _listingId) external payable nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.active, "Listing not active");
        require(msg.value >= listing.price, "Insufficient payment");

        listing.active = false; // Mark inactive immediately to prevent re-entrancy

        uint256 price = msg.value;
        uint256 fee = (price * FEE_BPS) / 10000;
        uint256 sellerProceeds = price - fee;

        // 1. Fee to Treasury
        (bool successFee, ) = treasury.call{value: fee}("");
        require(successFee, "Treasury transfer failed");

        // 2. Proceeds to Seller
        (bool successSeller, ) = listing.seller.call{value: sellerProceeds}("");
        require(successSeller, "Seller transfer failed");

        // 3. Transfer the NFT from Seller to Buyer
        IERC721(listing.nftContract).safeTransferFrom(listing.seller, msg.sender, listing.tokenId);

        // 4. Reward Buyer with ART
        // rewardMultiplier is used here as the base reward amount
        require(artToken.transferFrom(treasury, msg.sender, rewardMultiplier), "Reward failed");

        isNFTListed[listing.nftContract][listing.tokenId] = false; // Unlock NFT for future listing
        emit Sale(_listingId, listing.seller, msg.sender, price, rewardMultiplier);
    }

    function updateRewardMultiplier(uint256 _newMultiplier) external onlyOwner {
        rewardMultiplier = _newMultiplier;
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        treasury = _newTreasury;
    }
}
