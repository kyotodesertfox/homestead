import React, { useState, useEffect } from 'react';
import { Shield, Upload, FileCode, Settings, ImagePlus, CheckCheck, Copy, ExternalLink, ChevronDown, ChevronUp, RefreshCw, Pencil, Network } from 'lucide-react';
import { useAccount, useReadContract, useReadContracts, usePublicClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { formatUnits, parseEther, maxUint256 } from 'viem';
import {
  ADDRESSES, TREASURY_ABI, MARKETPLACE_ABI, RELAY_ABI, NFT_ABI, BEER_TOKEN_ABI, ERC20_ABI,
  NFT_DEPLOYER_ABI, TOKEN_DEPLOYER_ABI, FACTORY_ABI, PAIR_ABI,
  ARTIFACT_HASHES,
} from '../../contracts';
import { Label, Input, Btn, TxStatus, CopyAddr, Hint, useWrite, useCodeHashes, CodeHashDot, codeHash } from './ui';
import MapTab from './MapTab';

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
// Label, Input, Btn, TxStatus, CopyAddr, Hint, useWrite and the code-hash
// helpers now live in ./ui so the Map tab can share them.

// ── Role row with inline Grant / Revoke ──────────────────────────────────────
function RoleActionRow({ contract, abi, fn, target, label, onGrant, onRevoke, disabled, refetchKey }) {
  const { data, isLoading, isError, refetch } = useReadContract({
    address: contract, abi, functionName: fn, args: [target],
    query: { enabled: !!contract && !!target },
  });
  useEffect(() => { if (refetchKey) refetch(); }, [refetchKey]);
  const isSet = Boolean(data);
  const dot  = isLoading ? 'bg-gray-300' : isError ? 'bg-amber-400' : isSet ? 'bg-hub-green' : 'bg-red-400';
  const text = isLoading ? 'text-gray-400' : isSet ? 'text-hub-green' : 'text-gray-500';
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className={`text-xs flex-1 ${text}`}>{label}</span>
      {onGrant  && <Btn onClick={onGrant}  disabled={disabled} size="sm">Grant</Btn>}
      {onRevoke && <Btn onClick={onRevoke} disabled={disabled} variant="danger" size="sm">Revoke</Btn>}
    </div>
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
  const loading = !!spender && (isLoading || (data === undefined && !isError));
  const amount  = data ?? 0n;
  const isSet   = !!spender && amount > 0n;

  const dot    = loading ? 'bg-gray-300' : isSet ? 'bg-hub-green' : 'bg-red-400';
  const text   = loading ? 'text-gray-300' : isSet ? 'text-hub-green' : 'text-red-400';
  const label2 = loading ? '…' : isSet ? (amount === maxUint256 ? 'Unlimited' : parseFloat(formatUnits(amount, 18)).toLocaleString()) : 'None';

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

const TABS = ['Map', 'Collections', 'Tokens', 'Treasury', 'Marketplace', 'Relay', 'Upload'];

// ─────────────────────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN INDEX LIST (with search)
// ─────────────────────────────────────────────────────────────────────────────
function TokenIndexList({ ids, colAddress, tokenCidInputs, setTokenCidInputs, setTokenCid, isPending, isConfirming }) {
  const [search, setSearch] = useState('');
  const filtered = search.trim() === ''
    ? ids
    : ids.filter(id => String(id).includes(search.trim()));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label>Token Indexes</Label>
        <span className="text-[10px] text-gray-400">{filtered.length} / {ids.length}</span>
      </div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filter by ID…"
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-hub-green transition-colors mb-2"
      />
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {filtered.length === 0
          ? <p className="text-xs text-gray-400">No tokens match.</p>
          : filtered.map(tokenId => {
              const inputKey = `${colAddress}-${tokenId}`;
              return (
                <div key={tokenId} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500 w-8 shrink-0">#{tokenId}</span>
                  <Input
                    value={tokenCidInputs[inputKey] ?? ''}
                    onChange={v => setTokenCidInputs(c => ({ ...c, [inputKey]: v }))}
                    placeholder="CID or ipfs://…"
                    className="flex-1 text-xs"
                  />
                  <Btn onClick={() => setTokenCid(colAddress, tokenId)} disabled={isPending || isConfirming}>Set</Btn>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPLOY COLLECTION PANEL
// ─────────────────────────────────────────────────────────────────────────────
function DeployCollectionPanel({ onDeployed }) {
  const { address } = useAccount();
  const [open, setOpen]     = useState(false);
  const [name, setName]     = useState('');
  const [symbol, setSymbol] = useState('');
  const [cid, setCid]       = useState('');
  const [owner, setOwner]   = useState('');
  const { writeContract, hash, isPending, isConfirming, isConfirmed, writeError } = useWrite();

  useEffect(() => {
    if (!isConfirmed) return;
    onDeployed?.();
    setName(''); setSymbol(''); setCid(''); setOwner('');
    setTimeout(() => setOpen(false), 1500);
  }, [isConfirmed]);

  const canDeploy = name.trim() && symbol.trim() && !isPending && !isConfirming;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs font-black uppercase tracking-widest text-hub-green">Deploy New Collection</span>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={setName} placeholder="Homestead Eggs" />
            </div>
            <div>
              <Label>Symbol</Label>
              <Input value={symbol} onChange={setSymbol} placeholder="EGGNFT" />
            </div>
          </div>
          <div>
            <Label>Contract CID <span className="text-gray-300 font-normal normal-case tracking-normal">(optional - set later)</span></Label>
            <Input value={cid} onChange={setCid} placeholder="CID or ipfs://…" />
          </div>
          <div>
            <Label>Owner <span className="text-gray-300 font-normal normal-case tracking-normal">(defaults to connected wallet)</span></Label>
            <Input value={owner} onChange={setOwner} placeholder={address ?? '0x…'} />
          </div>
          <Btn
            onClick={() => writeContract({
              address: ADDRESSES.NFT_DEPLOYER, abi: NFT_DEPLOYER_ABI, functionName: 'deployCollection',
              args: [name.trim(), symbol.trim(), cid.trim(), owner.trim() || address],
            })}
            disabled={!canDeploy}
            size="md"
          >Deploy Collection</Btn>
          <TxStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} error={writeError} />
        </div>
      )}
    </div>
  );
}

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
  const [selectedToken, setSelectedToken]         = useState(null);
  const [tokenMeta, setTokenMeta]                 = useState({});
  const fetchedUris = React.useRef(new Set());
  const [renameTarget, setRenameTarget]           = useState(null);
  const [renameValue, setRenameValue]             = useState('');
  const [renaming, setRenaming]                   = useState(false);
  const [renamedCid, setRenamedCid]               = useState('');
  const [renameError, setRenameError]             = useState('');
  const { writeContract, hash, isPending, isConfirming, isConfirmed, writeError } = useWrite();

  useEffect(() => { if (isConfirmed) setTimeout(() => setRefetchKey(k => k + 1), 2000); }, [isConfirmed]);

  useEffect(() => {
    const uris = [...new Set(Object.values(tokens).flat().map(t => t.uri).filter(Boolean))];
    uris.forEach(uri => {
      if (fetchedUris.current.has(uri)) return;
      fetchedUris.current.add(uri);
      fetch(`https://ipfs.io/ipfs/${uri.replace('ipfs://', '')}`)
        .then(r => r.json())
        .then(json => setTokenMeta(m => ({ ...m, [uri]: json })))
        .catch(() => setTokenMeta(m => ({ ...m, [uri]: null })));
    });
  }, [tokens]);

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
      <DeployCollectionPanel onDeployed={() => { refetch(); setRefetchKey(k => k + 1); }} />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium">{collections.length} collection{collections.length !== 1 ? 's' : ''} registered</p>
        <button onClick={() => { refetch(); setRefetchKey(k => k + 1); }} className="text-gray-400 hover:text-hub-green transition-colors"><RefreshCw size={14} /></button>
      </div>
      <Modal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="Edit Metadata Name"
      >
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={renameValue} onChange={setRenameValue} placeholder="Bavarian Hefeweizen" />
          </div>
          {renamedCid && (
            <div className="bg-green-50 border border-hub-green/30 rounded-lg p-3 space-y-1">
              <p className="text-xs font-black text-hub-green uppercase tracking-widest">New CID Pinned</p>
              <div className="flex items-center gap-2">
                <code className="text-[10px] font-mono text-gray-600 flex-1 truncate">{renamedCid}</code>
                <button onClick={() => navigator.clipboard?.writeText(renamedCid)} className="text-hub-green hover:brightness-75 shrink-0">
                  <Copy size={12} />
                </button>
              </div>
              <p className="text-[10px] text-gray-400">Use the Token Indexes panel to apply this CID to each token.</p>
            </div>
          )}
          {renameError && <p className="text-xs text-red-500 font-mono">{renameError}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Btn onClick={() => setRenameTarget(null)} variant="ghost">Cancel</Btn>
            <Btn
              disabled={renaming || !renameValue.trim()}
              onClick={async () => {
                if (!renameTarget || !renameValue.trim()) return;
                setRenaming(true); setRenameError(''); setRenamedCid('');
                try {
                  const existing = tokenMeta[renameTarget.uri] ?? {};
                  const newMeta  = { ...existing, name: renameValue.trim() };
                  const cid      = await pinJson(newMeta, renameValue.trim());
                  setRenamedCid(cid);
                  setTokenMeta(m => ({ ...m, [`ipfs://${cid}`]: newMeta }));
                } catch (e) {
                  setRenameError(e.message);
                } finally {
                  setRenaming(false);
                }
              }}
            >
              {renaming ? 'Pinning…' : 'Re-pin Metadata'}
            </Btn>
          </div>
        </div>
      </Modal>

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

              {/* NFT styles */}
              <div>
                <Label>NFTs</Label>
                {!tokens[col.address] ? (
                  <p className="text-xs text-gray-400">Loading…</p>
                ) : tokens[col.address].length === 0 ? (
                  <p className="text-xs text-gray-400">No tokens minted yet</p>
                ) : (() => {
                  const groups = [];
                  const seen   = new Map();
                  for (const tok of tokens[col.address]) {
                    const k = tok.uri || '';
                    if (!seen.has(k)) { seen.set(k, groups.length); groups.push({ uri: k, ids: [] }); }
                    groups[seen.get(k)].ids.push(tok.id);
                  }
                  return (
                    <div className="space-y-2">
                      {groups.map(({ uri, ids }) => {
                        const groupKey = `${col.address}::${uri}`;
                        const active   = selectedToken === groupKey;
                        const meta     = uri ? tokenMeta[uri] : null;
                        const name     = meta?.name ?? (meta === null ? uri.replace('ipfs://', '').slice(0, 16) + '…' : 'Loading…');
                        const image    = meta?.image ? meta.image.replace('ipfs://', 'https://ipfs.io/ipfs/') : null;
                        return (
                          <div key={groupKey}>
                            <div className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${
                              active ? 'border-hub-green bg-green-50 rounded-b-none' : 'border-gray-200 hover:border-gray-400 bg-white'
                            }`}>
                              <div
                                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                                onClick={() => setSelectedToken(active ? null : groupKey)}
                              >
                                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                                  {image
                                    ? <img src={image} alt={name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
                                    : <span className="text-gray-300 text-lg font-black">?</span>
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black text-gray-800 truncate">{name}</p>
                                  <p className="text-xs text-gray-400">{ids.length} token{ids.length !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => { setRenameTarget({ uri, ids }); setRenameValue(meta?.name ?? ''); setRenamedCid(''); setRenameError(''); }}
                                className="text-gray-300 hover:text-hub-green transition-colors shrink-0 p-1"
                                title="Edit metadata name"
                              >
                                <Pencil size={13} />
                              </button>
                              <div className="cursor-pointer shrink-0" onClick={() => setSelectedToken(active ? null : groupKey)}>
                                {active ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                              </div>
                            </div>
                            {active && (
                              <div className="border border-hub-green border-t-0 rounded-b-xl p-4 bg-white space-y-3">
                                <div>
                                  <span className="text-xs text-gray-400 block mb-1">IPFS CID</span>
                                  <span className="text-[10px] font-mono text-gray-600 break-all">{uri || 'not set'}</span>
                                </div>
                                <div>
                                  <TokenIndexList
                                    ids={ids}
                                    colAddress={col.address}
                                    tokenCidInputs={tokenCidInputs}
                                    setTokenCidInputs={setTokenCidInputs}
                                    setTokenCid={setTokenCid}
                                    isPending={isPending}
                                    isConfirming={isConfirming}
                                  />
                                </div>
                                <TxStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} error={writeError} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Mint */}
              <MintPanel
                colAddress={col.address}
                onMinted={async () => {
                  const supply = await publicClient.readContract({ address: col.address, abi: NFT_ABI, functionName: 'totalSupply' });
                  await loadTokens(col.address, supply);
                  refetch();
                }}
              />

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
                    hint="Grants an address the right to call redeem() on behalf of NFT holders. Must be set to the Marketplace proxy address before buyers can redeem through the platform. Required once per collection at deploy time -if missing, all redemptions will revert."
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

// ─────────────────────────────────────────────────────────────────────────────
// MINT PANEL — mints new NFTs directly into a collection (mint/mintBatch).
// Owner-only on the NFT contract; independent of the Marketplace listing flow.
// ─────────────────────────────────────────────────────────────────────────────
function MintPanel({ colAddress, onMinted }) {
  const { address } = useAccount();
  const [to, setTo]     = useState('');
  const [cids, setCids] = useState('');
  const { writeContract, hash, isPending, isConfirming, isConfirmed, writeError } = useWrite();

  useEffect(() => {
    if (!isConfirmed) return;
    onMinted?.();
    setCids('');
  }, [isConfirmed]);

  const cidList = cids.split('\n').map(c => c.trim().replace(/^ipfs:\/\//, '')).filter(Boolean);
  const canMint = cidList.length > 0 && !isPending && !isConfirming;

  return (
    <div>
      <Label>Mint NFTs</Label>
      <div className="space-y-2">
        <Input value={to} onChange={setTo} placeholder={address ? `${address} (defaults to you)` : '0x… recipient'} />
        <textarea
          value={cids}
          onChange={e => setCids(e.target.value)}
          placeholder={'One metadata CID per line\nQm… or ipfs://Qm…'}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-hub-green transition-colors"
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400">{cidList.length} token{cidList.length !== 1 ? 's' : ''}</p>
          <Btn
            onClick={() => writeContract({
              address: colAddress, abi: NFT_ABI, functionName: 'mintBatch',
              args: [to.trim() || address, cidList],
            })}
            disabled={!canMint}
          >Mint</Btn>
        </div>
        <TxStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} error={writeError} />
      </div>
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
  const [tokenList, setTokenList]   = useState([]);
  const [expanded, setExpanded]     = useState(null);
  const [minterAddr, setMinterAddr] = useState({});
  const [spenderAddr, setSpenderAddr] = useState({});
  const [newImplAddr, setNewImplAddr] = useState({});
  const [implAddresses, setImplAddresses] = useState({});
  const [implHashes, setImplHashes] = useState({});
  const [refetchKey, setRefetchKey] = useState(0);
  const { writeContract, hash, isPending, isConfirming, isConfirmed, writeError } = useWrite();

  useEffect(() => { if (isConfirmed) setTimeout(() => setRefetchKey(k => k + 1), 2000); }, [isConfirmed]);

  const ERC1967_IMPL_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

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
    publicClient.multicall({ contracts: calls }).then(async res => {
      const list = allTokens.map((addr, i) => ({
        address:     addr,
        name:        res[i * 4 + 0]?.result ?? addr,
        symbol:      res[i * 4 + 1]?.result ?? '?',
        totalSupply: res[i * 4 + 2]?.result ?? 0n,
        owner:       res[i * 4 + 3]?.result ?? '',
      }));
      setTokenList(list);
      setSpenderAddr(prev => {
        const next = { ...prev };
        list.forEach(({ address }) => { if (!next[address]) next[address] = ADDRESSES.ROUTER ?? ''; });
        return next;
      });
      const implSlots = await Promise.all(
        allTokens.map(addr => publicClient.getStorageAt({ address: addr, slot: ERC1967_IMPL_SLOT }))
      );
      const implMap = {};
      allTokens.forEach((addr, i) => {
        const raw = implSlots[i];
        implMap[addr] = raw ? '0x' + raw.slice(-40) : '';
      });
      setImplAddresses(implMap);
      const implCodes = await Promise.all(
        allTokens.map(addr => {
          const impl = implMap[addr];
          return impl ? publicClient.getBytecode({ address: impl }) : Promise.resolve(null);
        })
      );
      const hashMap = {};
      allTokens.forEach((addr, i) => { hashMap[addr] = codeHash(implCodes[i]); });
      setImplHashes(hashMap);
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
            <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50 rounded-b-xl">

              {/* Owner */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400 shrink-0">Owner</span>
                <CopyAddr address={tok.owner} full />
              </div>

              {/* Roles & Actions card */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                <Label>Roles & Permissions</Label>
                <div className="border border-gray-100 rounded-lg px-3 divide-y divide-gray-50">
                  <RoleActionRow
                    contract={tok.address} abi={BEER_TOKEN_ABI} fn="isMinter" target={ADDRESSES.TREASURY}
                    label="Minter → Treasury"
                    onGrant={() => writeContract({ address: tok.address, abi: BEER_TOKEN_ABI, functionName: 'setMinter', args: [ADDRESSES.TREASURY, true]  })}
                    onRevoke={() => writeContract({ address: tok.address, abi: BEER_TOKEN_ABI, functionName: 'setMinter', args: [ADDRESSES.TREASURY, false] })}
                    disabled={isPending || isConfirming} refetchKey={refetchKey}
                  />
                  {ADDRESSES.TOKEN_ESCROW && (
                    <RoleActionRow
                      contract={tok.address} abi={BEER_TOKEN_ABI} fn="isMinter" target={ADDRESSES.TOKEN_ESCROW}
                      label="Minter → Token Escrow"
                      onGrant={() => writeContract({ address: tok.address, abi: BEER_TOKEN_ABI, functionName: 'setMinter', args: [ADDRESSES.TOKEN_ESCROW, true]  })}
                      onRevoke={() => writeContract({ address: tok.address, abi: BEER_TOKEN_ABI, functionName: 'setMinter', args: [ADDRESSES.TOKEN_ESCROW, false] })}
                      disabled={isPending || isConfirming} refetchKey={refetchKey}
                    />
                  )}
                  <RoleActionRow
                    contract={ADDRESSES.TREASURY} abi={TREASURY_ABI} fn="isTrustedCaller" target={tok.address}
                    label="Trusted Caller → Treasury"
                    onGrant={() => writeContract({ address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'setTrustedCaller', args: [tok.address, true]  })}
                    onRevoke={() => writeContract({ address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'setTrustedCaller', args: [tok.address, false] })}
                    disabled={isPending || isConfirming} refetchKey={refetchKey}
                  />
                  <AllowanceRow tokenAddress={tok.address} spender={ADDRESSES.ROUTER} label="Allowance → Router" />
                </div>
                <div className="space-y-2 pt-1 border-t border-gray-50">
                  <div className="flex gap-2 pt-2">
                    <Input value={minterAddr[tok.address] ?? ''} onChange={v => setMinterAddr(m => ({ ...m, [tok.address]: v }))} placeholder="Grant minter (0x…)" className="flex-1" />
                    <Btn onClick={() => setMinter(tok.address, true)}  disabled={isPending || isConfirming}>Grant</Btn>
                    <Btn onClick={() => setMinter(tok.address, false)} disabled={isPending || isConfirming} variant="danger">Revoke</Btn>
                  </div>
                  <div className="flex gap-2">
                    <Input value={spenderAddr[tok.address] ?? ''} onChange={v => setSpenderAddr(s => ({ ...s, [tok.address]: v }))} placeholder="Approve spender (0x…)" className="flex-1" />
                    <Btn onClick={() => writeContract({ address: tok.address, abi: BEER_TOKEN_ABI, functionName: 'approve', args: [spenderAddr[tok.address], maxUint256] })} disabled={!spenderAddr[tok.address] || isPending || isConfirming}>Approve</Btn>
                    <Btn onClick={() => writeContract({ address: tok.address, abi: BEER_TOKEN_ABI, functionName: 'approve', args: [spenderAddr[tok.address], 0n]       })} disabled={!spenderAddr[tok.address] || isPending || isConfirming} variant="danger">Revoke</Btn>
                  </div>
                </div>
              </div>

              {/* Upgrade */}
              <div>
                <Label>Implementation</Label>
                {implAddresses[tok.address] && (() => {
                  const h  = implHashes[tok.address];
                  const ok = h && h === ARTIFACT_HASHES.MASTER_TEMPLATE;
                  return (
                    <p className="text-xs font-mono mb-2 truncate text-gray-400">
                      {implAddresses[tok.address]} -{' '}
                      {!h ? <span>checking…</span> : ok ? <span className="text-hub-green font-semibold">✓ current</span> : <span className="text-amber-500 font-semibold">upgrade available</span>}
                    </p>
                  );
                })()}
                <div className="flex gap-2">
                  <Input value={newImplAddr[tok.address] ?? ''} onChange={v => setNewImplAddr(m => ({ ...m, [tok.address]: v }))} placeholder="New impl 0x…" className="flex-1" />
                  <Btn onClick={() => writeContract({ address: tok.address, abi: BEER_TOKEN_ABI, functionName: 'upgradeToAndCall', args: [newImplAddr[tok.address], '0x'] })} disabled={!/^0x[0-9a-fA-F]{40}$/.test(newImplAddr[tok.address] ?? '') || isPending || isConfirming}>Upgrade</Btn>
                </div>
              </div>

              <TxStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} error={writeError} />
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

  const fmt18 = (v) => v != null ? parseFloat(formatUnits(v, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '-';

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between border-t border-gray-100 pt-6">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          DEX Pairs -{loading ? '…' : `${pairs.length} pair${pairs.length !== 1 ? 's' : ''}`}
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
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'lpShareBps'         },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'collateralRatioBps' },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'stkHomestead'       },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'trustedRelay'       },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'weth'               },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'accumulatedFees'    },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'paused'             },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'tierThreshold', args: [1] },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'tierThreshold', args: [2] },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'tierThreshold', args: [3] },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'surplus'        },
    ],
  });

  const [dexEntryBps, dexExitBps, marketBps, lpBps, collBps, stkAddr, relayAddr, wethAddr, accFees, paused, tier1, tier2, tier3, surplusWei] =
    data?.map(d => d?.result) ?? [];

  const write = (fn, args) => writeContract({ address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: fn, args });

  const feeRows = [
    { label: 'DEX Entry Fee',       key: 'dexEntry',   current: dexEntryBps,  fn: 'setDexEntryFee'     },
    { label: 'DEX Exit Fee',        key: 'dexExit',    current: dexExitBps,   fn: 'setDexExitFee'      },
    { label: 'Marketplace Fee',     key: 'market',     current: marketBps,    fn: 'setMarketplaceFee'  },
    { label: 'LP Share',             key: 'lpReward',   current: lpBps,        fn: 'setLpShareBps'      },
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

      {/* Surplus Withdrawal */}
      <div>
        <Label>Protocol Surplus -Available: {surplusWei !== undefined ? parseFloat(formatUnits(surplusWei, 18)).toFixed(6) : '…'} ETH</Label>
        <p className="text-xs text-gray-400 mb-2">ETH in Treasury not backing any staker position. Safe to withdraw without affecting the floor.</p>
        <div className="flex gap-2">
          <Input value={inputs.surplusAmt ?? ''} onChange={v => set('surplusAmt', v)} placeholder="ETH amount" className="w-40" />
          <Btn
            onClick={() => write('withdrawSurplus', [parseEther(inputs.surplusAmt ?? '0')])}
            disabled={!inputs.surplusAmt || !surplusWei || surplusWei === 0n || isPending || isConfirming}
            variant="danger"
          >Withdraw</Btn>
        </div>
      </div>

      {/* Fee Withdrawal */}
      <div>
        <Label>Withdraw Fees -Accumulated: {accFees ? parseFloat(formatUnits(accFees, 18)).toFixed(6) : '…'} ETH</Label>
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
          VITE_PINATA_JWT not set -uploads will fail.
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
              <Label>Metadata CID -use this in setTokenCID / setContractCID</Label>
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
// MARKETPLACE TAB
// ─────────────────────────────────────────────────────────────────────────────
function MarketplaceTab() {
  const { writeContract, hash, isPending, isConfirming, isConfirmed, writeError } = useWrite();
  const [inputs, setInputs] = useState({});
  const set = (key, val) => setInputs(i => ({ ...i, [key]: val }));

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: ADDRESSES.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'router'       },
      { address: ADDRESSES.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'relay'        },
      { address: ADDRESSES.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'farmToken'    },
      { address: ADDRESSES.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'feeCollector' },
      { address: ADDRESSES.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'paused'       },
    ],
  });

  const [routerAddr, relayAddr, farmAddr, feeAddr, paused] = data?.map(d => d?.result) ?? [];

  const write = (fn, args) => writeContract({ address: ADDRESSES.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: fn, args });

  const addrRows = [
    { label: 'Router',        key: 'router',  current: routerAddr, fn: 'setRouter',       hint: 'DEX Router. If unset, producer tokens released by Treasury on redemption are stranded in Marketplace with no swap path -producer never receives ETH.' },
    { label: 'Relay',         key: 'relay',   current: relayAddr,  fn: 'setRelay',        hint: 'Quantum messaging relay. If unset, redemption attestations are silently skipped (best-effort -does not revert). Also required for subsidy deposits at listing creation.' },
    { label: "Gov't Token",   key: 'farm',    current: farmAddr,   fn: 'setFarmToken',    hint: '$FARM governance token. If unset, createListing with subsidyCount > 0 reverts. Listings with subsidyCount = 0 are unaffected.' },
    { label: 'Fee Collector', key: 'fee',     current: feeAddr,    fn: 'setFeeCollector', hint: 'Treasury address. If unset or wrong, onRedeem() calls revert and no redemptions can complete.' },
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

      <div>
        <Label>Contract Addresses</Label>
        <div className="space-y-2">
          {addrRows.map(row => (
            <div key={row.key} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-28 shrink-0 flex items-center gap-1">
                {row.label}
                {row.hint && <Hint text={row.hint} />}
              </span>
              <div className="w-36 shrink-0 min-w-0"><CopyAddr address={row.current} /></div>
              <Input value={inputs[row.key] ?? ''} onChange={v => set(row.key, v)} placeholder="0x…" className="flex-1" />
              <Btn onClick={() => write(row.fn, [inputs[row.key]])} disabled={!inputs[row.key] || isPending || isConfirming}>Set</Btn>
            </div>
          ))}
        </div>
      </div>

      <TxStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} error={writeError} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RELAY TAB
// ─────────────────────────────────────────────────────────────────────────────
function RelayTab() {
  const { writeContract, hash, isPending, isConfirming, isConfirmed, writeError } = useWrite();
  const [inputs, setInputs] = useState({});
  const set = (key, val) => setInputs(i => ({ ...i, [key]: val }));

  const enabled = !!ADDRESSES.RELAY;

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: ADDRESSES.RELAY,    abi: RELAY_ABI,    functionName: 'treasury'    },
      { address: ADDRESSES.RELAY,    abi: RELAY_ABI,    functionName: 'feeToken'    },
      { address: ADDRESSES.RELAY,    abi: RELAY_ABI,    functionName: 'quantumFee'  },
      { address: ADDRESSES.RELAY,    abi: RELAY_ABI,    functionName: 'marketplace' },
      { address: ADDRESSES.RELAY,    abi: RELAY_ABI,    functionName: 'dexPair'     },
      { address: ADDRESSES.RELAY,    abi: RELAY_ABI,    functionName: 'paused'      },
      { address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'trustedRelay' },
      { address: ADDRESSES.RELAY,    abi: RELAY_ABI,    functionName: 'ethFee'         },
      { address: ADDRESSES.RELAY,    abi: RELAY_ABI,    functionName: 'ethFeePlainText' },
    ],
    query: { enabled },
  });

  const [treasuryAddr, feeTokenAddr, quantumFee, marketplaceAddr, dexPairAddr, paused, trustedRelayAddr, ethFee, ethFeePlainText] =
    data?.map(d => d?.result) ?? [];

  const ZERO = '0x0000000000000000000000000000000000000000';
  const isSet    = addr => !!addr && addr.toLowerCase() !== ZERO;
  const matches  = (addr, expected) => !!addr && !!expected && addr.toLowerCase() === expected.toLowerCase();


  const writeRelay    = (fn, args) => writeContract({ address: ADDRESSES.RELAY,    abi: RELAY_ABI,    functionName: fn, args });
  const writeTreasury = (fn, args) => writeContract({ address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: fn, args });

  const addrRows = [
    { label: 'Treasury',    key: 'treasury',    current: treasuryAddr,    fn: 'setTreasury',    target: 'relay',    ok: matches(treasuryAddr, ADDRESSES.TREASURY),  hint: 'Must match the Treasury proxy. Required for attestation lookups and ETH fee forwarding.' },
    { label: 'Marketplace', key: 'marketplace', current: marketplaceAddr, fn: 'setMarketplace', target: 'relay',    ok: isSet(marketplaceAddr),                      hint: 'Required for subsidy charging on redemptions when quantumFee > 0.' },
    { label: 'Trusted Relay (Treasury)', key: 'trustedRelay', current: trustedRelayAddr, fn: 'setTrustedRelay', target: 'treasury', ok: matches(trustedRelayAddr, ADDRESSES.RELAY), hint: 'Set on Treasury so the Relay is authorised to call it. Required before messages can be sent.' },
    { label: 'DEX Pair',    key: 'dexPair',     current: dexPairAddr,     fn: 'setDexPair',     target: 'relay',    ok: isSet(dexPairAddr),                           hint: 'BEER/WETH pair used to price $QUANTUM fees in ETH. Required only when quantumFee > 0.' },
  ];

  if (!enabled) {
    return (
      <div className="py-8 text-center text-gray-400 text-sm">
        <p className="font-mono">VITE_RELAY not set</p>
        <p className="mt-1 text-xs">Deploy the Relay proxy and add its address to .env</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${paused ? 'bg-red-400' : 'bg-hub-green'}`} />
          <span className="text-xs font-medium text-gray-500">{paused ? 'Paused' : 'Active'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Btn onClick={() => refetch()} variant="ghost"><RefreshCw size={12} /></Btn>
          <Btn onClick={() => writeRelay(paused ? 'unpause' : 'pause', [])} variant={paused ? 'primary' : 'danger'}>
            {paused ? 'Unpause' : 'Pause'}
          </Btn>
        </div>
      </div>

      <div>
        <Label>Contract Addresses</Label>
        <div className="space-y-2">
          {addrRows.map(row => (
            <div key={row.key} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-44 shrink-0 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.ok ? 'bg-hub-green' : 'bg-red-400'}`} />
                {row.label}
                {row.hint && <Hint text={row.hint} />}
              </span>
              <div className="w-36 shrink-0 min-w-0"><CopyAddr address={row.current} /></div>
              <Input value={inputs[row.key] ?? ''} onChange={v => set(row.key, v)} placeholder="0x…" className="flex-1" />
              <Btn
                onClick={() => row.target === 'treasury'
                  ? writeTreasury(row.fn, [inputs[row.key]])
                  : writeRelay(row.fn, [inputs[row.key]])
                }
                disabled={!inputs[row.key] || isPending || isConfirming}
              >Set</Btn>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Quantum Fee</Label>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-gray-500 w-44 shrink-0 flex items-center gap-1">
            Fee Token
            <Hint text="$QUANTUM token address. Leave unset until $QUANTUM is deployed -relay operates fee-free." />
          </span>
          <div className="w-36 shrink-0 min-w-0"><CopyAddr address={feeTokenAddr} /></div>
          <Input value={inputs.feeToken ?? ''} onChange={v => set('feeToken', v)} placeholder="0x…" className="flex-1" />
          <Btn onClick={() => writeRelay('setFeeToken', [inputs.feeToken])} disabled={!inputs.feeToken || isPending || isConfirming}>Set</Btn>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-44 shrink-0 flex items-center gap-1">
            Fee (token units)
            <Hint text="Amount of $QUANTUM burned per message. Set to 0 to operate fee-free. Uses 18 decimals -enter full units (e.g. 1 = 1e18 internally)." />
          </span>
          <span className="text-xs font-mono text-gray-400 w-36 shrink-0">
            {quantumFee !== undefined ? formatUnits(quantumFee, 18) : '…'}
          </span>
          <Input value={inputs.quantumFee ?? ''} onChange={v => set('quantumFee', v)} placeholder="e.g. 1.0" className="flex-1" />
          <Btn onClick={() => writeRelay('setQuantumFee', [parseEther(inputs.quantumFee || '0')])} disabled={!inputs.quantumFee || isPending || isConfirming}>Set</Btn>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-44 shrink-0 flex items-center gap-1">
            ETH Fee (fixed)
            <Hint text="Fixed ETH fee per quantum message sent to Treasury. Overrides DEX spot price. Set to 0 to disable ETH path and use $QUANTUM burn only. Enter in ETH (e.g. 0.001)." />
          </span>
          <span className="text-xs font-mono text-gray-400 w-36 shrink-0">
            {ethFee !== undefined ? `${formatUnits(ethFee, 18)} ETH` : '…'}
          </span>
          <Input value={inputs.ethFee ?? ''} onChange={v => set('ethFee', v)} placeholder="e.g. 0.001" className="flex-1" />
          <Btn onClick={() => writeRelay('setEthFee', [parseEther(inputs.ethFee || '0')])} disabled={!inputs.ethFee || isPending || isConfirming}>Set</Btn>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-44 shrink-0 flex items-center gap-1">
            Plaintext ETH Fee
            <Hint text="ETH fee per non-quantum (plaintext) message. Set to 0 to allow free plaintext messages. Applies to sendMessage, sendDeliveryMessage, and sendGroupMessage when quantumReady=false. Enter in ETH (e.g. 0.0001)." />
          </span>
          <span className="text-xs font-mono text-gray-400 w-36 shrink-0">
            {ethFeePlainText !== undefined ? `${formatUnits(ethFeePlainText, 18)} ETH` : '…'}
          </span>
          <Input value={inputs.ethFeePlainText ?? ''} onChange={v => set('ethFeePlainText', v)} placeholder="e.g. 0.0001" className="flex-1" />
          <Btn onClick={() => writeRelay('setEthFeePlainText', [parseEther(inputs.ethFeePlainText || '0')])} disabled={!inputs.ethFeePlainText || isPending || isConfirming}>Set</Btn>
        </div>
      </div>

      <div>
        <Label>Exempt Wallets (fee-free)</Label>
        <div className="flex items-center gap-3">
          <Input value={inputs.exemptWallet ?? ''} onChange={v => set('exemptWallet', v)} placeholder="0x… wallet address" className="flex-1" />
          <Btn onClick={() => writeRelay('setQuantumFreeRecipient', [inputs.exemptWallet, true])}  disabled={!inputs.exemptWallet || isPending || isConfirming}>Exempt</Btn>
          <Btn onClick={() => writeRelay('setQuantumFreeRecipient', [inputs.exemptWallet, false])} disabled={!inputs.exemptWallet || isPending || isConfirming} variant="danger">Remove</Btn>
        </div>
      </div>

      <TxStatus hash={hash} isConfirming={isConfirming} isConfirmed={isConfirmed} error={writeError} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { open }               = useAppKit();
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState('Map');

  const { data: owner } = useReadContract({
    address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'owner',
    query: { enabled: !!isConnected },
  });

  const isOwner = owner && address && owner.toLowerCase() === address.toLowerCase();

  const dotHashes = useCodeHashes(isConnected);

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

  const tabIcons = { Map: <Network size={14} />, Collections: <FileCode size={14} />, Tokens: <Settings size={14} />, Treasury: <Settings size={14} />, Marketplace: <Settings size={14} />, Relay: <Settings size={14} />, Upload: <Upload size={14} /> };

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
              ['Relay',          ADDRESSES.RELAY,          'RELAY'],
              ['Router',         ADDRESSES.ROUTER,         'ROUTER'],
              ['DEX Factory',    ADDRESSES.FACTORY,        'FACTORY'],
              ['Token Deployer', ADDRESSES.TOKEN_DEPLOYER, 'TOKEN_DEPLOYER'],
              ['NFT Deployer',   ADDRESSES.NFT_DEPLOYER,   'NFT_DEPLOYER'],
            ].map(([label, addr, vKey]) => (
              <React.Fragment key={label}>
                <span className="text-xs font-black uppercase tracking-widest text-gray-400 whitespace-nowrap self-center flex items-center">
                  <CodeHashDot hashes={dotHashes} addrKey={vKey} />{label}
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
            {activeTab === 'Map'         && <MapTab />}
            {activeTab === 'Collections' && <CollectionsTab />}
            {activeTab === 'Tokens'      && <TokensTab />}
            {activeTab === 'Treasury'    && <TreasuryTab />}
            {activeTab === 'Marketplace' && <MarketplaceTab />}
            {activeTab === 'Relay'       && <RelayTab />}
            {activeTab === 'Upload'      && <UploadTab />}
          </div>
        </div>

      </div>
    </div>
  );
}
