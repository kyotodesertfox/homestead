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

    uint256[47] private __gap;

    // =========================================================================

    uint96 private constant DEFAULT_ROYALTY_BPS = 500; // 5%

    event Minted(address indexed to, uint256 indexed tokenId, string cid);
    event BatchMinted(address indexed to, uint256 startTokenId, uint256 count);

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

    function mint(address to, string memory cid) external onlyOwner returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        _tokenCIDs[tokenId] = cid;
        _safeMint(to, tokenId);
        emit Minted(to, tokenId, cid);
    }

    function mintBatch(address to, string[] calldata cids) external onlyOwner returns (uint256 startTokenId) {
        startTokenId = nextTokenId;
        for (uint256 i = 0; i < cids.length; i++) {
            uint256 tokenId = nextTokenId++;
            _tokenCIDs[tokenId] = cids[i];
            _safeMint(to, tokenId);
        }
        emit BatchMinted(to, startTokenId, cids.length);
    }

    // =========================================================================
    // REDEMPTION — burn on redeem
    // Callable by the token holder or an approved operator (e.g. Marketplace).
    // =========================================================================

    function redeem(uint256 tokenId) external {
        require(
            _isAuthorized(ownerOf(tokenId), msg.sender, tokenId),
            'nftTemplate: NOT_AUTHORIZED'
        );
        _burn(tokenId);
    }

    // =========================================================================
    // METADATA
    // =========================================================================

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
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
