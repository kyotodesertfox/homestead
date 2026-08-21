import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Lock, Send, Key, ChevronDown, Inbox, Shield, Maximize2, Minimize2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAccount, useWriteContract, useReadContract, useSignMessage, usePublicClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { keccak256, parseAbiItem, formatUnits } from 'viem';
import { x25519 } from '@noble/curves/ed25519.js';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils';
import { ADDRESSES, RELAY_ABI, ERC20_ABI, TREASURY_ABI } from '../contracts.js';

const keySignMsg         = (address) => `HomesteadChat Key:${address}`;
const ZERO_KEY           = '0x0000000000000000000000000000000000000000000000000000000000000000';
const RELAY_DEPLOY_BLOCK = 7605607n;
const LOG_CHUNK          = 9000n;
const MSG_EVENT          = parseAbiItem('event MessageSent(address indexed from, address indexed to, bytes encryptedPayload, bool quantumReady, uint256 timestamp)');

async function getLogsChunked(publicClient, params, latestBlock) {
  const results = [];
  let from = params.fromBlock;
  while (from <= latestBlock) {
    const to = from + LOG_CHUNK - 1n > latestBlock ? latestBlock : from + LOG_CHUNK - 1n;
    const chunk = await publicClient.getLogs({ ...params, fromBlock: from, toBlock: to });
    results.push(...chunk);
    from = to + 1n;
  }
  return results;
}

function hexToBytes(hex) {
  return Uint8Array.from(Buffer.from(hex.replace('0x', ''), 'hex'));
}
function bytesToHex(bytes) {
  return '0x' + Buffer.from(bytes).toString('hex');
}

function deriveKeyPairs(masterSeed) {
  const x25519Priv = masterSeed;
  const x25519Pub  = x25519.getPublicKey(x25519Priv);
  const kyberSeed  = hkdf(sha256, masterSeed, new Uint8Array(0), utf8ToBytes('HomesteadChat Kyber'), 64);
  const { publicKey: kyberPub, secretKey: kyberSec } = ml_kem768.keygen(kyberSeed);
  return { x25519Priv, x25519Pub, kyberSec, kyberPub };
}

async function buildEncryptedPayload(myKeys, text, theirX25519Hex, theirKyberHex) {
  const theirX25519Pub = hexToBytes(theirX25519Hex);
  const theirKyberPub  = hexToBytes(theirKyberHex);
  const x25519SS = x25519.getSharedSecret(myKeys.x25519Priv, theirX25519Pub);
  const { cipherText: kyberCT, sharedSecret: kyberSS } = ml_kem768.encapsulate(theirKyberPub);
  const aesKeyBytes = hkdf(sha256, concatBytes(x25519SS, kyberSS), new Uint8Array(0), utf8ToBytes('HomesteadChat AES'), 32);
  const iv     = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await crypto.subtle.importKey('raw', aesKeyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const ct     = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, new TextEncoder().encode(text)));
  // payload: senderX25519Pub(32) | kyberCT(1088) | iv(12) | ciphertext
  return bytesToHex(concatBytes(myKeys.x25519Pub, kyberCT, iv, ct));
}

async function decryptMessages(messages, myKeys) {
  return Promise.all(messages.map(async (msg) => {
    if (!msg.secured) {
      try { return { ...msg, text: new TextDecoder().decode(hexToBytes(msg.payload)) }; }
      catch { return { ...msg, text: '[unreadable]' }; }
    }
    // isMine: KEM CT was encapsulated to recipient -sender cannot re-derive
    if (msg.isMine) return { ...msg, text: '[Encrypted message]' };
    if (!myKeys)    return { ...msg, text: '[Encrypted]' };
    try {
      const bytes           = hexToBytes(msg.payload);
      const senderX25519Pub = bytes.slice(0, 32);
      const kyberCT         = bytes.slice(32, 1120);
      const iv              = bytes.slice(1120, 1132);
      const ciphertext      = bytes.slice(1132);
      const x25519SS    = x25519.getSharedSecret(myKeys.x25519Priv, senderX25519Pub);
      const kyberSS     = ml_kem768.decapsulate(kyberCT, myKeys.kyberSec);
      const aesKeyBytes = hkdf(sha256, concatBytes(x25519SS, kyberSS), new Uint8Array(0), utf8ToBytes('HomesteadChat AES'), 32);
      const aesKey = await crypto.subtle.importKey('raw', aesKeyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
      const plain  = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext));
      return { ...msg, text: new TextDecoder().decode(plain) };
    } catch {
      return { ...msg, text: '[Decryption failed]' };
    }
  }));
}

