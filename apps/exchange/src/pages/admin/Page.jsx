import React, { useState, useEffect } from 'react';
import { Shield, Upload, FileCode, Settings, ImagePlus, CheckCheck, Copy, ExternalLink, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { formatUnits, parseEther, maxUint256 } from 'viem';
import {
  ADDRESSES, TREASURY_ABI, NFT_ABI, BEER_TOKEN_ABI, ERC20_ABI,
  NFT_DEPLOYER_ABI, TOKEN_DEPLOYER_ABI, FACTORY_ABI, PAIR_ABI,
  VERSION_ABI, EXPECTED_VERSIONS,
} from '../../contracts';

// ── Pinata ────────────────────────────────────────────────────────────────────
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

function toPng(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error('PNG conversion failed'));
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' }));
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = URL.createObjectURL(file);
  });
}

async function pinFile(file) {
  const png  = await toPng(file);
  const form = new FormData();
  form.append('file', png);
  form.append('pinataMetadata', JSON.stringify({ name: png.name }));
  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST', headers: { Authorization: `Bearer ${PINATA_JWT}` }, body: form,
  });
  if (!res.ok) throw new Error(`Image pin failed: ${res.statusText}`);
  return (await res.json()).IpfsHash;
}

async function pinJson(obj, name) {
  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinataContent: obj, pinataMetadata: { name } }),
  });
  if (!res.ok) throw new Error(`JSON pin failed: ${res.statusText}`);
  return (await res.json()).IpfsHash;
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────
function Label({ children }) {
  return <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">{children}</p>;
}
function Input({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-hub-green transition-colors ${className}`}
    />
  );
}
function Btn({ onClick, disabled, children, variant = 'primary', size = 'sm' }) {
  const base = 'font-black uppercase tracking-widest rounded transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-4 py-2 text-xs', md: 'px-6 py-2.5 text-xs' };
  const variants = {
    primary:  'bg-hub-green hover:bg-green-700 text-white',
    danger:   'bg-red-600 hover:bg-red-700 text-white',
    ghost:    'border border-gray-200 hover:border-hub-green text-gray-700 hover:text-hub-green',
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]}`}>{children}</button>;
}
function TxStatus({ hash, isConfirming, isConfirmed, error }) {
  if (error)       return <p className="text-xs text-red-500 mt-1 font-mono">{error.shortMessage ?? error.message}</p>;
  if (isConfirming) return <p className="text-xs text-amber-500 mt-1">Confirming…</p>;
  if (isConfirmed && hash) return (
    <a href={`https://taikoscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-hub-green mt-1 hover:underline">
      Confirmed <ExternalLink size={10} />
    </a>
  );
  return null;
}

// ── Copy address helper ───────────────────────────────────────────────────────
function CopyAddr({ address, full = false }) {
  const [copied, setCopied] = useState(false);
  if (!address) return <span className="text-xs font-mono text-gray-400">…</span>;
  const copy = async (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
      } else {
        const el = document.createElement('input');
        el.value = address;
        el.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  };
  const display = full ? address : `${address.slice(0, 10)}…${address.slice(-8)}`;
  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <span className="font-mono text-xs text-gray-600 truncate">{display}</span>
      <button onClick={copy} className="text-hub-green hover:brightness-75 transition-all shrink-0">
        {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
      </button>
      <a
        href={`https://taikoscan.io/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="text-hub-green hover:brightness-75 transition-all shrink-0"
      >
        <ExternalLink size={13} />
      </a>
    </span>
  );
}

// ── Tooltip hint ─────────────────────────────────────────────────────────────
function Hint({ text }) {
  return (
    <span className="relative group inline-flex shrink-0">
      <span className="w-3.5 h-3.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 text-[9px] font-black flex items-center justify-center cursor-help transition-colors select-none">?</span>
      <span className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 text-white text-xs font-medium rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed shadow-xl normal-case tracking-normal">
        {text}
      </span>
    </span>
  );
}

// ── Known-role status row ─────────────────────────────────────────────────────
function RoleStatusRow({ contract, abi, fn, target, label, refetchKey }) {
  const { data, isLoading, isError, refetch } = useReadContract({
    address: contract, abi, functionName: fn, args: [target],
    query: { enabled: !!contract && !!target },
  });
  useEffect(() => { if (refetchKey) refetch(); }, [refetchKey]);
  const loading = isLoading || (data === undefined && !isError);
  const isSet   = Boolean(data);

  const dot   = loading ? 'bg-gray-300' : isError ? 'bg-amber-400' : isSet ? 'bg-hub-green' : 'bg-red-400';
  const text  = loading ? 'text-gray-300' : isError ? 'text-amber-400' : isSet ? 'text-hub-green' : 'text-red-400';
  const label2 = loading ? '…' : isError ? 'Error' : isSet ? 'Set' : 'Not set';

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {label2}
      </span>
    </div>
  );
}

