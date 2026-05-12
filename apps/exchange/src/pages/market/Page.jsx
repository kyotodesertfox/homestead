import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Info, Plus, X, ImagePlus, Copy, CheckCheck, Upload, ArrowRight, PackagePlus } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { ADDRESSES, MARKETPLACE_ABI, NFT_ABI, BEER_TOKEN_ABI } from '../../contracts';

// ─── IPFS ────────────────────────────────────────────────────────────────────
const IPFS_GW    = 'https://ipfs.io/ipfs/';
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const resolveIpfs = (uri) => uri?.startsWith('ipfs://') ? uri.replace('ipfs://', IPFS_GW) : uri;

async function fetchStyle(tokenUri) {
  try {
    const meta = await fetch(resolveIpfs(tokenUri)).then(r => r.json());
    return meta?.attributes?.find(a => a.trait_type === 'Style')?.value ?? null;
  } catch { return null; }
}

function toWebP(file, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error('WebP conversion failed'));
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
      }, 'image/webp', quality);
    };
    img.onerror = () => reject(new Error('Could not load image for conversion'));
    img.src = URL.createObjectURL(file);
  });
}

async function pinFile(file) {
  const webp = await toWebP(file);
  const form = new FormData();
  form.append('file', webp);
  form.append('pinataMetadata', JSON.stringify({ name: webp.name }));
  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Image upload failed: ${res.statusText}`);
  const { IpfsHash } = await res.json();
  return IpfsHash;
}

async function pinJson(obj, name) {
  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinataContent: obj, pinataMetadata: { name } }),
  });
  if (!res.ok) throw new Error(`Metadata upload failed: ${res.statusText}`);
  const { IpfsHash } = await res.json();
  return IpfsHash;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ZERO = '0x0000000000000000000000000000000000000000';
const tokenLabel = (addr) => {
  if (!addr) return '?';
  if (addr.toLowerCase() === ADDRESSES.BEER_TOKEN?.toLowerCase()) return 'BEER';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};

// ─── Unified Create Listing Modal (two-step) ──────────────────────────────────
// Step 0 — metadata builder (shown when no styles exist, or user wants a new one)
// Step 1 — listing form    (shown once a style is ready)
function CreateListingModal({ onClose, onCreated, knownStyles, onStyleResolved }) {
  const { address } = useAccount();

  // Start on step 0 if no styles have been minted yet
  const [step, setStep] = useState(knownStyles.length === 0 ? 0 : 1);

  // ── Step 0 state ────────────────────────────────────────────────────────────
  const [name,    setName]    = useState('');
  const [style,   setStyle]   = useState('');
  const [desc,    setDesc]    = useState('');
  const [abv,     setAbv]     = useState('');
  const [ibu,     setIbu]     = useState('');
  const [image,   setImage]   = useState(null);
  const [preview, setPreview] = useState(null);
  const [upStatus, setUpStatus] = useState(null); // null|'image'|'meta'|'done'|'error'
  const [ipfsUri, setIpfsUri]   = useState('');
  const [upErr,   setUpErr]     = useState('');
  const [copied,  setCopied]    = useState(false);
  const [showSugg0, setShowSugg0] = useState(false);
  const fileRef = useRef(null);

  // ── Step 1 state ────────────────────────────────────────────────────────────
  const [listingStyle, setListingStyle] = useState('');
  const [showSugg1,    setShowSugg1]    = useState(false);

  const allStyles = [...new Set([...knownStyles, ...(style ? [style] : [])])].sort();
  const filtered0 = style       ? allStyles.filter(s => s.toLowerCase().includes(style.toLowerCase()))       : allStyles;
  const filtered1 = listingStyle ? allStyles.filter(s => s.toLowerCase().includes(listingStyle.toLowerCase())) : allStyles;

  const { writeContract, data: txHash, isPending, error: txError } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: !!txHash } });

  useEffect(() => {
    if (!isSuccess) return;
    onCreated?.();
    onClose();
  }, [isSuccess]);

  // ── Metadata upload ─────────────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!image || !name.trim() || !style.trim()) return;
    setUpErr('');
    try {
      setUpStatus('image');
      const imageCid = await pinFile(image);

      setUpStatus('meta');
      const attributes = [
        { trait_type: 'Style', value: style.trim() },
        ...(abv ? [{ trait_type: 'ABV', value: parseFloat(abv), display_type: 'number' }] : []),
        ...(ibu ? [{ trait_type: 'IBU', value: parseInt(ibu),   display_type: 'number' }] : []),
      ];
      const metadata = {
        name:        name.trim(),
        description: desc.trim(),
        image:       `ipfs://${imageCid}`,
        attributes,
      };
      const metaCid = await pinJson(metadata, `${name.trim().replace(/\s+/g, '-').toLowerCase()}.json`);
      const uri = `ipfs://${metaCid}`;

      setIpfsUri(uri);
      setUpStatus('done');
      onStyleResolved?.(style.trim());
      // Pre-fill the listing style and advance
      setListingStyle(style.trim());
    } catch (e) {
      setUpErr(e.message);
      setUpStatus('error');
    }
  };

  const copyUri = () => {
    navigator.clipboard?.writeText(ipfsUri).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const uploadBusy = upStatus === 'image' || upStatus === 'meta';
  const uploadLabel = upStatus === 'image' ? 'Uploading image…' : upStatus === 'meta' ? 'Pinning metadata…' : 'Upload to IPFS';

  // ── Listing submit ──────────────────────────────────────────────────────────
  const handleCreate = () => {
    if (!listingStyle.trim() || !address) return;
    writeContract({
      address: ADDRESSES.MARKETPLACE,
      abi:     MARKETPLACE_ABI,
      functionName: 'createListing',
      args: [ADDRESSES.BEER_NFT, ADDRESSES.BEER_TOKEN, parseUnits('1', 18), address],
    });
  };

  // ── Step labels ─────────────────────────────────────────────────────────────
  const steps = ['Prepare Metadata', 'Create Listing'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-hub-dark rounded-3xl w-full max-w-lg border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            {steps.map((label, i) => (
              <React.Fragment key={i}>
                <button
                  onClick={() => { if (i === 1 && allStyles.length > 0) setStep(1); if (i === 0) setStep(0); }}
                  className={`text-xs font-black uppercase tracking-widest transition-colors ${
                    step === i ? 'text-hub-green' : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  {label}
                </button>
                {i < steps.length - 1 && <span className="text-white/20 text-xs">›</span>}
              </React.Fragment>
            ))}
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-8 pb-8 flex-1">

          {/* ── Step 0: Metadata Builder ─────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-4">

              {!PINATA_JWT && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-400 text-xs font-medium">
                  Add <code className="font-mono bg-white/10 px-1 rounded">VITE_PINATA_JWT</code> to <code className="font-mono bg-white/10 px-1 rounded">.env.local</code> to enable uploads.
                </div>
              )}

              {/* Image */}
              <div>
                <label className="block text-white/60 text-xs font-black uppercase tracking-widest mb-1.5">Label Image</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative w-full h-40 rounded-xl border-2 border-dashed border-white/20 hover:border-hub-green flex items-center justify-center cursor-pointer overflow-hidden transition-colors group"
                >
                  {preview
                    ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
                    : (
                      <div className="flex flex-col items-center gap-2 text-white/30 group-hover:text-hub-green transition-colors">
                        <ImagePlus size={32} />
                        <span className="text-xs font-bold uppercase tracking-widest">Click to upload</span>
                      </div>
                    )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>

              {/* Name */}
              <div>
                <label className="block text-white/60 text-xs font-black uppercase tracking-widest mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  placeholder="Homestead West Coast IPA"
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-hub-green placeholder:text-white/30"
                />
              </div>

              {/* Style */}
              <div className="relative">
                <label className="block text-white/60 text-xs font-black uppercase tracking-widest mb-1.5">Style</label>
                <input
                  type="text"
                  value={style}
                  placeholder="West Coast IPA"
                  onChange={e => { setStyle(e.target.value); setShowSugg0(true); }}
                  onFocus={() => setShowSugg0(true)}
                  onBlur={() => setTimeout(() => setShowSugg0(false), 150)}
                  className="w-full bg-white/10 text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-hub-green placeholder:text-white/30"
                />
                {showSugg0 && filtered0.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-gray-900 border border-white/10 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                    {filtered0.map(s => (
                      <li key={s} onMouseDown={() => { setStyle(s); setShowSugg0(false); }}
                        className="px-4 py-2.5 text-sm text-white/80 hover:bg-hub-green hover:text-white cursor-pointer font-medium">
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-white/60 text-xs font-black uppercase tracking-widest mb-1.5">Description</label>
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Tasting notes, ingredients, story…"
                  rows={3}
                  className="w-full bg-white/10 text-white rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-hub-green resize-none placeholder:text-white/30"
                />
              </div>

              {/* ABV + IBU */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/60 text-xs font-black uppercase tracking-widest mb-1.5">ABV %</label>
                  <input type="number" min="0" max="99" step="0.1" placeholder="6.5" value={abv}
                    onChange={e => setAbv(e.target.value)}
                    className="w-full bg-white/10 text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-hub-green [appearance:textfield] placeholder:text-white/30" />
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-black uppercase tracking-widest mb-1.5">IBU</label>
                  <input type="number" min="0" step="1" placeholder="65" value={ibu}
                    onChange={e => setIbu(e.target.value)}
                    className="w-full bg-white/10 text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-hub-green [appearance:textfield] placeholder:text-white/30" />
                </div>
              </div>

              {upErr && <p className="text-red-400 text-xs font-medium">{upErr}</p>}

              {/* Result */}
              {upStatus === 'done' && ipfsUri && (
                <div className="bg-hub-green/10 border border-hub-green/30 rounded-xl px-4 py-3">
                  <p className="text-hub-green text-[10px] font-black uppercase tracking-widest mb-1.5">IPFS URI — use this when minting</p>
                  <div className="flex items-center gap-2">
                    <code className="text-white text-[11px] font-mono break-all flex-1">{ipfsUri}</code>
                    <button onClick={copyUri} className="text-white/50 hover:text-hub-green shrink-0 transition-colors">
                      {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleUpload}
                  disabled={!image || !name.trim() || !style.trim() || !PINATA_JWT || uploadBusy}
                  className="flex-1 py-3.5 rounded-xl bg-hub-green text-white font-black uppercase tracking-widest text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <Upload size={15} strokeWidth={3} />
                  {uploadLabel}
                </button>
                {/* Skip to listing form if styles already exist */}
                {allStyles.length > 0 && (
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-3.5 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 font-black uppercase tracking-widest text-xs transition-all flex items-center gap-1.5"
                  >
                    Skip <ArrowRight size={13} strokeWidth={3} />
                  </button>
                )}
              </div>

              {upStatus === 'done' && (
                <button
                  onClick={() => setStep(1)}
                  className="w-full py-3 rounded-xl border border-hub-green text-hub-green font-black uppercase tracking-widest text-sm hover:bg-hub-green hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  Continue to Listing <ArrowRight size={15} strokeWidth={3} />
                </button>
              )}
            </div>
          )}

          {/* ── Step 1: Listing Form ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">

              {/* Style with autocomplete */}
              <div className="relative">
                <label className="block text-white/60 text-xs font-black uppercase tracking-widest mb-1.5">Beer Style</label>
                <input
                  type="text"
                  value={listingStyle}
                  placeholder="e.g. West Coast IPA"
                  onChange={e => { setListingStyle(e.target.value); setShowSugg1(true); }}
                  onFocus={() => setShowSugg1(true)}
                  onBlur={() => setTimeout(() => setShowSugg1(false), 150)}
                  className="w-full bg-white/10 text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-hub-green placeholder:text-white/30"
                />
                {showSugg1 && filtered1.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-gray-900 border border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {filtered1.map(s => (
                      <li key={s} onMouseDown={() => { setListingStyle(s); setShowSugg1(false); }}
                        className="px-4 py-2.5 text-sm text-white/80 hover:bg-hub-green hover:text-white cursor-pointer font-medium">
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => setStep(0)}
                  className="mt-1.5 text-white/30 hover:text-hub-green text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  + Prepare metadata for a new style
                </button>
              </div>

              {/* Fixed details */}
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40 font-bold uppercase tracking-widest">Collection</span>
                  <span className="text-white/60 font-mono">{ADDRESSES.BEER_NFT?.slice(0, 10)}…</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40 font-bold uppercase tracking-widest">Price</span>
                  <span className="text-amber-400 font-black">1 BEER</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40 font-bold uppercase tracking-widest">Proceeds</span>
                  <span className="text-white/60 font-mono">{address?.slice(0, 10)}…</span>
                </div>
              </div>

              {txError && (
                <p className="text-red-400 text-xs font-medium">{txError.shortMessage ?? txError.message}</p>
              )}

              <button
                onClick={handleCreate}
                disabled={!listingStyle.trim() || isPending}
                className="w-full py-3.5 rounded-xl bg-hub-green text-white font-black uppercase tracking-widest text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                {isPending ? 'Creating…' : 'Create Listing'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Stock Modal ─────────────────────────────────────────────────────────────
// Walks owner through: mintBatch → setApprovalForAll → depositInventory
function StockModal({ listingId, onClose, onStocked }) {
  const { address } = useAccount();

  const [cid,      setCid]      = useState('');
  const [qty,      setQty]      = useState('');
  const [phase,    setPhase]    = useState('mint'); // 'mint'|'approve'|'deposit'|'done'
  const [mintedIds, setMintedIds] = useState(null); // [startId, startId+1, ...]
  const [err,      setErr]      = useState('');

  // Read nextTokenId before minting so we can derive IDs after
  const { data: nextTokenId, refetch: refetchNextId } = useReadContract({
    address: ADDRESSES.BEER_NFT,
    abi:     NFT_ABI,
    functionName: 'nextTokenId',
    query:   { enabled: !!ADDRESSES.BEER_NFT },
  });

  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: ADDRESSES.BEER_NFT,
    abi:     NFT_ABI,
    functionName: 'isApprovedForAll',
    args:    [address ?? ZERO, ADDRESSES.MARKETPLACE],
    query:   { enabled: !!address },
  });

  const { writeContract, data: txHash, isPending, error: writeErr } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: !!txHash } });

  useEffect(() => { if (writeErr) setErr(writeErr.shortMessage ?? writeErr.message); }, [writeErr]);

  useEffect(() => {
    if (!isSuccess) return;
    setErr('');
    if (phase === 'mint') {
      // Compute minted IDs from the pre-mint nextTokenId snapshot
      const start = Number(nextTokenId ?? 0);
      const count = Number(qty);
      setMintedIds(Array.from({ length: count }, (_, i) => BigInt(start + i)));
      if (isApproved) {
        setPhase('deposit');
      } else {
        refetchApproval();
        setPhase('approve');
      }
    } else if (phase === 'approve') {
      refetchApproval();
      setPhase('deposit');
    } else if (phase === 'deposit') {
      onStocked?.();
      setPhase('done');
    }
  }, [isSuccess]);

  const rawCid = cid.trim().replace(/^ipfs:\/\//, '');
  const count  = parseInt(qty);
  const canMint = rawCid && count > 0 && !isPending;

  const handleMint = async () => {
    setErr('');
    await refetchNextId(); // snapshot before writing
    const cids = Array(count).fill(rawCid);
    writeContract({
      address: ADDRESSES.BEER_NFT,
      abi:     NFT_ABI,
      functionName: 'mintBatch',
      args:    [address, cids],
    });
  };

  const handleApprove = () => {
    writeContract({
      address: ADDRESSES.BEER_NFT,
      abi:     NFT_ABI,
      functionName: 'setApprovalForAll',
      args:    [ADDRESSES.MARKETPLACE, true],
    });
  };

  const handleDeposit = () => {
    writeContract({
      address: ADDRESSES.MARKETPLACE,
      abi:     MARKETPLACE_ABI,
      functionName: 'depositInventory',
      args:    [BigInt(listingId), mintedIds],
    });
  };

  const phaseLabel = { mint: '1 / 3', approve: '2 / 3', deposit: '3 / 3', done: 'Done' };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-hub-dark rounded-3xl p-8 w-full max-w-md border border-white/10 shadow-2xl">

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white font-black text-xl uppercase tracking-tight">Stock Listing #{listingId}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-6">{phaseLabel[phase]}</p>

        <div className="space-y-4">

          {phase === 'mint' && (
            <>
              <div>
                <label className="block text-white/60 text-xs font-black uppercase tracking-widest mb-1.5">Metadata CID</label>
                <input
                  type="text"
                  value={cid}
                  placeholder="ipfs://Qm… or just the CID"
                  onChange={e => setCid(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-xl px-4 py-3 text-xs font-mono outline-none focus:ring-2 focus:ring-hub-green placeholder:text-white/30"
                />
                <p className="text-white/30 text-[10px] mt-1.5 font-medium">Copy from the IPFS URI shown after metadata upload</p>
              </div>
              <div>
                <label className="block text-white/60 text-xs font-black uppercase tracking-widest mb-1.5">Quantity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 24"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-hub-green [appearance:textfield] placeholder:text-white/30"
                />
              </div>
              {err && <p className="text-red-400 text-xs">{err}</p>}
              <button
                onClick={handleMint}
                disabled={!canMint}
                className="w-full py-3.5 rounded-xl bg-hub-green text-white font-black uppercase tracking-widest text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                {isPending ? 'Minting…' : `Mint ${count > 0 ? count : ''} NFT${count !== 1 ? 's' : ''}`}
              </button>
            </>
          )}

          {phase === 'approve' && (
            <>
              <p className="text-white/60 text-sm font-medium">Approve the Marketplace to transfer your NFTs into listing custody.</p>
              {err && <p className="text-red-400 text-xs">{err}</p>}
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="w-full py-3.5 rounded-xl bg-hub-green text-white font-black uppercase tracking-widest text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                {isPending ? 'Approving…' : 'Approve Marketplace'}
              </button>
            </>
          )}

          {phase === 'deposit' && mintedIds && (
            <>
              <p className="text-white/60 text-sm font-medium">
                Deposit <span className="text-white font-black">{mintedIds.length} NFT{mintedIds.length !== 1 ? 's' : ''}</span> (IDs {Number(mintedIds[0])}–{Number(mintedIds[mintedIds.length - 1])}) into listing #{listingId}.
              </p>
              {err && <p className="text-red-400 text-xs">{err}</p>}
              <button
                onClick={handleDeposit}
                disabled={isPending}
                className="w-full py-3.5 rounded-xl bg-hub-green text-white font-black uppercase tracking-widest text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                {isPending ? 'Depositing…' : 'Deposit to Listing'}
              </button>
            </>
          )}

          {phase === 'done' && (
            <>
              <p className="text-hub-green font-black text-sm uppercase tracking-widest">Listing stocked successfully.</p>
              <button onClick={onClose} className="w-full py-3.5 rounded-xl bg-hub-green text-white font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all">
                Close
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({ id, onStyleResolved, isOwner }) {
  const { address } = useAccount();
  const [style,     setStyle]     = useState(null);
  const [showStock, setShowStock] = useState(false);

  const { data: inventory } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'getInventory',
    args:    [BigInt(id)],
    query:   { enabled: !!ADDRESSES.MARKETPLACE },
  });

  const firstTokenId = inventory?.[0];
  const { data: tokenUri } = useReadContract({
    address: ADDRESSES.BEER_NFT,
    abi:     NFT_ABI,
    functionName: 'tokenURI',
    args:    [firstTokenId],
    query:   { enabled: firstTokenId != null },
  });

  useEffect(() => {
    if (!tokenUri) return;
    fetchStyle(tokenUri).then(s => {
      if (!s) return;
      setStyle(s);
      onStyleResolved?.(s);
    });
  }, [tokenUri]);

  const { data: allowance, refetch: refetchAllow } = useReadContract({
    address: ADDRESSES.BEER_TOKEN,
    abi:     BEER_TOKEN_ABI,
    functionName: 'allowance',
    args:    [address ?? ZERO, ADDRESSES.MARKETPLACE],
    query:   { enabled: !!address },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: !!txHash } });
  useEffect(() => { if (isSuccess) refetchAllow(); }, [isSuccess]);

  const { data: listing, refetch: refetchListing } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'getListing',
    args:    [BigInt(id)],
    query:   { enabled: !!ADDRESSES.MARKETPLACE },
  });

  if (!listing) return null;
  const [, paymentToken, price, , inventoryCount, active] = listing;
  if (!active) return null;

  const label    = style ?? (inventoryCount > 0n ? 'Loading…' : 'Beer NFT');
  const token    = tokenLabel(paymentToken);
  const priceStr = price != null ? formatUnits(price, 18) : '—';
  const inStock  = inventoryCount != null && inventoryCount > 0n;
  const approved = allowance != null && price != null && allowance >= price;

  const handleBuy = () => {
    if (!approved) {
      writeContract({ address: ADDRESSES.BEER_TOKEN, abi: BEER_TOKEN_ABI, functionName: 'approve', args: [ADDRESSES.MARKETPLACE, price] });
    } else {
      writeContract({ address: ADDRESSES.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'buy', args: [BigInt(id)] });
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-hub-green">{token}</span>
            <h3 className="text-gray-900 font-black text-lg mt-0.5 leading-tight">{label}</h3>
          </div>
          <span className="text-xs font-black uppercase bg-hub-green/10 text-hub-green px-2.5 py-1 rounded-lg shrink-0">
            #{id}
          </span>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Price</p>
            <p className="text-gray-900 font-black text-sm">{priceStr} {token}</p>
          </div>
          <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">In Stock</p>
            <p className="text-gray-900 font-black text-sm">{inventoryCount?.toString() ?? '—'}</p>
          </div>
        </div>
        {isOwner ? (
          <button
            onClick={() => setShowStock(true)}
            className="w-full py-2.5 rounded-xl border-2 border-hub-green text-hub-green font-black uppercase tracking-widest text-xs hover:bg-hub-green hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <PackagePlus size={13} strokeWidth={3} />
            {inStock ? 'Add Stock' : 'Stock Listing'}
          </button>
        ) : address ? (
          <button
            onClick={handleBuy}
            disabled={!inStock || isPending}
            className="w-full py-2.5 rounded-xl bg-hub-green text-white font-black uppercase tracking-widest text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all"
          >
            {!inStock ? 'Sold Out' : isPending ? 'Pending…' : !approved ? 'Approve & Buy' : 'Buy'}
          </button>
        ) : (
          <div className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-400 font-black uppercase tracking-widest text-xs text-center">
            Connect Wallet
          </div>
        )}
      </div>

      {showStock && (
        <StockModal
          listingId={id}
          onClose={() => setShowStock(false)}
          onStocked={() => { refetchListing(); setShowStock(false); }}
        />
      )}
    </>
  );
}

// ─── Market Page ──────────────────────────────────────────────────────────────
export default function MarketPage() {
  const { address } = useAccount();
  const [showCreate,  setShowCreate]  = useState(false);
  const [knownStyles, setKnownStyles] = useState([]);

  const { data: ownerAddr } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'owner',
    query: { enabled: !!ADDRESSES.MARKETPLACE },
  });

  const { data: nextId, refetch: refetchCount } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'nextListingId',
    query: { enabled: !!ADDRESSES.MARKETPLACE },
  });

  const isOwner    = !!(address && ownerAddr && address.toLowerCase() === ownerAddr.toLowerCase());
  const listingIds = nextId != null ? Array.from({ length: Number(nextId) }, (_, i) => i) : [];
  const addStyle   = (s) => setKnownStyles(prev => prev.includes(s) ? prev : [...prev, s].sort());

  return (
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto">

        <header className="mb-12 border-b-8 border-hub-green pb-6 flex flex-col md:flex-row justify-between items-end gap-3">
          <div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
              Homestead <span className="text-hub-green">Market</span>
            </h1>
            <p className="text-gray-600 font-bold mt-2 uppercase tracking-widest text-sm italic">
              All Active Listings
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 md:mt-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-hub-green text-white font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shrink-0"
            >
              <Plus size={16} strokeWidth={3} />
              Create Listing
            </button>
          )}
        </header>

        {listingIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 max-w-lg w-full shadow-sm">
              <ShoppingBag size={48} className="text-hub-green mx-auto mb-6 opacity-40" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-3">No Listings Yet</h2>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                No active listings found. Check back soon.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {listingIds.map(id => (
              <ListingCard key={id} id={id} onStyleResolved={addStyle} isOwner={isOwner} />
            ))}
          </div>
        )}

        <section className="mt-8 bg-white border border-gray-100 rounded-2xl p-5 flex gap-4 items-start shadow-sm">
          <div className="text-hub-green mt-1 shrink-0"><Info size={24} strokeWidth={3} /></div>
          <div>
            <h4 className="text-gray-900 font-black text-sm uppercase tracking-tight">About the Market</h4>
            <p className="text-gray-500 text-xs mt-1 leading-relaxed font-medium">
              Producers purchase inventory NFTs from the Treasury, then list them here for
              $BEER. Buyers pay with tokens; proceeds go directly to the producer wallet.
              A small platform fee (governed by the Treasury) applies to each sale.
            </p>
          </div>
        </section>

      </div>

      {showCreate && (
        <CreateListingModal
          onClose={() => setShowCreate(false)}
          onCreated={refetchCount}
          knownStyles={knownStyles}
          onStyleResolved={addStyle}
        />
      )}
    </div>
  );
}
