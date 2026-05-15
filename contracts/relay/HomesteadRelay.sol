// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITreasury {
    function trustedRelay() external view returns (address);
}

contract HomesteadRelay is Ownable {

    uint8 public constant TIER_NONE     = 0;
    uint8 public constant TIER_HOLDER   = 1;
    uint8 public constant TIER_BREWER   = 2;
    uint8 public constant TIER_VERIFIED = 3;

    address public treasury;
    address public feeToken;
    uint256 public quantumFee;

    // X25519 pubkey stored in state — 32 bytes, one slot, cheap lookup
    mapping(address => bytes32) public x25519Key;

    mapping(address => uint8)  public attestation;
    mapping(address => bool)   public isAttester;
    mapping(address => bool)   public registeredContract;
    mapping(address => bool)   public quantumFreeRecipient;

    struct Group {
        address creator;
        string  name;
        uint8   minTier;
        bool    active;
    }

    uint256 public groupCount;
    mapping(uint256 => Group)                    public groups;
    mapping(uint256 => address[])                public groupMembers;
    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(address => mapping(uint256 => bool)) public redeemed;

    // Kyber-768 pubkey (1184 bytes) emitted once on registration — clients cache per recipient
    event KeyRegistered(address indexed wallet, bytes32 x25519Key, bytes kyberKey);
    event AttestationSet(address indexed wallet, uint8 tier);
    event MessageSent(address indexed from, address indexed to, bytes encryptedPayload, bool quantumReady, uint256 timestamp);
    event GroupCreated(uint256 indexed groupId, address indexed creator, string name, uint8 minTier);
    event GroupJoined(uint256 indexed groupId, address indexed member);
    event GroupMessageSent(uint256 indexed groupId, address indexed from, bytes encryptedPayload, bool quantumReady, uint256 timestamp);
    event RedemptionRecorded(address indexed redeemer, address indexed token, uint256 indexed tokenId, uint256 timestamp);

    modifier onlyTrustedByTreasury() {
        require(ITreasury(treasury).trustedRelay() == address(this), "Relay: not trusted by Treasury");
        _;
    }

    modifier onlyAttester() {
        require(isAttester[msg.sender] || msg.sender == owner(), "Relay: not attester");
        _;
    }

    constructor(address _treasury, address _feeToken, uint256 _quantumFee) Ownable(msg.sender) {
        treasury   = _treasury;
        feeToken   = _feeToken;
        quantumFee = _quantumFee;
    }

    // --- Key Registry ---

    function registerKey(bytes32 _x25519Key, bytes calldata _kyberKey) external {
        x25519Key[msg.sender] = _x25519Key;
        emit KeyRegistered(msg.sender, _x25519Key, _kyberKey);
    }

    // --- Attestation ---

    function setAttestation(address wallet, uint8 tier) external onlyAttester {
        attestation[wallet] = tier;
        emit AttestationSet(wallet, tier);
    }

    function addAttester(address attester) external onlyOwner {
        isAttester[attester] = true;
    }

    function removeAttester(address attester) external onlyOwner {
        isAttester[attester] = false;
    }

    // --- 1:1 Messaging ---

    function sendMessage(address to, bytes calldata encryptedPayload, bool quantumReady) external {
        require(x25519Key[to] != bytes32(0), "Relay: recipient has no key");
        if (quantumReady && quantumFee > 0 && !quantumFreeRecipient[to]) {
            IERC20(feeToken).transferFrom(msg.sender, treasury, quantumFee);
        }
        emit MessageSent(msg.sender, to, encryptedPayload, quantumReady, block.timestamp);
    }

    // --- Group Threads ---

    function createGroup(string calldata name, uint8 minTier) external returns (uint256 groupId) {
        groupId = groupCount++;
        groups[groupId] = Group({ creator: msg.sender, name: name, minTier: minTier, active: true });
        groupMembers[groupId].push(msg.sender);
        isMember[groupId][msg.sender] = true;
        emit GroupCreated(groupId, msg.sender, name, minTier);
    }

    function joinGroup(uint256 groupId) external {
        Group storage g = groups[groupId];
        require(g.active, "Relay: group inactive");
        require(attestation[msg.sender] >= g.minTier, "Relay: insufficient attestation");
        require(x25519Key[msg.sender] != bytes32(0), "Relay: register key first");
        require(!isMember[groupId][msg.sender], "Relay: already member");
        groupMembers[groupId].push(msg.sender);
        isMember[groupId][msg.sender] = true;
        emit GroupJoined(groupId, msg.sender);
    }

    function sendGroupMessage(uint256 groupId, bytes calldata encryptedPayload, bool quantumReady) external {
        require(isMember[groupId][msg.sender], "Relay: not a member");
        require(groups[groupId].active, "Relay: group inactive");
        if (quantumReady && quantumFee > 0) {
            IERC20(feeToken).transferFrom(msg.sender, treasury, quantumFee);
        }
        emit GroupMessageSent(groupId, msg.sender, encryptedPayload, quantumReady, block.timestamp);
    }

    // --- QR Redemption ---

    function recordRedemption(address redeemer, address token, uint256 tokenId)
        external
        onlyTrustedByTreasury
    {
        require(registeredContract[msg.sender], "Relay: caller not registered");
        require(!redeemed[token][tokenId], "Relay: already redeemed");
        redeemed[token][tokenId] = true;
        emit RedemptionRecorded(redeemer, token, tokenId, block.timestamp);
    }

    // --- Contract Registry ---

    function registerContract(address contractAddr) external onlyOwner {
        registeredContract[contractAddr] = true;
    }

    function deregisterContract(address contractAddr) external onlyOwner {
        registeredContract[contractAddr] = false;
    }

    // --- Config ---

    function setTreasury(address _treasury)                        external onlyOwner { treasury                        = _treasury; }
    function setFeeToken(address _feeToken)                        external onlyOwner { feeToken                        = _feeToken; }
    function setQuantumFee(uint256 _fee)                           external onlyOwner { quantumFee                      = _fee;      }
    function setQuantumFreeRecipient(address wallet, bool exempt)  external onlyOwner { quantumFreeRecipient[wallet]    = exempt;    }

    uint256[47] private __gap;
}
