// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract nftTemplate is
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721BurnableUpgradeable,
    ERC721PausableUpgradeable,
    ERC2981Upgradeable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    // =========================================================================
    // STORAGE — DO NOT REORDER OR DELETE EXISTING VARIABLES
    // Add new variables above __gap, reducing gap size accordingly.
    // =========================================================================

    string private _contractCID;
    mapping(uint256 => string) private _tokenCIDs;
    uint256 public nextTokenId;

    mapping(uint256 => bool) public redeemed;
    mapping(uint256 => string) private _redeemedCIDs;
    mapping(address => bool) public redemptionOperator;
    mapping(address => bool) public isMinter;

    uint256[43] private __gap;

    // =========================================================================

    uint256 public  constant VERSION            = 1;
    uint96  private constant DEFAULT_ROYALTY_BPS = 500; // 5%

    event Minted(address indexed to, uint256 indexed tokenId, string cid);
    event BatchMinted(address indexed to, uint256 startTokenId, uint256 count);
    event Redeemed(uint256 indexed tokenId, address indexed holder);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        string memory _initContractCID,
        address _initialOwner
    ) initializer public {
        __ERC721_init(_name, _symbol);
        __ERC721Enumerable_init();
        __ERC721Burnable_init();
        __ERC721Pausable_init();
        __ERC2981_init();
        __Ownable_init(_initialOwner);

        _contractCID = _initContractCID;
        _setDefaultRoyalty(_initialOwner, DEFAULT_ROYALTY_BPS);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // =========================================================================
    // MINTING — owner only, pre-minted inventory model
    // =========================================================================

    function mint(address to, string memory cid) external returns (uint256 tokenId) {
        require(isMinter[msg.sender] || msg.sender == owner(), 'nftTemplate: NOT_AUTHORIZED');
        tokenId = nextTokenId++;
        _tokenCIDs[tokenId] = cid;
        _safeMint(to, tokenId);
        emit Minted(to, tokenId, cid);
    }

    function mintBatch(address to, string[] calldata cids) external returns (uint256 startTokenId) {
        require(isMinter[msg.sender] || msg.sender == owner(), 'nftTemplate: NOT_AUTHORIZED');
        startTokenId = nextTokenId;
        for (uint256 i = 0; i < cids.length; i++) {
            uint256 tokenId = nextTokenId++;
            _tokenCIDs[tokenId] = cids[i];
            _safeMint(to, tokenId);
        }
        emit BatchMinted(to, startTokenId, cids.length);
    }

    function setMinter(address minter, bool approved) external onlyOwner {
        isMinter[minter] = approved;
    }

    function burnToken(address from, uint256 tokenId) external {
        require(isMinter[msg.sender] || msg.sender == owner(), 'nftTemplate: NOT_AUTHORIZED');
        require(ownerOf(tokenId) == from, 'nftTemplate: NOT_OWNER');
        _burn(tokenId);
    }

    // =========================================================================
    // REDEMPTION — sets on-chain flag; NFT is NOT burned (becomes collectible).
    // Callable by: token holder, approved operator, or a trusted redemptionOperator
    // (e.g. Marketplace POS). markRedeemed() is an owner-only bypass for bar staff
    // who scan a physical bottle without requiring the customer's wallet signature.
    // =========================================================================

    function redeem(uint256 tokenId) external {
        require(!redeemed[tokenId], 'nftTemplate: ALREADY_REDEEMED');
        require(
            redemptionOperator[msg.sender] ||
            _isAuthorized(ownerOf(tokenId), msg.sender, tokenId),
            'nftTemplate: NOT_AUTHORIZED'
        );
        redeemed[tokenId] = true;
        emit Redeemed(tokenId, ownerOf(tokenId));
    }

    function markRedeemed(uint256 tokenId) external onlyOwner {
        require(!redeemed[tokenId], 'nftTemplate: ALREADY_REDEEMED');
        _requireOwned(tokenId);
        redeemed[tokenId] = true;
        emit Redeemed(tokenId, ownerOf(tokenId));
    }

    function setRedemptionOperator(address operator, bool approved) external onlyOwner {
        redemptionOperator[operator] = approved;
    }

    function setRedeemedCID(uint256 tokenId, string memory cid) external onlyOwner {
        _requireOwned(tokenId);
        _redeemedCIDs[tokenId] = cid;
    }

    // =========================================================================
    // METADATA
    // =========================================================================

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        if (redeemed[tokenId] && bytes(_redeemedCIDs[tokenId]).length > 0) {
            return string.concat("ipfs://", _redeemedCIDs[tokenId]);
        }
        string memory cid = _tokenCIDs[tokenId];
        require(bytes(cid).length > 0, 'nftTemplate: URI_NOT_SET');
        return string.concat("ipfs://", cid);
    }

    function contractURI() external view returns (string memory) {
        return string.concat("ipfs://", _contractCID);
    }

    function setContractCID(string memory newCID) external onlyOwner {
        _contractCID = newCID;
    }

    function setTokenCID(uint256 tokenId, string memory newCID) external onlyOwner {
        _requireOwned(tokenId);
        _tokenCIDs[tokenId] = newCID;
    }

    // =========================================================================
    // ROYALTIES
    // =========================================================================

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external onlyOwner {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    // =========================================================================
    // EMERGENCY
    // =========================================================================

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // =========================================================================
    // OVERRIDES
    // =========================================================================

    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721PausableUpgradeable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC2981Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