function AllowanceRow({ tokenAddress, spender, label }) {
  const { address: owner } = useAccount();
  const { data, isLoading, isError, refetch } = useReadContract({
    address: tokenAddress, abi: BEER_TOKEN_ABI, functionName: 'allowance', args: [owner, spender],
    query: { enabled: !!tokenAddress && !!owner && !!spender },
  });
  const noSpender = !spender;
  const loading = !noSpender && (isLoading || (data === undefined && !isError));
  const amount  = data ?? 0n;
  const isSet   = !noSpender && amount > 0n;

  const dot    = noSpender ? 'bg-gray-200' : loading ? 'bg-gray-300' : isError ? 'bg-amber-400' : isSet ? 'bg-hub-green' : 'bg-red-400';
  const text   = noSpender ? 'text-gray-300' : loading ? 'text-gray-300' : isError ? 'text-amber-400' : isSet ? 'text-hub-green' : 'text-red-400';
  const label2 = noSpender ? 'Unset' : loading ? '…' : isError ? 'Error' : isSet ? parseFloat(formatUnits(amount, 18)).toLocaleString() : 'None';

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {label2}
      </span>
    </div>
  );
}

// ── Write hook wrapper ────────────────────────────────────────────────────────
function useWrite() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  return { writeContract, hash, isPending, isConfirming, isConfirmed, writeError };
}

const VERSION_CHECKS = Object.entries(EXPECTED_VERSIONS).map(([key, expected]) => ({
  key, expected, address: ADDRESSES[key],
}));