function relativeTime(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function HomesteadChat() {
  const [open, setOpen]             = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [tab, setTab]               = useState('inbox');

  const [inboxSenders, setInboxSenders] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [inboxError, setInboxError]     = useState('');

  const [conversation, setConversation]   = useState(null);
  const [convMessages, setConvMessages]   = useState([]);
  const [convDecrypted, setConvDecrypted] = useState([]);
  const [loadingConv, setLoadingConv]     = useState(false);
  const [convInput, setConvInput]         = useState('');
  const [convError, setConvError]         = useState('');

  const [recipient, setRecipient]               = useState('');
  const [composeInput, setComposeInput]         = useState('');
  const [composeError, setComposeError]         = useState('');
  const [composeMessages, setComposeMessages]   = useState([]);
  const [composeDecrypted, setComposeDecrypted] = useState([]);

  const [supportInput, setSupportInput] = useState('');
  const [supportError, setSupportError] = useState('');

  const [derivedKeys, setDerivedKeys]     = useState(null);
  const [keyMismatch, setKeyMismatch]     = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [registerError, setRegisterError] = useState('');
  const [payWithEth, setPayWithEth]       = useState(false);
  const bottomRef = useRef(null);

  const { isConnected, address } = useAccount();
  const { open: openWallet }     = useAppKit();
  const publicClient             = usePublicClient();

  const { data: myX25519Key,  refetch: refetchMyKey }      = useReadContract({ address: ADDRESSES.RELAY, abi: RELAY_ABI, functionName: 'x25519Key', args: [address], query: { enabled: !!address } });
  const { data: myKyberKey,   refetch: refetchMyKyberKey } = useReadContract({ address: ADDRESSES.RELAY, abi: RELAY_ABI, functionName: 'kyberKey',  args: [address], query: { enabled: !!address } });
  const { data: convPartnerX25519 } = useReadContract({ address: ADDRESSES.RELAY, abi: RELAY_ABI, functionName: 'x25519Key', args: [conversation], query: { enabled: !!conversation } });
  const { data: convPartnerKyber  } = useReadContract({ address: ADDRESSES.RELAY, abi: RELAY_ABI, functionName: 'kyberKey',  args: [conversation], query: { enabled: !!conversation } });

  const recipientValid = !!recipient && recipient.startsWith('0x') && recipient.length === 42;
  const { data: composePartnerX25519 } = useReadContract({ address: ADDRESSES.RELAY, abi: RELAY_ABI, functionName: 'x25519Key', args: [recipient], query: { enabled: recipientValid } });
  const { data: composePartnerKyber  } = useReadContract({ address: ADDRESSES.RELAY, abi: RELAY_ABI, functionName: 'kyberKey',  args: [recipient], query: { enabled: recipientValid } });

  const { data: quantumFee }    = useReadContract({ address: ADDRESSES.RELAY,    abi: RELAY_ABI,    functionName: 'quantumFee' });
  const { data: ethFee }        = useReadContract({ address: ADDRESSES.RELAY,    abi: RELAY_ABI,    functionName: 'ethFee' });
  const { data: quantumSymbol } = useReadContract({ address: ADDRESSES.QUANTUM,  abi: ERC20_ABI,    functionName: 'symbol', query: { enabled: !!ADDRESSES.QUANTUM } });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.QUANTUM, abi: ERC20_ABI, functionName: 'allowance',
    args: address ? [address, ADDRESSES.RELAY] : undefined,
    query: { enabled: !!address && !!ADDRESSES.QUANTUM },
  });
  const { data: supportAddress }      = useReadContract({ address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'owner' });
  const { data: supportX25519 }       = useReadContract({ address: ADDRESSES.RELAY,    abi: RELAY_ABI,    functionName: 'x25519Key', args: [supportAddress], query: { enabled: !!supportAddress } });
  const { data: supportKyber }        = useReadContract({ address: ADDRESSES.RELAY,    abi: RELAY_ABI,    functionName: 'kyberKey',  args: [supportAddress], query: { enabled: !!supportAddress } });
  const { data: supportFreeRecipient } = useReadContract({ address: ADDRESSES.RELAY,   abi: RELAY_ABI,    functionName: 'quantumFreeRecipient', args: [supportAddress], query: { enabled: !!supportAddress } });

  const hasKyber        = (k) => k && k !== '0x' && k.length > 2;
  const hasX25519       = myX25519Key && myX25519Key !== ZERO_KEY;
  const myKeyRegistered = hasX25519 && hasKyber(myKyberKey);
  const needsUpgrade    = hasX25519 && !hasKyber(myKyberKey);
  const convSecure      = myKeyRegistered && convPartnerX25519    && convPartnerX25519    !== ZERO_KEY && hasKyber(convPartnerKyber);
  const composeSecure   = myKeyRegistered && composePartnerX25519 && composePartnerX25519 !== ZERO_KEY && hasKyber(composePartnerKyber);
  const supportSecure   = myKeyRegistered && supportX25519        && supportX25519        !== ZERO_KEY && hasKyber(supportKyber);

  const feeLabel    = quantumSymbol ? `$${quantumSymbol}` : '$QUANTUM';
  const feeAmount   = quantumFee !== undefined ? formatUnits(quantumFee, 18) : '1';
  const ethFeeSet   = ethFee !== undefined && ethFee > 0n;
  const ethFeeLabel = ethFeeSet ? `${formatUnits(ethFee, 18)} ETH` : null;

  const { signMessage, isPending: isSigning } = useSignMessage();
  const { writeContractAsync } = useWriteContract();

  // ── Key integrity check ──────────────────────────────────────────
  useEffect(() => {
    if (!derivedKeys || !myX25519Key || myX25519Key === ZERO_KEY) { setKeyMismatch(false); return; }
    const expectedX25519 = bytesToHex(derivedKeys.x25519Pub);
    const expectedKyber  = bytesToHex(derivedKeys.kyberPub);
    setKeyMismatch(
      myX25519Key.toLowerCase() !== expectedX25519.toLowerCase() ||
      (hasKyber(myKyberKey) && myKyberKey.toLowerCase() !== expectedKyber.toLowerCase())
    );
  }, [derivedKeys, myX25519Key, myKyberKey]);

  // ── Key derivation ───────────────────────────────────────────────
  const deriveKeys = (onDone) => {
    signMessage({ message: keySignMsg(address) }, {
      onSuccess: (sig) => {
        const keys = deriveKeyPairs(hexToBytes(keccak256(sig)));
        setDerivedKeys(keys);
        onDone?.(keys);
      },
    });
  };

  const handleRegisterKey = () => {
    setRegisterError('');
    deriveKeys((keys) => {
      setPendingAction('register');
      writeContractAsync({
        address: ADDRESSES.RELAY, abi: RELAY_ABI, functionName: 'registerKey',
        args: [bytesToHex(keys.x25519Pub), bytesToHex(keys.kyberPub)],
      })
        .then((hash) => publicClient.waitForTransactionReceipt({ hash }))
        .then(() => { refetchMyKey(); refetchMyKyberKey(); setPendingAction(null); })
        .catch((e) => { setRegisterError(e?.shortMessage || e?.message || 'Transaction failed'); setPendingAction(null); });
    });
  };

  // ── Decrypt effects ──────────────────────────────────────────────
  useEffect(() => { decryptMessages(convMessages,    derivedKeys).then(setConvDecrypted);    }, [convMessages,    derivedKeys]);
  useEffect(() => { decryptMessages(composeMessages, derivedKeys).then(setComposeDecrypted); }, [composeMessages, derivedKeys]);

  // ── Fetch helpers ────────────────────────────────────────────────
  const fetchInbox = async () => {
    if (!publicClient || !address) return;
    setLoadingInbox(true); setInboxError('');
    try {
      const latest = await publicClient.getBlockNumber();
      const logs = await getLogsChunked(publicClient, {
        address: ADDRESSES.RELAY, event: MSG_EVENT, args: { to: address }, fromBlock: RELAY_DEPLOY_BLOCK,
      }, latest);
      const map = {};
      logs.forEach(log => {
        const from = log.args.from, key = from.toLowerCase(), ts = Number(log.args.timestamp);
        if (!map[key] || ts > map[key].ts)
          map[key] = { from, payload: log.args.encryptedPayload, secured: log.args.quantumReady, ts };
      });
      setInboxSenders(Object.values(map).sort((a, b) => b.ts - a.ts));
    } catch (e) { setInboxError('Failed to load inbox: ' + (e.shortMessage ?? e.message)); }
    setLoadingInbox(false);
  };

  const fetchConversation = async (addr) => {
    if (!publicClient || !address || !addr) return;
    setLoadingConv(true); setConvError('');
    try {
      const latest = await publicClient.getBlockNumber();
      const [sent, received] = await Promise.all([
        getLogsChunked(publicClient, { address: ADDRESSES.RELAY, event: MSG_EVENT, args: { from: address, to: addr }, fromBlock: RELAY_DEPLOY_BLOCK }, latest),
        getLogsChunked(publicClient, { address: ADDRESSES.RELAY, event: MSG_EVENT, args: { from: addr, to: address }, fromBlock: RELAY_DEPLOY_BLOCK }, latest),
      ]);
      setConvMessages([...sent, ...received]
        .sort((a, b) => Number(a.args.timestamp) - Number(b.args.timestamp))
        .map(log => ({ payload: log.args.encryptedPayload, secured: log.args.quantumReady, isMine: log.args.from.toLowerCase() === address.toLowerCase(), ts: Number(log.args.timestamp) }))
      );
    } catch (e) { setConvError('Failed to load: ' + (e.shortMessage ?? e.message)); }
    setLoadingConv(false);
  };

  const fetchComposeThread = async () => {
    if (!publicClient || !address || !recipient || recipient.length !== 42) return;
    try {
      const latest = await publicClient.getBlockNumber();
      const [sent, received] = await Promise.all([
        getLogsChunked(publicClient, { address: ADDRESSES.RELAY, event: MSG_EVENT, args: { from: address, to: recipient }, fromBlock: RELAY_DEPLOY_BLOCK }, latest),
        getLogsChunked(publicClient, { address: ADDRESSES.RELAY, event: MSG_EVENT, args: { from: recipient, to: address }, fromBlock: RELAY_DEPLOY_BLOCK }, latest),
      ]);
      setComposeMessages([...sent, ...received]
        .sort((a, b) => Number(a.args.timestamp) - Number(b.args.timestamp))
        .map(log => ({ payload: log.args.encryptedPayload, secured: log.args.quantumReady, isMine: log.args.from.toLowerCase() === address.toLowerCase(), ts: Number(log.args.timestamp) }))
      );
    } catch {}
  };

  useEffect(() => { if (tab === 'inbox') fetchInbox(); }, [address, tab]);
  useEffect(() => { if (conversation) fetchConversation(conversation); }, [conversation, address]);
  useEffect(() => { if (tab === 'compose' && recipient?.length === 42) fetchComposeThread(); }, [tab, recipient, address]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [convDecrypted, composeDecrypted]);

  // ── Send helpers ─────────────────────────────────────────────────
  const ensureApproval = async (fee) => {
    if (!fee || fee === 0n) return;
    if ((allowance ?? 0n) < fee) {
      await writeContractAsync({ address: ADDRESSES.QUANTUM, abi: ERC20_ABI, functionName: 'approve', args: [ADDRESSES.RELAY, fee] });
      await refetchAllowance();
    }
  };

  const doSend = async ({ to, text, secure, theirX25519Hex, theirKyberHex, free, setError, onSuccess }) => {
    setError('');
    try {
      let hexPayload, quantum = false;
      let txValue = undefined;
      if (secure && theirX25519Hex && theirX25519Hex !== ZERO_KEY && theirKyberHex) {
        if (!free) {
          if (payWithEth && ethFeeSet) {
            txValue = ethFee;
          } else {
            await ensureApproval(quantumFee ?? 0n);
          }
        }
        const keys = derivedKeys ?? await new Promise(res => deriveKeys(res));
        hexPayload = await buildEncryptedPayload(keys, text, theirX25519Hex, theirKyberHex);
        quantum = true;
      } else {
        hexPayload = bytesToHex(new TextEncoder().encode(text));
      }
      await writeContractAsync({
        address: ADDRESSES.RELAY, abi: RELAY_ABI, functionName: 'sendMessage',
        args: [to, hexPayload, quantum],
        ...(txValue !== undefined ? { value: txValue } : {}),
      });
      onSuccess?.();
    } catch (e) {
      setError(e.shortMessage ?? e.message ?? 'Transaction failed');
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
      {open && (
        <>
          {fullscreen && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setFullscreen(false)} />}
          <div className={`fixed bg-white shadow-2xl z-50 flex flex-col overflow-hidden transition-all duration-200 ${
            fullscreen
              ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 rounded-2xl border border-gray-200'
              : 'inset-0 sm:inset-auto sm:bottom-20 sm:right-24 sm:w-96 sm:max-h-[72vh] sm:rounded-2xl sm:border sm:border-gray-200'
          }`}>

            {/* Header */}
            <div className="bg-hub-dark px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-hub-light" />
                <span className="text-white font-black uppercase tracking-widest text-xs">Homestead Chat</span>
                {keyMismatch && <AlertTriangle size={12} className="text-yellow-400" title="Key mismatch -go to Keys tab" />}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setFullscreen(f => !f)} className="text-gray-400 hover:text-white transition-colors hidden sm:block">
                  {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {!isConnected ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-hub-surface border-2 border-hub-green flex items-center justify-center">
                  <Lock size={22} className="text-hub-green" />
                </div>
                <div>
                  <p className="text-gray-900 font-black uppercase tracking-tight mb-1">Wallet Required</p>
                  <p className="text-gray-500 text-xs leading-relaxed">Connect your wallet to access end-to-end encrypted messaging.</p>
                </div>
                <button onClick={() => openWallet()} className="bg-hub-green hover:bg-green-700 text-white font-black py-2 px-6 rounded uppercase tracking-widest text-xs transition-all">
                  Connect Wallet
                </button>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex border-b border-gray-100 shrink-0 items-center">
                  {[
                    { id: 'inbox',   icon: <Inbox size={12} />,        label: 'Inbox'   },
                    { id: 'compose', icon: <Send size={12} />,          label: 'Compose' },
                    { id: 'support', icon: <MessageSquare size={12} />, label: 'Support' },
                  ].map(({ id, icon, label }) => (
                    <button key={id} onClick={() => setTab(id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                        tab === id ? 'text-hub-green border-b-2 border-hub-green' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {icon}{label}
                    </button>
                  ))}
                  <button onClick={() => setTab('keys')}
                    className={`flex items-center gap-1 px-2.5 py-2.5 text-xs font-black uppercase tracking-widest transition-colors shrink-0 ${tab === 'keys' ? 'text-red-500 border-b-2 border-red-500' : 'text-red-400 hover:text-red-600'}`}>
                    <Key size={14} strokeWidth={2.5} />{keyMismatch ? '⚠ Keys' : 'Keys'}
                  </button>
                </div>

                {/* ── Inbox ── */}
                {tab === 'inbox' && (
                  <div className="flex-1 overflow-y-auto">
                    {(!myKeyRegistered || needsUpgrade) && (
                      <div className="m-3 bg-hub-surface border border-hub-green/30 rounded-xl p-3 flex items-start gap-3">
                        <Key size={15} className="text-hub-green mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight text-gray-900 mb-0.5">
                            {needsUpgrade ? 'Upgrade to Quantum Encryption' : 'Register Your Key'}
                          </p>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {needsUpgrade
                              ? 'Your key is registered but missing the ML-KEM-768 Kyber key. Re-register to enable post-quantum encryption.'
                              : 'One signature enables encrypted messaging.'}
                          </p>
                          <button onClick={handleRegisterKey} disabled={isSigning || pendingAction === 'register'}
                            className="mt-2 text-xs font-black text-hub-green uppercase tracking-widest hover:text-green-700 disabled:opacity-40">
                            {isSigning ? 'Sign in wallet...' : pendingAction === 'register' ? 'Confirming...' : needsUpgrade ? 'Upgrade →' : 'Register →'}
                          </button>
                          {registerError && <p className="mt-1 text-xs text-red-600 font-medium">{registerError}</p>}
                        </div>
                      </div>
                    )}
                    {inboxError && <p className="mx-3 text-xs text-red-500 font-medium">{inboxError}</p>}
                    {loadingInbox && <p className="text-xs text-gray-400 text-center pt-8">Loading...</p>}
                    {!loadingInbox && !inboxError && inboxSenders.length === 0 && (
                      <p className="text-xs text-gray-400 text-center pt-8">No messages yet.</p>
                    )}
                    <div className="p-3 space-y-2">
                      {inboxSenders.map((sender) => {
                        const isMe = sender.from.toLowerCase() === address?.toLowerCase();
                        const preview = sender.secured ? '[Encrypted]' : (() => { try { return new TextDecoder().decode(hexToBytes(sender.payload)); } catch { return '[unreadable]'; } })();
                        return (
                          <button key={sender.from}
                            onClick={() => { setConversation(sender.from); setConvMessages([]); }}
                            className="w-full text-left bg-white border border-gray-100 hover:border-hub-green/40 hover:shadow-sm rounded-xl p-3 transition-all"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black font-mono text-gray-900">
                                {isMe ? 'You (self)' : `${sender.from.slice(0, 6)}...${sender.from.slice(-4)}`}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {sender.secured && <Shield size={10} className="text-hub-green" />}
                                <span className="text-[10px] text-gray-400">{relativeTime(sender.ts)}</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 truncate leading-relaxed">{preview}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Compose ── */}
                {tab === 'compose' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-3 shrink-0 border-b border-gray-100">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">To</label>
                      <input type="text" value={recipient}
                        onChange={(e) => { setRecipient(e.target.value); setComposeMessages([]); }}
                        placeholder="0x..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 focus:outline-none focus:border-hub-green"
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {composeDecrypted.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}>
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 px-1">
                            {msg.isMine ? 'You' : `${recipient.slice(0, 6)}...${recipient.slice(-4)}`}
                          </span>
                          <div className={`max-w-[80%] px-3 py-2 text-xs rounded-xl ${msg.isMine ? 'bg-hub-green text-white' : 'bg-gray-100 text-gray-800'}`}>
                            {msg.text}<span className="ml-1 opacity-60">{msg.secured ? '🔒' : '⚠️'}</span>
                          </div>
                        </div>
                      ))}
                      {composeMessages.length === 0 && recipient.length === 42 && (
                        <p className="text-xs text-gray-400 text-center pt-4">No messages yet.</p>
                      )}
                      <div ref={bottomRef} />
                    </div>
                    <div className="p-3 shrink-0 border-t border-gray-100 flex flex-col gap-2">
                      {composeError && <p className="text-xs text-red-500 font-medium truncate">{composeError}</p>}
                      <div className="flex gap-2">
                        <input type="text" value={composeInput}
                          onChange={(e) => setComposeInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && composeInput.trim() && recipient.length === 42 && doSend({
                            to: recipient, text: composeInput.trim(), secure: composeSecure,
                            theirX25519Hex: composePartnerX25519, theirKyberHex: composePartnerKyber,
                            free: false, setError: setComposeError,
                            onSuccess: () => { setComposeInput(''); fetchComposeThread(); },
                          })}
                          placeholder={composeSecure ? 'Encrypted message...' : 'Message...'}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-hub-green"
                        />
                        <button
                          disabled={!composeInput.trim() || !recipient.trim() || recipient.length !== 42}
                          onClick={() => doSend({
                            to: recipient, text: composeInput.trim(), secure: composeSecure,
                            theirX25519Hex: composePartnerX25519, theirKyberHex: composePartnerKyber,
                            free: false, setError: setComposeError,
                            onSuccess: () => { setComposeInput(''); fetchComposeThread(); },
                          })}
                          className="flex items-center gap-1 bg-hub-green hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-2 px-3 rounded uppercase tracking-widest text-xs transition-all"
                        >
                          <Send size={12} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Shield size={10} className={composeSecure ? 'text-hub-green' : 'text-gray-300'} />
                          <span className="text-[10px] text-gray-400 font-medium">
                            {composeSecure
                              ? `Encrypted · ${payWithEth && ethFeeSet ? ethFeeLabel : `${feeAmount} ${feeLabel}`}`
                              : 'Unencrypted'}
                          </span>
                        </div>
                        {composeSecure && ethFeeSet && (
                          <button onClick={() => setPayWithEth(v => !v)}
                            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-hub-green transition-colors">
                            Pay with {payWithEth ? feeLabel : 'ETH'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Support ── */}
                {tab === 'support' && (
                  <div className="flex-1 flex flex-col p-3 gap-3">
                    <div className="bg-hub-dark rounded-xl p-3 flex items-center gap-2 shrink-0">
                      <Shield size={14} className="text-hub-light shrink-0" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-white">Quantum Encryption</p>
                        <p className="text-xs text-gray-400 leading-relaxed mt-0.5">
                          {supportFreeRecipient ? 'Quantum-encrypted at no extra cost.' : 'Encrypted and sent to the Homestead team.'}
                        </p>
                      </div>
                    </div>
                    {(!myKeyRegistered || needsUpgrade) && (
                      <div className="bg-hub-surface border border-hub-green/30 rounded-xl p-3 shrink-0">
                        <p className="text-xs text-gray-500 mb-2">
                          {needsUpgrade
                            ? 'Your key needs a quantum upgrade before sending encrypted support messages.'
                            : 'Register your key to enable encrypted support messages.'}
                        </p>
                        <button onClick={handleRegisterKey} disabled={isSigning || pendingAction === 'register'}
                          className="text-xs font-black text-hub-green uppercase tracking-widest hover:text-green-700 disabled:opacity-40">
                          {isSigning ? 'Sign in wallet...' : pendingAction === 'register' ? 'Confirming...' : needsUpgrade ? 'Upgrade Key →' : 'Register Key →'}
                        </button>
                      </div>
                    )}
                    <div className="flex-1 flex flex-col">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">Your Message</label>
                      <textarea value={supportInput} onChange={(e) => setSupportInput(e.target.value)}
                        placeholder="Describe what you need help with..."
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 resize-none focus:outline-none focus:border-hub-green min-h-28"
                      />
                    </div>
                    {supportError && <p className="text-xs text-red-500 font-medium truncate">{supportError}</p>}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Lock size={11} className="text-hub-green" />
                        <span className="text-xs text-gray-400 font-medium">
                          {supportSecure ? (supportFreeRecipient ? 'Encrypted · free' : `Encrypted · ${feeAmount} ${feeLabel}`) : 'Unencrypted'}
                        </span>
                      </div>
                      <button
                        disabled={!supportInput.trim() || !supportAddress || !myKeyRegistered}
                        onClick={() => doSend({
                          to: supportAddress, text: supportInput.trim(), secure: supportSecure,
                          theirX25519Hex: supportX25519, theirKyberHex: supportKyber,
                          free: !!supportFreeRecipient, setError: setSupportError,
                          onSuccess: () => setSupportInput(''),
                        })}
                        className="flex items-center gap-1.5 bg-hub-green hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-2 px-4 rounded uppercase tracking-widest text-xs transition-all"
                      >
                        <Send size={12} />Send
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Keys ── */}
                {tab === 'keys' && (
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {keyMismatch && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-yellow-700 mb-1">Key Mismatch Detected</p>
                          <p className="text-xs text-yellow-700 leading-relaxed">
                            The key on-chain does not match what this app derives from your wallet. This happens when the sign message changes between versions, or if you registered from a different app. Rotate your key below to fix it.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="bg-hub-surface border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Key size={14} className="text-hub-green shrink-0" />
                        <p className="text-xs font-black uppercase tracking-widest text-gray-900">Your Encryption Key</p>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Your key pair is derived from a wallet signature -never stored anywhere. Any device can re-derive the same keys by signing the same message with the same wallet. The public half is registered on-chain so others can encrypt messages to you.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${myKeyRegistered ? 'bg-hub-green' : needsUpgrade ? 'bg-yellow-400' : 'bg-gray-300'}`} />
                        <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                          {myKeyRegistered ? 'X25519 + ML-KEM-768 registered' : needsUpgrade ? 'X25519 only -quantum upgrade needed' : 'No key registered'}
                        </p>
                      </div>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-red-500 mb-2">Rotate Key</p>
                      <p className="text-xs text-gray-500 leading-relaxed mb-1">
                        Rotating re-derives your key pair from your wallet and updates your registered public keys on-chain.
                      </p>
                      <p className="text-xs text-gray-500 leading-relaxed mb-3">
                        <span className="font-black text-gray-700">What you lose:</span> messages encrypted to your old public key will become unreadable. New messages sent after rotation will work normally.
                      </p>
                      <button onClick={handleRegisterKey} disabled={isSigning || pendingAction === 'register'}
                        className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-200 text-white font-black py-2.5 px-4 rounded-lg uppercase tracking-widest text-xs transition-all">
                        <Key size={12} strokeWidth={2.5} />
                        {isSigning ? 'Sign in wallet...' : pendingAction === 'register' ? 'Confirming...' : 'Rotate Key'}
                      </button>
                      {registerError && <p className="mt-2 text-xs text-red-600 font-medium">{registerError}</p>}
                    </div>
                  </div>
                )}

                {/* ── Conversation overlay ── */}
                {conversation && (
                  <div className="absolute inset-0 bg-white flex flex-col z-10" style={{ top: 0 }}>
                    <div className="bg-hub-dark px-4 py-3 flex items-center gap-3 shrink-0">
                      <button onClick={() => { setConversation(null); fetchInbox(); }} className="text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={16} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black font-mono text-xs truncate">
                          {conversation.slice(0, 6)}...{conversation.slice(-4)}
                        </p>
                        {convSecure && <p className="text-[10px] text-hub-light uppercase tracking-widest">X25519 + ML-KEM-768</p>}
                      </div>
                      {convSecure && !derivedKeys && (
                        <button onClick={() => deriveKeys()} disabled={isSigning}
                          className="text-xs font-black text-hub-light uppercase tracking-widest hover:text-white disabled:opacity-40">
                          {isSigning ? 'Sign...' : 'Unlock'}
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {loadingConv && <p className="text-xs text-gray-400 text-center pt-8">Loading...</p>}
                      {convError && <p className="text-xs text-red-500 font-medium text-center pt-4">{convError}</p>}
                      {!loadingConv && !convError && convDecrypted.length === 0 && (
                        <p className="text-xs text-gray-400 text-center pt-8">No messages yet.</p>
                      )}
                      {convDecrypted.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}>
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 px-1">
                            {msg.isMine ? 'You' : `${conversation.slice(0, 6)}...${conversation.slice(-4)}`}
                          </span>
                          <div className={`max-w-[80%] px-3 py-2 text-xs rounded-xl ${msg.isMine ? 'bg-hub-green text-white' : 'bg-gray-100 text-gray-800'}`}>
                            {msg.text}<span className="ml-1 opacity-60">{msg.secured ? '🔒' : '⚠️'}</span>
                          </div>
                        </div>
                      ))}
                      <div ref={bottomRef} />
                    </div>
                    <div className="p-3 shrink-0 border-t border-gray-100 flex flex-col gap-2">
                      {convError && <p className="text-xs text-red-500 font-medium truncate">{convError}</p>}
                      <div className="flex gap-2">
                        <input type="text" value={convInput}
                          onChange={(e) => setConvInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && convInput.trim() && doSend({
                            to: conversation, text: convInput.trim(), secure: convSecure,
                            theirX25519Hex: convPartnerX25519, theirKyberHex: convPartnerKyber,
                            free: false, setError: setConvError,
                            onSuccess: () => { setConvInput(''); fetchConversation(conversation); },
                          })}
                          placeholder={convSecure ? 'Encrypted message...' : 'Message...'}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-hub-green"
                        />
                        <button
                          disabled={!convInput.trim()}
                          onClick={() => doSend({
                            to: conversation, text: convInput.trim(), secure: convSecure,
                            theirX25519Hex: convPartnerX25519, theirKyberHex: convPartnerKyber,
                            free: false, setError: setConvError,
                            onSuccess: () => { setConvInput(''); fetchConversation(conversation); },
                          })}
                          className="flex items-center gap-1 bg-hub-green hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-2 px-3 rounded uppercase tracking-widest text-xs transition-all"
                        >
                          <Send size={12} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Shield size={10} className={convSecure ? 'text-hub-green' : 'text-gray-300'} />
                          <span className="text-[10px] text-gray-400 font-medium">
                            {convSecure
                              ? `Encrypted · ${payWithEth && ethFeeSet ? ethFeeLabel : `${feeAmount} ${feeLabel}`}`
                              : 'Unencrypted'}
                          </span>
                        </div>
                        {convSecure && ethFeeSet && (
                          <button onClick={() => setPayWithEth(v => !v)}
                            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-hub-green transition-colors">
                            Pay with {payWithEth ? feeLabel : 'ETH'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-24 w-14 h-14 bg-hub-green hover:bg-green-700 text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-all active:scale-95"
        aria-label="Open Homestead Chat"
      >
        {open ? <ChevronDown size={22} /> : <Lock size={22} />}
      </button>
    </>
  );
}