const TABS = ['Collections', 'Tokens', 'Treasury', 'Upload'];

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTIONS TAB
// ─────────────────────────────────────────────────────────────────────────────
function CollectionsTab() {
  const publicClient = usePublicClient();
  const [collections, setCollections] = useState([]);
  const [expanded, setExpanded]       = useState(null);
  const [tokens, setTokens]           = useState({});
  const [contractCidInputs, setContractCidInputs] = useState({});
  const [tokenCidInputs, setTokenCidInputs]       = useState({});
  const [refetchKey, setRefetchKey]               = useState(0);
  const { writeContract, hash, isPending, isConfirming, isConfirmed, writeError } = useWrite();

  useEffect(() => { if (isConfirmed) setTimeout(() => setRefetchKey(k => k + 1), 2000); }, [isConfirmed]);

  const { data: allContracts, refetch } = useReadContract({
    address: ADDRESSES.NFT_DEPLOYER, abi: NFT_DEPLOYER_ABI, functionName: 'getAllContracts',
  });

  useEffect(() => {
    if (!allContracts || !publicClient) return;
    const calls = allContracts.flatMap(addr => [
      { address: addr, abi: NFT_ABI, functionName: 'name'         },
      { address: addr, abi: NFT_ABI, functionName: 'symbol'       },
      { address: addr, abi: NFT_ABI, functionName: 'totalSupply'  },
      { address: addr, abi: NFT_ABI, functionName: 'contractURI'  },
    ]);
    publicClient.multicall({ contracts: calls }).then(res => {
      const built = allContracts.map((addr, i) => ({
        address: addr,
        name:         res[i * 4 + 0]?.result ?? addr,
        symbol:       res[i * 4 + 1]?.result ?? '?',
        totalSupply:  res[i * 4 + 2]?.result ?? 0n,
        contractURI:  res[i * 4 + 3]?.result ?? '',
      }));
      setCollections(built);
    });
  }, [allContracts, publicClient]);

  const loadTokens = async (addr, supply) => {
    if (!publicClient || supply === 0n) { setTokens(t => ({ ...t, [addr]: [] })); return; }
    const count = Number(supply);
    const calls = Array.from({ length: count }, (_, i) => ({
      address: addr, abi: NFT_ABI, functionName: 'tokenURI', args: [BigInt(i)],
    }));
    const res = await publicClient.multicall({ contracts: calls });
    setTokens(t => ({ ...t, [addr]: res.map((r, i) => ({ id: i, uri: r.result ?? '' })) }));
  };

  const toggleExpand = (addr, supply) => {
    if (expanded === addr) { setExpanded(null); return; }
    setExpanded(addr);
    if (!tokens[addr]) loadTokens(addr, supply);
  };

  const setContractCid = (addr) => {
    const cid = contractCidInputs[addr]?.trim().replace(/^ipfs:\/\//, '');
    if (!cid) return;
    writeContract({ address: addr, abi: NFT_ABI, functionName: 'setContractCID', args: [cid] });
  };
  const setTokenCid = (addr, tokenId) => {
    const cid = tokenCidInputs[`${addr}-${tokenId}`]?.trim().replace(/^ipfs:\/\//, '');
    if (!cid) return;
    writeContract({ address: addr, abi: NFT_ABI, functionName: 'setTokenCID', args: [BigInt(tokenId), cid] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium">{collections.length} collection{collections.length !== 1 ? 's' : ''} registered</p>
        <button onClick={() => { refetch(); setRefetchKey(k => k + 1); }} className="text-gray-400 hover:text-hub-green transition-colors"><RefreshCw size={14} /></button>
      </div>
      {collections.map(col => (
        <div key={col.address} className="border border-gray-100 rounded-xl">
          <div
            onClick={() => toggleExpand(col.address, col.totalSupply)}
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 text-sm">{col.name} <span className="text-gray-400 font-mono text-xs">({col.symbol})</span></p>
              <CopyAddr address={col.address} />
            </div>
            <p className="text-xs text-gray-400 font-medium">{col.totalSupply?.toString()} tokens</p>
            {expanded === col.address ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>

          {expanded === col.address && (
            <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50 rounded-b-xl">
              {/* Collection URI */}
              <div>
                <Label>Collection URI (contractCID)</Label>
                <p className="text-xs text-gray-400 font-mono mb-2 truncate">{col.contractURI || 'not set'}</p>
                <div className="flex gap-2">
                  <Input
                    value={contractCidInputs[col.address] ?? ''}
                    onChange={v => setContractCidInputs(c => ({ ...c, [col.address]: v }))}
                    placeholder="CID or ipfs://..."
                    className="flex-1"
                  />
                  <Btn onClick={() => setContractCid(col.address)} disabled={isPending || isConfirming}>Set</Btn>
                </div>
                <TxStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} error={writeError} />
              </div>

              {/* Per-token CIDs */}
              <div>
                <Label>Token Metadata CIDs</Label>
                {!tokens[col.address] ? (
                  <p className="text-xs text-gray-400">Loading tokens…</p>
                ) : tokens[col.address].length === 0 ? (
                  <p className="text-xs text-gray-400">No tokens minted yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {tokens[col.address].map(tok => (
                      <div key={tok.id} className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-500 w-8 shrink-0">#{tok.id}</span>
                        <Input
                          value={tokenCidInputs[`${col.address}-${tok.id}`] ?? ''}
                          onChange={v => setTokenCidInputs(c => ({ ...c, [`${col.address}-${tok.id}`]: v }))}
                          placeholder={tok.uri ? tok.uri.replace('ipfs://', '') : 'CID…'}
                          className="flex-1 text-xs"
                        />
                        <Btn onClick={() => setTokenCid(col.address, tok.id)} disabled={isPending || isConfirming}>Set</Btn>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Role Status */}
              <div>
                <Label>Role Status</Label>
                <div className="border border-gray-100 rounded-lg px-3 divide-y divide-gray-50 mb-3">
                  <RoleStatusRow contract={col.address} abi={NFT_ABI} fn="isMinter"             target={ADDRESSES.TREASURY}    label="Minter → Treasury"           refetchKey={refetchKey} />
                  <RoleStatusRow contract={col.address} abi={NFT_ABI} fn="redemptionOperator"  target={ADDRESSES.MARKETPLACE} label="Redemption Op → Marketplace" refetchKey={refetchKey} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <RoleInput label="Set Minter" buttonLabel="Grant" onSubmit={(addr, bool) =>
                    writeContract({ address: col.address, abi: NFT_ABI, functionName: 'setMinter', args: [addr, bool] })
                  } />
                  <RoleInput
                    label="Redemption Operator"
                    buttonLabel="Grant"
                    hint="Grants an address the right to call redeem() on behalf of NFT holders. Must be set to the Marketplace proxy address before buyers can redeem through the platform. Required once per collection at deploy time — if missing, all redemptions will revert."
                    onSubmit={(addr, bool) =>
                      writeContract({ address: col.address, abi: NFT_ABI, functionName: 'setRedemptionOperator', args: [addr, bool] })
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RoleInput({ label, buttonLabel, onSubmit, hint }) {
  const [addr, setAddr] = useState('');
  const [approved, setApproved] = useState(true);
  return (
    <div className="border border-gray-100 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">{label}</p>
        {hint && <Hint text={hint} />}
      </div>
      <Input value={addr} onChange={setAddr} placeholder="0x…" className="mb-2" />
      <div className="flex items-center gap-2">
        <select value={approved} onChange={e => setApproved(e.target.value === 'true')}
          className="border border-gray-200 rounded px-2 py-1 text-xs font-medium flex-1">
          <option value="true">Grant</option>
          <option value="false">Revoke</option>
        </select>
        <Btn onClick={() => onSubmit(addr, approved)} disabled={!addr} variant={approved ? 'primary' : 'danger'}>{approved ? 'Grant' : 'Revoke'}</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS TAB
// ─────────────────────────────────────────────────────────────────────────────
function TokensTab() {
  const publicClient = usePublicClient();
  const [tokenList, setTokenList] = useState([]);
  const [expanded, setExpanded]   = useState(null);
  const [minterAddr, setMinterAddr] = useState({});
  const [spenderAddr, setSpenderAddr] = useState({});
  const { writeContract, hash, isPending, isConfirming, isConfirmed, writeError } = useWrite();

  const { data: allTokens, refetch } = useReadContract({
    address: ADDRESSES.TOKEN_DEPLOYER, abi: TOKEN_DEPLOYER_ABI, functionName: 'getAllTokens',
  });

  useEffect(() => {
    if (!allTokens || !publicClient) return;
    const calls = allTokens.flatMap(addr => [
      { address: addr, abi: ERC20_ABI, functionName: 'name'        },
      { address: addr, abi: ERC20_ABI, functionName: 'symbol'      },
      { address: addr, abi: ERC20_ABI, functionName: 'totalSupply' },
      { address: addr, abi: BEER_TOKEN_ABI, functionName: 'owner'  },
    ]);
    publicClient.multicall({ contracts: calls }).then(res => {
      setTokenList(allTokens.map((addr, i) => ({
        address:     addr,
        name:        res[i * 4 + 0]?.result ?? addr,
        symbol:      res[i * 4 + 1]?.result ?? '?',
        totalSupply: res[i * 4 + 2]?.result ?? 0n,
        owner:       res[i * 4 + 3]?.result ?? '',
      })));
    });
  }, [allTokens, publicClient]);

  const setMinter = (tokenAddr, approved) => {
    const addr = minterAddr[tokenAddr]?.trim();
    if (!addr) return;
    writeContract({ address: tokenAddr, abi: BEER_TOKEN_ABI, functionName: 'setMinter', args: [addr, approved] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium">{tokenList.length} token{tokenList.length !== 1 ? 's' : ''} registered</p>
        <button onClick={() => refetch()} className="text-gray-400 hover:text-hub-green transition-colors"><RefreshCw size={14} /></button>
      </div>
      {tokenList.map(tok => (
        <div key={tok.address} className="border border-gray-100 rounded-xl">
          <div
            onClick={() => setExpanded(expanded === tok.address ? null : tok.address)}
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 text-sm">{tok.name} <span className="text-gray-400 font-mono text-xs">({tok.symbol})</span></p>
              <CopyAddr address={tok.address} />
            </div>
            <p className="text-xs text-gray-400">{parseFloat(formatUnits(tok.totalSupply, 18)).toLocaleString()} supply</p>
            {expanded === tok.address ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>

          {expanded === tok.address && (
            <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50 rounded-b-xl">
              <div>
                <Label>Owner</Label>
                <CopyAddr address={tok.owner} full />
              </div>
              <div>
                <Label>Minter Status</Label>
                <div className="border border-gray-100 rounded-lg px-3 divide-y divide-gray-50 mb-2">
                  <RoleStatusRow contract={tok.address} abi={BEER_TOKEN_ABI} fn="isMinter" target={ADDRESSES.TREASURY} label="Minter → Treasury" />
                </div>
              </div>
              <div>
                <Label>Minter Management</Label>
                <div className="flex gap-2">
                  <Input
                    value={minterAddr[tok.address] ?? ''}
                    onChange={v => setMinterAddr(m => ({ ...m, [tok.address]: v }))}
                    placeholder="0x…"
                    className="flex-1"
                  />
                  <Btn onClick={() => setMinter(tok.address, true)}  disabled={isPending || isConfirming}>Grant</Btn>
                  <Btn onClick={() => setMinter(tok.address, false)} disabled={isPending || isConfirming} variant="danger">Revoke</Btn>
                </div>
                <TxStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} error={writeError} />
              </div>
              <div>
                <Label>Allowance Status</Label>
                <div className="border border-gray-100 rounded-lg px-3 divide-y divide-gray-50 mb-2">
                  <AllowanceRow tokenAddress={tok.address} spender={spenderAddr[tok.address]} label="Allowance → Router" />
                </div>
              </div>
              <div>
                <Label>Approve Spender</Label>
                <div className="flex gap-2">
                  <Input
                    value={spenderAddr[tok.address] ?? ''}
                    onChange={v => setSpenderAddr(s => ({ ...s, [tok.address]: v }))}
                    placeholder="0x…"
                    className="flex-1"
                  />
                  <Btn
                    onClick={() => writeContract({ address: tok.address, abi: BEER_TOKEN_ABI, functionName: 'approve', args: [spenderAddr[tok.address], maxUint256] })}
                    disabled={!spenderAddr[tok.address] || isPending || isConfirming}
                  >Approve</Btn>
                  <Btn
                    onClick={() => writeContract({ address: tok.address, abi: BEER_TOKEN_ABI, functionName: 'approve', args: [spenderAddr[tok.address], 0n] })}
                    disabled={!spenderAddr[tok.address] || isPending || isConfirming}
                    variant="danger"
                  >Revoke</Btn>
                </div>
                <TxStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} error={writeError} />
              </div>
            </div>
          )}
        </div>
      ))}

      <DEXPairsSection />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEX PAIRS SECTION (inside Tokens tab)
// ─────────────────────────────────────────────────────────────────────────────
function DEXPairsSection() {
  const publicClient = usePublicClient();
  const [pairs, setPairs]       = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading]   = useState(false);

  const { data: pairLength, refetch } = useReadContract({
    address: ADDRESSES.FACTORY, abi: FACTORY_ABI, functionName: 'allPairsLength',
    query: { enabled: !!ADDRESSES.FACTORY },
  });

  useEffect(() => {
    if (!pairLength || !publicClient) return;
    const count = Number(pairLength);
    if (count === 0) { setPairs([]); return; }
    setLoading(true);

    const indexCalls = Array.from({ length: count }, (_, i) => ({
      address: ADDRESSES.FACTORY, abi: FACTORY_ABI, functionName: 'allPairs', args: [BigInt(i)],
    }));

    publicClient.multicall({ contracts: indexCalls }).then(async addrRes => {
      const addrs = addrRes.map(r => r.result).filter(Boolean);

      const dataCalls = addrs.flatMap(addr => [
        { address: addr, abi: PAIR_ABI, functionName: 'token0'      },
        { address: addr, abi: PAIR_ABI, functionName: 'token1'      },
        { address: addr, abi: PAIR_ABI, functionName: 'totalSupply' },
        { address: addr, abi: PAIR_ABI, functionName: 'getReserves' },
      ]);
      const dataRes = await publicClient.multicall({ contracts: dataCalls });

      const base = addrs.map((addr, i) => ({
        address:   addr,
        token0:    dataRes[i * 4 + 0]?.result,
        token1:    dataRes[i * 4 + 1]?.result,
        lpSupply:  dataRes[i * 4 + 2]?.result ?? 0n,
        reserve0:  dataRes[i * 4 + 3]?.result?.[0] ?? 0n,
        reserve1:  dataRes[i * 4 + 3]?.result?.[1] ?? 0n,
      }));

      const symCalls = base.flatMap(p => [
        { address: p.token0, abi: ERC20_ABI, functionName: 'symbol' },
        { address: p.token1, abi: ERC20_ABI, functionName: 'symbol' },
      ]);
      const symRes = await publicClient.multicall({ contracts: symCalls });

      setPairs(base.map((p, i) => ({
        ...p,
        symbol0: symRes[i * 2 + 0]?.result ?? '?',
        symbol1: symRes[i * 2 + 1]?.result ?? '?',
      })));
      setLoading(false);
    });
  }, [pairLength, publicClient]);

  const fmt18 = (v) => v != null ? parseFloat(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—';

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between border-t border-gray-100 pt-6">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          DEX Pairs — {loading ? '…' : `${pairs.length} pair${pairs.length !== 1 ? 's' : ''}`}
        </p>
        <button onClick={() => refetch()} className="text-gray-400 hover:text-hub-green transition-colors"><RefreshCw size={14} /></button>
      </div>

      {pairs.map(pair => (
        <div key={pair.address} className="border border-gray-100 rounded-xl">
          <div
            onClick={() => setExpanded(expanded === pair.address ? null : pair.address)}
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 text-sm">
                {pair.token0?.toLowerCase() === ADDRESSES.WETH?.toLowerCase()
                  ? `${pair.symbol1}/${pair.symbol0}`
                  : `${pair.symbol0}/${pair.symbol1}`}
                {' '}<span className="text-gray-400 font-mono text-xs">LP</span>
              </p>
              <CopyAddr address={pair.address} />
            </div>
            <p className="text-xs text-gray-400 shrink-0">{fmt18(pair.lpSupply)} LP supply</p>
            {expanded === pair.address ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>

          {expanded === pair.address && (
            <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{pair.symbol0} Reserve</Label>
                  <p className="text-sm font-black text-gray-700">{fmt18(pair.reserve0)}</p>
                  <CopyAddr address={pair.token0} />
                </div>
                <div>
                  <Label>{pair.symbol1} Reserve</Label>
                  <p className="text-sm font-black text-gray-700">{fmt18(pair.reserve1)}</p>
                  <CopyAddr address={pair.token1} />
                </div>
              </div>
              <div>
                <Label>Price</Label>
                <p className="text-sm font-black text-gray-700">
                  {pair.reserve0 > 0n && pair.reserve1 > 0n
                    ? `${(Number(formatUnits(pair.reserve1, 18)) / Number(formatUnits(pair.reserve0, 18))).toFixed(8)} ${pair.symbol1} per ${pair.symbol0}`
                    : 'No liquidity'}
                </p>
              </div>
              <div>
                <Label>LP Total Supply</Label>
                <p className="text-sm font-black text-gray-700">{fmt18(pair.lpSupply)}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TREASURY TAB
// ─────────────────────────────────────────────────────────────────────────────
function TreasuryTab() {
  const { writeContract, hash, isPending, isConfirming, isConfirmed, writeError } = useWrite();
  const [inputs, setInputs] = useState({});
  const set = (key, val) => setInputs(i => ({ ...i, [key]: val }));

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'dexEntryFeeBps'     },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'dexExitFeeBps'      },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'marketplaceFeeBps'  },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'lpRewardFeeBps'     },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'collateralRatioBps' },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'stkHomestead'       },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'trustedRelay'       },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'weth'               },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'accumulatedFees'    },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'paused'             },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'tierThreshold', args: [1] },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'tierThreshold', args: [2] },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'tierThreshold', args: [3] },
    ],
  });

  const [dexEntryBps, dexExitBps, marketBps, lpBps, collBps, stkAddr, relayAddr, wethAddr, accFees, paused, tier1, tier2, tier3] =
    data?.map(d => d?.result) ?? [];

  const write = (fn, args) => writeContract({ address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: fn, args });

  const feeRows = [
    { label: 'DEX Entry Fee',       key: 'dexEntry',   current: dexEntryBps,  fn: 'setDexEntryFee'     },
    { label: 'DEX Exit Fee',        key: 'dexExit',    current: dexExitBps,   fn: 'setDexExitFee'      },
    { label: 'Marketplace Fee',     key: 'market',     current: marketBps,    fn: 'setMarketplaceFee'  },
    { label: 'LP Reward Fee',       key: 'lpReward',   current: lpBps,        fn: 'setLpRewardFeeBps'  },
    { label: 'Collateral Ratio',    key: 'collateral', current: collBps,      fn: 'setCollateralRatioBps' },
  ];
  const tierRows = [
    { label: 'Tier 1 Threshold (ETH)', key: 'tier1', current: tier1, tier: 1 },
    { label: 'Tier 2 Threshold (ETH)', key: 'tier2', current: tier2, tier: 2 },
    { label: 'Tier 3 Threshold (ETH)', key: 'tier3', current: tier3, tier: 3 },
  ];
  const addrRows = [
    { label: 'stkHomestead',   key: 'stk',   current: stkAddr,   fn: 'setStkHomestead' },
    { label: 'Trusted Relay',  key: 'relay', current: relayAddr, fn: 'setTrustedRelay' },
    { label: 'WETH',           key: 'weth',  current: wethAddr,  fn: 'setWeth'         },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${paused ? 'bg-red-400' : 'bg-hub-green'}`} />
          <span className="text-xs font-medium text-gray-500">{paused ? 'Paused' : 'Active'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Btn onClick={() => refetch()} variant="ghost"><RefreshCw size={12} /></Btn>
          <Btn onClick={() => write(paused ? 'unpause' : 'pause', [])} variant={paused ? 'primary' : 'danger'}>
            {paused ? 'Unpause' : 'Pause'}
          </Btn>
        </div>
      </div>

      {/* Fees / BPS */}
      <div>
        <Label>Fees & Ratios (bps)</Label>
        <div className="space-y-2">
          {feeRows.map(row => (
            <div key={row.key} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-40 shrink-0">{row.label}</span>
              <span className="text-xs font-mono text-gray-400 w-16">{row.current?.toString() ?? '…'}</span>
              <Input value={inputs[row.key] ?? ''} onChange={v => set(row.key, v)} placeholder="bps" className="flex-1" />
              <Btn
                onClick={() => write(row.fn, [BigInt(inputs[row.key] ?? 0)])}
                disabled={!inputs[row.key] || isPending || isConfirming}
              >Set</Btn>
            </div>
          ))}
        </div>
      </div>

      {/* Tier Thresholds */}
      <div>
        <Label>Attestation Tier Thresholds</Label>
        <div className="space-y-2">
          {tierRows.map(row => (
            <div key={row.key} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-40 shrink-0">{row.label}</span>
              <span className="text-xs font-mono text-gray-400 w-16">
                {row.current !== undefined ? parseFloat(formatUnits(row.current, 18)).toFixed(4) : '…'} ETH
              </span>
              <Input value={inputs[row.key] ?? ''} onChange={v => set(row.key, v)} placeholder="ETH amount" className="flex-1" />
              <Btn
                onClick={() => write('setTierThreshold', [row.tier, parseEther(inputs[row.key] ?? '0')])}
                disabled={!inputs[row.key] || isPending || isConfirming}
              >Set</Btn>
            </div>
          ))}
        </div>
      </div>

      {/* Addresses */}
      <div>
        <Label>Contract Addresses</Label>
        <div className="space-y-2">
          {addrRows.map(row => (
            <div key={row.key} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-28 shrink-0">{row.label}</span>
              <div className="w-36 shrink-0 min-w-0"><CopyAddr address={row.current} /></div>
              <Input value={inputs[row.key] ?? ''} onChange={v => set(row.key, v)} placeholder="0x…" className="flex-1" />
              <Btn onClick={() => write(row.fn, [inputs[row.key]])} disabled={!inputs[row.key] || isPending || isConfirming}>Set</Btn>
            </div>
          ))}
        </div>
      </div>

      {/* Trusted Caller */}
      <div>
        <Label>Trusted Caller</Label>
        <div className="flex gap-2">
          <Input value={inputs.trustedCaller ?? ''} onChange={v => set('trustedCaller', v)} placeholder="0x…" className="flex-1" />
          <Btn onClick={() => write('setTrustedCaller', [inputs.trustedCaller, true])}  disabled={!inputs.trustedCaller || isPending || isConfirming}>Grant</Btn>
          <Btn onClick={() => write('setTrustedCaller', [inputs.trustedCaller, false])} disabled={!inputs.trustedCaller || isPending || isConfirming} variant="danger">Revoke</Btn>
        </div>
      </div>

      {/* Fee Withdrawal */}
      <div>
        <Label>Withdraw Fees — Accumulated: {accFees ? parseFloat(formatUnits(accFees, 18)).toFixed(6) : '…'} ETH</Label>
        <div className="flex gap-2">
          <Input value={inputs.withdrawTo ?? ''} onChange={v => set('withdrawTo', v)} placeholder="to address (0x…)" className="flex-1" />
          <Input value={inputs.withdrawAmt ?? ''} onChange={v => set('withdrawAmt', v)} placeholder="ETH amount" className="w-32" />
          <Btn
            onClick={() => write('withdrawFees', [inputs.withdrawTo, parseEther(inputs.withdrawAmt ?? '0')])}
            disabled={!inputs.withdrawTo || !inputs.withdrawAmt || isPending || isConfirming}
            variant="danger"
          >Withdraw</Btn>
        </div>
      </div>

      <TxStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} error={writeError} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD TAB
// ─────────────────────────────────────────────────────────────────────────────
function UploadTab() {
  const [image, setImage]       = useState(null);
  const [preview, setPreview]   = useState(null);
  const [meta, setMeta]         = useState({ name: '', description: '', style: '', abv: '', ibu: '' });
  const [imageCid, setImageCid] = useState('');
  const [metaCid, setMetaCid]   = useState('');
  const [status, setStatus]     = useState('idle');
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState('');

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
    setImageCid('');
    setMetaCid('');
  };

  const upload = async () => {
    try {
      setError('');
      setStatus('image');
      const iCid = await pinFile(image);
      setImageCid(iCid);
      setStatus('meta');
      const obj = {
        name:        meta.name,
        description: meta.description,
        image:       `ipfs://${iCid}`,
        attributes:  [
          { trait_type: 'Style', value: meta.style },
          ...(meta.abv ? [{ trait_type: 'ABV', value: parseFloat(meta.abv), display_type: 'number' }] : []),
          ...(meta.ibu ? [{ trait_type: 'IBU', value: parseInt(meta.ibu),   display_type: 'number' }] : []),
        ].filter(a => a.value !== '' && a.value !== undefined),
      };
      const mCid = await pinJson(obj, meta.name);
      setMetaCid(mCid);
      setStatus('done');
    } catch (e) {
      setError(e.message);
      setStatus('idle');
    }
  };

  const copy = (val, key) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const canUpload = image && meta.name.trim() && PINATA_JWT && status !== 'image' && status !== 'meta';

  return (
    <div className="space-y-5">
      {!PINATA_JWT && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 font-medium">
          VITE_PINATA_JWT not set — uploads will fail.
        </div>
      )}

      {/* Image */}
      <div>
        <Label>Image (converted to PNG on upload)</Label>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-hub-green transition-colors">
          {preview
            ? <img src={preview} alt="preview" className="max-h-32 rounded-lg object-contain mb-2" />
            : <ImagePlus size={32} className="text-gray-300 mb-2" />
          }
          <span className="text-xs text-gray-400 font-medium">{image?.name ?? 'Click to select image'}</span>
          <input type="file" accept="image/*" onChange={onFile} className="hidden" />
        </label>
      </div>

      {/* Metadata fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <Label>Name</Label>
          <Input value={meta.name} onChange={v => setMeta(m => ({ ...m, name: v }))} placeholder="Bavarian Hefeweizen" />
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <textarea
            value={meta.description}
            onChange={e => setMeta(m => ({ ...m, description: e.target.value }))}
            placeholder="A traditional unfiltered German wheat beer…"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-hub-green transition-colors resize-none"
          />
        </div>
        <div>
          <Label>Style</Label>
          <Input value={meta.style} onChange={v => setMeta(m => ({ ...m, style: v }))} placeholder="Hefeweizen" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>ABV %</Label>
            <Input value={meta.abv} onChange={v => setMeta(m => ({ ...m, abv: v }))} placeholder="5.5" />
          </div>
          <div>
            <Label>IBU</Label>
            <Input value={meta.ibu} onChange={v => setMeta(m => ({ ...m, ibu: v }))} placeholder="12" />
          </div>
        </div>
      </div>

      <Btn onClick={upload} disabled={!canUpload} size="md">
        {status === 'image' ? 'Uploading image…' : status === 'meta' ? 'Pinning metadata…' : 'Upload & Pin'}
      </Btn>

      {error && <p className="text-xs text-red-500 font-mono">{error}</p>}

      {/* Results */}
      {(imageCid || metaCid) && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          {imageCid && (
            <div>
              <Label>Image CID</Label>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-gray-600 flex-1 truncate bg-gray-50 px-2 py-1 rounded">{imageCid}</code>
                <button onClick={() => copy(imageCid, 'img')} className="text-gray-400 hover:text-hub-green transition-colors">
                  {copied === 'img' ? <CheckCheck size={14} className="text-hub-green" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}
          {metaCid && (
            <div>
              <Label>Metadata CID — use this in setTokenCID / setContractCID</Label>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-gray-600 flex-1 truncate bg-gray-50 px-2 py-1 rounded">{metaCid}</code>
                <button onClick={() => copy(metaCid, 'meta')} className="text-gray-400 hover:text-hub-green transition-colors">
                  {copied === 'meta' ? <CheckCheck size={14} className="text-hub-green" /> : <Copy size={14} />}
                </button>
                <a href={`https://ipfs.io/ipfs/${metaCid}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-hub-green transition-colors">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { open }               = useAppKit();
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState('Collections');

  const { data: owner } = useReadContract({
    address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'owner',
    query: { enabled: !!isConnected },
  });

  const isOwner = owner && address && owner.toLowerCase() === address.toLowerCase();

  const { data: versionData } = useReadContracts({
    contracts: VERSION_CHECKS.map(c => ({
      address: c.address, abi: VERSION_ABI, functionName: 'VERSION',
    })),
    query: { enabled: !!isConnected },
  });

  const versionStatus = (addressKey) => {
    const idx = VERSION_CHECKS.findIndex(c => c.key === addressKey);
    if (idx === -1) return null;
    const result = versionData?.[idx];
    if (!result || result.error || result.result === undefined) return 'unknown';
    return result.result === BigInt(VERSION_CHECKS[idx].expected) ? 'ok' : 'behind';
  };

  const VersionDot = ({ addrKey }) => {
    const s = versionStatus(addrKey);
    if (!s) return null;
    const color = s === 'ok' ? 'bg-hub-green' : 'bg-red-500';
    const title = s === 'ok' ? 'Up to date' : s === 'behind' ? 'Upgrade needed' : 'Not yet upgraded';
    return <span className={`w-1.5 h-1.5 rounded-full shrink-0 inline-block mr-1 ${color}`} title={title} />;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-hub-green mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">Admin Console</h2>
          <p className="text-gray-500 text-sm mb-6">Connect owner wallet to continue.</p>
          <button onClick={() => open()} className="bg-hub-green text-white font-black px-8 py-3 rounded uppercase tracking-widest text-sm">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (isOwner === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm font-mono">{address}</p>
          <p className="text-gray-400 text-xs mt-2">This wallet is not the Treasury owner.</p>
        </div>
      </div>
    );
  }

  const tabIcons = { Collections: <FileCode size={14} />, Tokens: <Settings size={14} />, Treasury: <Settings size={14} />, Upload: <Upload size={14} /> };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={28} className="text-hub-green" />
            <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Admin Console</h1>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 grid gap-x-6 gap-y-2"
               style={{ gridTemplateColumns: 'auto 1fr auto 1fr' }}>
            {[
              ['Treasury',       ADDRESSES.TREASURY,       'TREASURY'],
              ['Marketplace',    ADDRESSES.MARKETPLACE,    'MARKETPLACE'],
              ['Router',         ADDRESSES.ROUTER,         'ROUTER'],
              ['DEX Factory',    ADDRESSES.FACTORY,        'FACTORY'],
              ['Token Deployer', ADDRESSES.TOKEN_DEPLOYER, 'TOKEN_DEPLOYER'],
              ['NFT Deployer',   ADDRESSES.NFT_DEPLOYER,   'NFT_DEPLOYER'],
            ].map(([label, addr, vKey]) => (
              <React.Fragment key={label}>
                <span className="text-xs font-black uppercase tracking-widest text-gray-400 whitespace-nowrap self-center flex items-center">
                  <VersionDot addrKey={vKey} />{label}
                </span>
                <div className="min-w-0 self-center"><CopyAddr address={addr} /></div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="bg-white shadow-md rounded-2xl overflow-hidden">
          <div className="flex border-b border-gray-100">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest transition-all border-b-4 ${
                  activeTab === tab
                    ? 'border-hub-green text-hub-green bg-white'
                    : 'border-transparent text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-white'
                }`}
              >
                {tabIcons[tab]} {tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'Collections' && <CollectionsTab />}
            {activeTab === 'Tokens'      && <TokensTab />}
            {activeTab === 'Treasury'    && <TreasuryTab />}
            {activeTab === 'Upload'      && <UploadTab />}
          </div>
        </div>

      </div>
    </div>
  );
}
