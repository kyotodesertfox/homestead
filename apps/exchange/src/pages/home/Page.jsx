import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, BadgeCheck, Users, ShoppingBag, Repeat, ArrowLeftRight, ExternalLink, Wallet, LayoutDashboard, ArrowRight, X } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { formatUnits, decodeEventLog } from 'viem';
import { ADDRESSES, MARKETPLACE_ABI, NFT_ABI, ERC20_ABI, TOKEN_DEPLOYER_ABI, PRICE_EVIDENCE_ABI, PAIR_ABI } from '../../contracts';

let _ethUsdCached = null;
let _ethUsdFetching = false;
function useEthUsd() {
  const [price, setPrice] = useState(_ethUsdCached);
  useEffect(() => {
    if (_ethUsdCached !== null) { setPrice(_ethUsdCached); return; }
    if (_ethUsdFetching) return;
    _ethUsdFetching = true;
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      .then(r => r.json())
      .then(d => { _ethUsdCached = d?.ethereum?.usd ?? null; _ethUsdFetching = false; setPrice(_ethUsdCached); })
      .catch(() => { _ethUsdFetching = false; });
  }, []);
  return price;
}

const EXPLORER = 'https://hekla.taikoscan.io';
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

const HOW_IT_WORKS_STEPS = [
  {
    number: '01',
    title:  'Buy ETH',
    image:  '/onboarding/step-1-buy-eth.png',
    body:   'Start on any major exchange - Coinbase, Kraken, or Binance. Buy a small amount of Ethereum (ETH). You don\'t need much - even $20 is enough to get started.',
    link:   null,
  },
  {
    number: '02',
    title:  'Bridge to Taiko',
    image:  '/onboarding/step-2-bridge.png',
    body:   'Bridging moves your ETH from the main Ethereum network to Taiko - a faster, cheaper layer built on top of it. Think of it like moving money between two bank accounts. It takes about 2 minutes.',
    link:   { label: 'Open Bridge', href: '/bridge', internal: true },
  },
  {
    number: '03',
    title:  'Swap for $EGG',
    image:  '/onboarding/step-3-swap.png',
    body:   'Once your ETH is on Taiko, head to our Swap page and trade a little of it for $EGG or any of our available tokens. $EGG is what you\'ll use to pay the community price at the farm.',
    link:   { label: 'Go to Swap', href: '/swap', internal: true },
  },
  {
    number: '04',
    title:  'Claim Goods',
    image:  '/onboarding/step-4-redeem.png',
    body:   'Use your $EGG tokens to purchase an egg carton NFT from our marketplace. That NFT is your claim - bring it to the farm and redeem it for the real thing. No middleman, no markup.',
    link:   null,
  },
];

function HowItWorksModal({ onClose }) {
  const [step, setStep] = useState(0);
  const s = HOW_IT_WORKS_STEPS[step];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <div>
            <p className="text-hub-green text-[10px] font-black uppercase tracking-widest">How it works</p>
            <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900">{s.title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={20} /></button>
        </div>

        {/* Step counter */}
        <div className="flex gap-1.5 px-6 mb-4">
          {HOW_IT_WORKS_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1 flex-1 rounded-full transition-all ${i === step ? 'bg-hub-green' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {/* Image */}
        <div className="w-full h-52 bg-gray-50 overflow-hidden">
          {s.image && (
            <img
              src={s.image}
              alt={s.title}
              className="w-full h-full object-cover"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-gray-600 text-sm font-medium leading-relaxed mb-5">{s.body}</p>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setStep(i => Math.max(0, i - 1))}
              className={`text-sm font-black uppercase tracking-widest text-gray-400 hover:text-gray-700 transition-colors ${step === 0 ? 'invisible' : ''}`}
            >
              ← Back
            </button>

            <div className="flex items-center gap-3 ml-auto">
              {s.link && (
                s.link.internal
                  ? <Link to={s.link.href} onClick={onClose} className="text-hub-green text-sm font-black uppercase tracking-widest hover:underline underline-offset-2">{s.link.label} →</Link>
                  : <a href={s.link.href} target="_blank" rel="noopener noreferrer" className="text-hub-green text-sm font-black uppercase tracking-widest hover:underline underline-offset-2">{s.link.label} →</a>
              )}
              {step < HOW_IT_WORKS_STEPS.length - 1
                ? <button onClick={() => setStep(i => i + 1)} className="bg-hub-green text-white font-black py-2 px-6 uppercase tracking-widest hover:bg-green-700 transition-all rounded text-sm">Next</button>
                : <button onClick={onClose} className="bg-hub-green text-white font-black py-2 px-6 uppercase tracking-widest hover:bg-green-700 transition-all rounded text-sm">Done</button>
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const IPFS_GW = 'https://ipfs.io/ipfs/';
const resolveIpfs = (uri) => uri?.startsWith('ipfs://') ? uri.replace('ipfs://', IPFS_GW) : uri;
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

async function fetchMeta(tokenUri) {
  try {
    const m = await fetch(resolveIpfs(tokenUri)).then(r => r.json());
    return {
      name:  m?.name  ?? null,
      image: m?.image ? resolveIpfs(m.image) : null,
      style: m?.attributes?.find(a => a.trait_type === 'Style')?.value ?? null,
    };
  } catch { return null; }
}

function PriceEvidenceCard() {
  const { address, isConnected } = useAccount();
  const { open: openWallet }     = useAppKit();
  const [mode, setMode]  = useState('closed'); // 'closed' | 'lightbox' | 'submit'
  const [photo, setPhoto]         = useState(null);
  const [preview, setPreview]     = useState(null);
  const [priceInput, setPriceInput] = useState('');
  const [remarks, setRemarks]     = useState('');
  const [wallet, setWallet]       = useState('');
  const [pinning, setPinning]     = useState(false);
  const [pinError, setPinError]   = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { if (address) setWallet(address); }, [address]);

  const contractAddr = ADDRESSES.PRICE_EVIDENCE;

  const { data: featured }    = useReadContract({ address: contractAddr, abi: PRICE_EVIDENCE_ABI, functionName: 'getFeatured',   query: { enabled: !!contractAddr } });
  const { data: rewardAmt }   = useReadContract({ address: contractAddr, abi: PRICE_EVIDENCE_ABI, functionName: 'rewardAmount',  query: { enabled: !!contractAddr } });
  const { data: minEth }      = useReadContract({ address: contractAddr, abi: PRICE_EVIDENCE_ABI, functionName: 'minEthBalance', query: { enabled: !!contractAddr } });
  const { data: ethBal }      = useBalance({ address, query: { enabled: !!address } });

  const hasFeatured     = featured && featured[0] !== ZERO_ADDR;
  const cashPrice       = hasFeatured ? `$${(Number(featured[2]) / 100).toFixed(2)}` : '$6.19';
  const featuredRemarks = hasFeatured ? featured[3] : null;
  const featuredSub     = hasFeatured ? featured[0] : null;
  const photoUrl        = hasFeatured && featured[1] ? `https://ipfs.io/ipfs/${featured[1]}` : '/store-egg-price.jpg';
  const rewardLabel     = rewardAmt != null ? `${rewardAmt} $EGG` : '$EGG';
  const meetsMinEth     = !minEth || !ethBal || ethBal.value >= minEth;
  const minEthLabel     = minEth ? `${Number(formatUnits(minEth, 18)).toFixed(3)} ETH` : 'ETH';
  const shortAddr       = (a) => a ? `${a.slice(0,6)}...${a.slice(-4)}` : '';

  const { writeContract: writeSubmit, data: submitHash, isPending: submitPending } = useWriteContract();
  const { data: submitReceipt, isSuccess: submitConfirmed } = useWaitForTransactionReceipt({ hash: submitHash });

  useEffect(() => {
    if (!submitConfirmed || !submitReceipt || !address) return;
    for (const log of submitReceipt.logs) {
      try {
        const { args } = decodeEventLog({ abi: PRICE_EVIDENCE_ABI, eventName: 'Submitted', data: log.data, topics: log.topics });
        if (args.submitter?.toLowerCase() === address.toLowerCase())
          localStorage.setItem(`pe_sub_${address}`, args.id.toString());
      } catch {}
    }
  }, [submitConfirmed, submitReceipt, address]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmitEvidence = async () => {
    if (!photo || !priceInput || !wallet || !contractAddr) return;
    setPinning(true);
    setPinError(null);
    try {
      const form = new FormData();
      form.append('file', photo);
      form.append('pinataMetadata', JSON.stringify({
        name: `price-evidence-${Date.now()}`,
        keyvalues: { submittedBy: wallet, claimedPrice: priceInput, source: 'homestead-price-evidence' },
      }));
      const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST', headers: { Authorization: `Bearer ${PINATA_JWT}` }, body: form,
      });
      if (!res.ok) throw new Error('pinata');
      const { IpfsHash } = await res.json();
      writeSubmit({
        address: contractAddr,
        abi: PRICE_EVIDENCE_ABI,
        functionName: 'submit',
        args: [IpfsHash, BigInt(Math.round(parseFloat(priceInput) * 100)), remarks],
      });
    } catch {
      setPinError('Upload failed - check your connection and try again.');
    } finally {
      setPinning(false);
    }
  };

  const handleClose = () => {
    setMode('closed');
    setPhoto(null); setPreview(null); setPriceInput(''); setRemarks(''); setPinError(null);
  };

  return (
    <>
      <button
        onClick={() => setMode('lightbox')}
        className="relative rounded-xl border border-gray-200 shadow-sm text-center w-full hover:shadow-md hover:-translate-y-0.5 transition-all group overflow-hidden"
      >
        {/* Ghost background photo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${photoUrl})` }}
        />
        <div className="absolute inset-0 bg-white/90" />

        {/* Content */}
        <div className="relative z-10 p-6">
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-3">
            {hasFeatured ? 'Cash Price · Community Reported' : 'Cash Price'}
          </p>
          <p className="text-5xl font-black text-gray-500 line-through">{cashPrice}</p>
          {hasFeatured && featuredRemarks && (
            <p className="text-gray-600 text-xs font-medium mt-2">{featuredRemarks}</p>
          )}
          {hasFeatured && (
            <p className="text-gray-500 text-[10px] font-medium mt-2">by {shortAddr(featuredSub)}</p>
          )}
          {!hasFeatured && (
            <p className="text-gray-600 text-xs font-medium mt-3 leading-relaxed">
              Unknown farm.<br />Weeks in transit.
            </p>
          )}
          <p className="text-hub-green text-[10px] font-black uppercase tracking-widest mt-4 group-hover:underline underline-offset-2">
            See evidence →
          </p>
        </div>
      </button>

      {mode !== 'closed' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleClose}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>

            {mode === 'lightbox' && (
              <>
                <img src={photoUrl} alt="Store price evidence" className="w-full object-cover max-h-72" />
                <div className="px-6 py-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      {hasFeatured ? (
                        <>
                          <p className="text-gray-900 font-black text-sm uppercase tracking-widest">{cashPrice} - community reported</p>
                          {featuredRemarks && <p className="text-gray-400 text-xs mt-0.5">{featuredRemarks}</p>}
                          <a href={`${EXPLORER}/address/${featuredSub}`} target="_blank" rel="noopener noreferrer"
                            className="text-hub-green text-xs font-black mt-0.5 hover:underline inline-block">
                            {shortAddr(featuredSub)} earned {rewardLabel} →
                          </a>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-900 font-black text-sm uppercase tracking-widest">Store shelf - $6.19</p>
                          <p className="text-gray-400 text-xs mt-0.5">Free range, 12 large. This is what the supply chain costs you.</p>
                        </>
                      )}
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 ml-4 shrink-0"><X size={20} /></button>
                  </div>
                  <button
                    onClick={() => setMode('submit')}
                    className="w-full py-2.5 px-4 border-2 border-hub-green text-hub-green font-black text-xs uppercase tracking-widest rounded-lg hover:bg-hub-green hover:text-white transition-all"
                  >
                    {hasFeatured ? `Beat this price → earn ${rewardLabel}` : `Submit evidence → earn ${rewardLabel}`}
                  </button>
                </div>
              </>
            )}

            {mode === 'submit' && !submitConfirmed && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-900 font-black text-sm uppercase tracking-widest">Submit Price Evidence</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {hasFeatured ? `Current cash price: ${cashPrice}. Beat it, earn ${rewardLabel}.` : `First approved photo earns ${rewardLabel}.`}
                    </p>
                  </div>
                  <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 ml-4 shrink-0"><X size={20} /></button>
                </div>

                {!isConnected ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm font-medium mb-4">Connect your wallet - it's where your $EGG lands.</p>
                    <button onClick={() => openWallet()} className="py-2.5 px-6 bg-hub-green text-white font-black text-xs uppercase tracking-widest rounded-lg">
                      Connect Wallet
                    </button>
                  </div>
                ) : !meetsMinEth ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm font-medium mb-2">You need at least {minEthLabel} on Taiko to submit.</p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Use our <Link to="/bridge" className="text-hub-green font-black" onClick={handleClose}>bridge</Link> to move ETH over. This proves you've got skin in the game.
                    </p>
                  </div>
                ) : (
                  <>
                    {preview ? (
                      <div className="relative mb-4">
                        <img src={preview} alt="Preview" className="w-full rounded-lg object-cover max-h-48" />
                        <button onClick={() => { setPhoto(null); setPreview(null); }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => fileRef.current?.click()} className="w-full mb-4 py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-black uppercase tracking-widest hover:border-hub-green hover:text-hub-green transition-all">
                        Tap to upload photo
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

                    <div className="mb-3">
                      <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-1.5">Price shown</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">$</span>
                        <input type="number" step="0.01" min="0" value={priceInput} onChange={e => setPriceInput(e.target.value)}
                          placeholder="6.19" className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-hub-green" />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-1.5">
                        Store & brand <span className="text-gray-300 normal-case font-medium">(optional)</span>
                      </label>
                      <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
                        placeholder="e.g. Publix, Happy Egg Free Range 12ct"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-hub-green" />
                    </div>

                    <div className="mb-4">
                      <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-1.5">Your wallet</label>
                      <input type="text" value={wallet} onChange={e => setWallet(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-700 focus:outline-none focus:border-hub-green" />
                    </div>

                    {pinError && <p className="text-red-500 text-xs mb-3">{pinError}</p>}

                    <button
                      onClick={handleSubmitEvidence}
                      disabled={!photo || !priceInput || !wallet || pinning || submitPending}
                      className="w-full py-3 bg-hub-green text-white font-black text-xs uppercase tracking-widest rounded-lg hover:bg-green-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {pinning ? 'Uploading photo...' : submitPending ? 'Recording on-chain...' : 'Submit Evidence'}
                    </button>
                  </>
                )}
              </div>
            )}

            {mode === 'submit' && submitConfirmed && (
              <div className="p-8 text-center">
                <p className="text-hub-green font-black text-4xl mb-4">✓</p>
                <p className="text-gray-900 font-black text-lg uppercase tracking-tight mb-2">On chain.</p>
                <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">
                  Submission recorded. If approved, {rewardLabel} lands in your wallet - and you'll have a shot at completing the full carton deal.
                </p>
                <button onClick={handleClose} className="py-2.5 px-6 bg-hub-green text-white font-black text-xs uppercase tracking-widest rounded-lg hover:bg-green-700">Done</button>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}

function DealCreditBanner() {
  const { address, isConnected } = useAccount();
  const contractAddr = ADDRESSES.PRICE_EVIDENCE;

  const { data: credit, refetch: refetchCredit } = useReadContract({
    address: contractAddr, abi: PRICE_EVIDENCE_ABI, functionName: 'eggCredit',
    args: [address], query: { enabled: !!contractAddr && !!address },
  });
  const { data: usePoolMode } = useReadContract({
    address: contractAddr, abi: PRICE_EVIDENCE_ABI, functionName: 'usePool',
    query: { enabled: !!contractAddr },
  });

  const hasCredit   = credit && credit > 0n;
  const submissionId = address ? localStorage.getItem(`pe_sub_${address}`) : null;

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => { if (confirmed) refetchCredit(); }, [confirmed]);

  if (!isConnected || !hasCredit || !contractAddr) return null;

  const handleClaim = () => writeContract({
    address: contractAddr, abi: PRICE_EVIDENCE_ABI, functionName: 'claimEgg', args: [],
  });

  const handleCompleteDeal = () => {
    if (!submissionId) return;
    writeContract({
      address: contractAddr, abi: PRICE_EVIDENCE_ABI, functionName: 'completeTheDeal',
      args: [BigInt(submissionId)], value: 0n,
    });
  };

  if (confirmed) return (
    <div className="mt-6 bg-hub-green/10 border-2 border-hub-green/20 rounded-xl p-5 text-center">
      <p className="text-hub-green font-black uppercase tracking-widest text-sm">Done. Check your wallet.</p>
    </div>
  );

  return (
    <div className="mt-6 bg-white border-2 border-hub-green/40 rounded-xl p-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-hub-green text-[10px] font-black uppercase tracking-widest mb-1">Your submission was approved</p>
          <p className="text-gray-900 font-black text-lg">You have 1 $EGG credit.</p>
          <p className="text-gray-500 text-sm font-medium mt-1 max-w-sm">
            Claim it now, or complete the deal - get 5 more and walk away with a full carton NFT ready to redeem.
          </p>
          {!submissionId && (
            <p className="text-amber-600 text-xs font-medium mt-2">Submission ID not in this browser - use "Claim 1 $EGG" to withdraw.</p>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={handleCompleteDeal}
            disabled={isPending || !submissionId || !!usePoolMode}
            className="py-2.5 px-5 bg-hub-green text-white font-black text-xs uppercase tracking-widest rounded-lg hover:bg-green-700 transition-all disabled:opacity-40"
          >
            {isPending ? 'Processing...' : 'Complete the Deal →'}
          </button>
          <button
            onClick={handleClaim}
            disabled={isPending}
            className="py-2.5 px-5 border-2 border-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest rounded-lg hover:border-gray-400 transition-all disabled:opacity-40"
          >
            Claim 1 $EGG
          </button>
        </div>
      </div>
    </div>
  );
}

// Lightweight listing card - teaser only, full interaction lives on /market
function FeaturedListingCard({ id }) {
  const [meta,   setMeta]   = useState(null);
  const [imgErr, setImgErr] = useState(false);

  const { data: listing } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'getListing',
    args:    [BigInt(id)],
    query:   { enabled: !!ADDRESSES.MARKETPLACE },
  });

  const { data: inventory } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'getInventory',
    args:    [BigInt(id)],
    query:   { enabled: !!ADDRESSES.MARKETPLACE },
  });

  const paymentToken = listing?.[1];
  const { data: rawSymbol } = useReadContract({
    address: paymentToken,
    abi:     ERC20_ABI,
    functionName: 'symbol',
    query:   { enabled: !!paymentToken },
  });

  const firstTokenId = inventory?.[0];
  const { data: tokenUri } = useReadContract({
    address: ADDRESSES.BEERNFT,
    abi:     NFT_ABI,
    functionName: 'tokenURI',
    args:    [firstTokenId],
    query:   { enabled: firstTokenId != null },
  });

  useEffect(() => {
    if (!tokenUri) return;
    fetchMeta(tokenUri).then(m => m && setMeta(m));
  }, [tokenUri]);

  if (!listing) return null;
  const [,, price,, inventoryCount, active] = listing;
  if (!active) return null;

  const inStock     = inventoryCount != null && inventoryCount > 0n;
  const priceStr    = price != null ? formatUnits(price, 18) : '-';
  const tokenSymbol = rawSymbol ? `$${rawSymbol}` : null;

  return (
    <Link
      to="/market"
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {meta?.image && !imgErr ? (
          <img
            src={meta.image}
            alt={meta.name ?? 'Homestead product'}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={48} className="text-gray-200" />
          </div>
        )}
        <span className={`absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg backdrop-blur-sm ${
          inStock ? 'bg-hub-green text-white' : 'bg-gray-900/70 text-white/60'
        }`}>
          {inStock ? `${inventoryCount?.toString()} available` : 'Sold Out'}
        </span>
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <h3 className="text-gray-900 font-black text-lg leading-tight">
          {meta?.name ?? 'Homestead Product'}
        </h3>
        {meta?.style && (
          <p className="text-hub-green text-xs font-black uppercase tracking-widest">{meta.style}</p>
        )}
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Token Price</p>
            <p className="text-gray-900 font-black">{priceStr}{tokenSymbol ? ` ${tokenSymbol}` : ''}</p>
          </div>
          <span className="text-hub-green text-xs font-black uppercase tracking-widest">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

function EggSvg() {
  return (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28 drop-shadow-sm">
      <defs>
        <radialGradient id="eggSheenHome" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#e8c99a" />
          <stop offset="60%" stopColor="#c8a070" />
          <stop offset="100%" stopColor="#a07040" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="78" rx="42" ry="52" fill="#c8a882" stroke="#b08050" strokeWidth="1.5" />
      <ellipse cx="60" cy="78" rx="38" ry="48" fill="url(#eggSheenHome)" />
      <ellipse cx="48" cy="62" rx="7" ry="11" fill="white" opacity="0.18" transform="rotate(-15 48 62)" />
    </svg>
  );
}

function SixEggsSvg() {
  const eggs = [
    { cx: 44,  cy: 72,  rot: -6 },
    { cx: 110, cy: 68,  rot:  2 },
    { cx: 176, cy: 73,  rot:  7 },
    { cx: 44,  cy: 158, rot:  5 },
    { cx: 110, cy: 155, rot: -4 },
    { cx: 176, cy: 160, rot:  8 },
  ];
  return (
    <svg viewBox="0 0 220 230" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-3 drop-shadow-sm">
      <defs>
        <radialGradient id="eggSheenSix" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#e8c99a" />
          <stop offset="60%" stopColor="#c8a070" />
          <stop offset="100%" stopColor="#a07040" />
        </radialGradient>
      </defs>
      {eggs.map((e, i) => (
        <g key={i} transform={`rotate(${e.rot} ${e.cx} ${e.cy})`}>
          <ellipse cx={e.cx} cy={e.cy} rx="24" ry="30" fill="#c8a882" stroke="#b08050" strokeWidth="1" />
          <ellipse cx={e.cx} cy={e.cy} rx="21" ry="27" fill="url(#eggSheenSix)" />
          <ellipse cx={e.cx - 6} cy={e.cy - 10} rx="5" ry="7" fill="white" opacity="0.18" transform={`rotate(-15 ${e.cx - 6} ${e.cy - 10})`} />
        </g>
      ))}
    </svg>
  );
}

function EggFeaturedPlaceholder({ name, priceAmount, tokenSymbol, image }) {
  const priceLabel = tokenSymbol ? `${priceAmount} ${tokenSymbol}` : null;
  return (
    <Link
      to="/market"
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-square bg-gradient-to-br from-amber-50 to-yellow-100 overflow-hidden flex items-center justify-center">
        {image ?? <EggSvg />}
        <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-gray-900/70 text-white/60">
          Coming Soon
        </span>
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <h3 className="text-gray-900 font-black text-lg leading-tight">{name}</h3>
        <p className="text-hub-green text-xs font-black uppercase tracking-widest">Grade AA · Free-Range</p>
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Token Price</p>
            <p className="text-gray-900 font-black">{priceLabel ?? '-'}</p>
          </div>
          <span className="text-hub-green text-xs font-black uppercase tracking-widest">View →</span>
        </div>
      </div>
    </Link>
  );
}

function FeaturedListings() {
  const { data: nextId } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'nextListingId',
    query:   { enabled: !!ADDRESSES.MARKETPLACE },
  });

  const { data: eggRawSymbol } = useReadContract({
    address: ADDRESSES.EGG_TOKEN,
    abi:     ERC20_ABI,
    functionName: 'symbol',
    query:   { enabled: !!ADDRESSES.EGG_TOKEN },
  });
  const eggSymbol = eggRawSymbol ? `$${eggRawSymbol}` : null;

  const listingIds = nextId != null
    ? Array.from({ length: Math.min(Number(nextId), 3) }, (_, i) => i)
    : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {listingIds.map(id => (
        <FeaturedListingCard key={id} id={id} />
      ))}
      <EggFeaturedPlaceholder name="Single Farm Egg"     priceAmount={1} tokenSymbol={eggSymbol} />
      <EggFeaturedPlaceholder name="Half Dozen Farm Eggs" priceAmount={6} tokenSymbol={eggSymbol} image={<SixEggsSvg />} />
    </div>
  );
}

// ─── Static data ──────────────────────────────────────────────────────────────

// Deterministic color from token address - stable for everyone, no config needed
function addressColor(address) {
  const hex = address.slice(2);
  let n = 0;
  for (let i = 0; i < hex.length; i++) n = (n * 31 + parseInt(hex[i], 16)) & 0xfffff;
  return `hsl(${n % 360}, 65%, 52%)`;
}

function TokenPortalCard({ address }) {
  const { data: symbol } = useReadContract({ address, abi: ERC20_ABI, functionName: 'symbol', query: { enabled: !!address } });
  const { data: name }   = useReadContract({ address, abi: ERC20_ABI, functionName: 'name',   query: { enabled: !!address } });

  if (!symbol || !name) return null;

  const color = addressColor(address);
  const href  = `/${symbol.toLowerCase()}/`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="group border-2 rounded-xl p-5 hover:shadow-md transition-all"
      style={{ borderColor: color }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="font-black uppercase tracking-widest text-sm text-gray-900">{name}</span>
        <ExternalLink size={14} className="ml-auto text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
      <p className="text-gray-500 text-sm font-medium leading-relaxed">
        Physical goods backed 1:1. Each ${symbol} token redeemable for the real thing.
      </p>
      <div className="mt-3 text-xs font-black uppercase tracking-widest" style={{ color }}>
        ${symbol} →
      </div>
    </a>
  );
}

function ComingSoonCard({ symbol, name, description }) {
  const color = addressColor(`0x${symbol.split('').map(c => c.charCodeAt(0).toString(16)).join('').padEnd(40, '0')}`);
  const href  = `/${symbol.toLowerCase()}/`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="group border-2 rounded-xl p-5 hover:shadow-md transition-all"
      style={{ borderColor: color }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="font-black uppercase tracking-widest text-sm text-gray-900">{name}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-100 text-gray-400">Soon</span>
          <ExternalLink size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>
      </div>
      <p className="text-gray-500 text-sm font-medium leading-relaxed">{description}</p>
      <div className="mt-3 text-xs font-black uppercase tracking-widest" style={{ color }}>
        ${symbol} →
      </div>
    </a>
  );
}

function DynamicPortals() {
  const { data: tokens } = useReadContract({
    address: ADDRESSES.TOKEN_DEPLOYER,
    abi:     TOKEN_DEPLOYER_ABI,
    functionName: 'getAllTokens',
    query:   { enabled: !!ADDRESSES.TOKEN_DEPLOYER },
  });

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {(tokens ?? [])
        .filter(addr => addr.toLowerCase() !== ADDRESSES.STK_HOMESTEAD?.toLowerCase())
        .map(addr => (
          <TokenPortalCard key={addr} address={addr} />
        ))}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col opacity-50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-300 shrink-0" />
          <span className="font-black uppercase tracking-widest text-sm text-gray-400">More Coming</span>
        </div>
        <p className="text-gray-400 text-sm font-medium leading-relaxed">
          New producers joining the ecosystem.
        </p>
        <div className="mt-3 text-xs font-black uppercase tracking-widest text-gray-300">
          Soon →
        </div>
      </div>
    </div>
  );
}

const features = [
  { icon: <ShoppingBag size={28} />, title: 'Market',  text: 'Browse all open listings across the Homestead ecosystem.',            to: '/market' },
  { icon: <Repeat size={28} />,      title: 'Swap',    text: 'Trade any Homestead token directly - $BEER, $EGG, and more.',         to: '/swap'   },
  { icon: <ArrowLeftRight size={28} />, title: 'Bridge', text: 'Move ETH from any exchange into Taiko in under two minutes.',       to: '/bridge' },
];

const TABS = ['Exchange', 'Portals'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  useEffect(() => { document.title = 'Homestead - Grown here. Sold here.'; }, []);
  const { open }                  = useAppKit();
  const { isConnected, address }  = useAccount();
  const navigate                  = useNavigate();
  const [activeTab, setActiveTab]           = useState('Exchange');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [cartonSize, setCartonSize]         = useState(12);

  const ethUsd = useEthUsd();
  const { data: eggPairReserves } = useReadContract({
    address:      ADDRESSES.EGG_WETH_PAIR,
    abi:          PAIR_ABI,
    functionName: 'getReserves',
    query:        { enabled: !!ADDRESSES.EGG_WETH_PAIR },
  });
  // EGG_WETH_PAIR: wethIsToken0 = true (WETH address sorts below EGG)
  const eggUsd = (() => {
    if (!eggPairReserves || !ethUsd) return null;
    const [wethRes, eggRes] = eggPairReserves;
    if (!eggRes || eggRes === 0n) return null;
    const ethPerEgg = parseFloat(formatUnits(wethRes, 18)) / parseFloat(formatUnits(eggRes, 18));
    return (ethPerEgg * ethUsd).toFixed(2);
  })();

  const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="bg-white border-t-8 border-hub-green shadow-2xl rounded-b-lg p-8 md:p-14 mb-12">
          <p className="text-hub-green text-xs font-black uppercase tracking-widest mb-4">
            Direct. Local. No middlemen.
          </p>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900 mb-6 leading-none">
            Grown here.<br />Sold here.
          </h1>
          <p className="text-lg text-gray-700 font-medium leading-relaxed mb-3 max-w-2xl">
            The eggs at your grocery store sat in a truck for three weeks. These didn't.
          </p>
          <p className="text-gray-500 font-medium leading-relaxed max-w-2xl mb-8">
            Homestead is a direct market for local producers - brewers, farmers, and homesteaders
            who grow and make for themselves first, and sell what they'd put on their own table.
            No distributor. No markup. No middleman taking a cut on the way to your door.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/market"
              className="inline-flex items-center gap-2 bg-hub-green text-white font-black py-3 px-8 uppercase tracking-widest hover:bg-green-700 transition-all shadow-md rounded"
            >
              See What's for Sale
            </Link>
            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-2 border-2 border-gray-900 text-gray-900 font-black py-3 px-8 uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all rounded"
            >
              I'm a Producer
            </button>
          </div>
        </section>

        {/* ── WHY DIFFERENT ─────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="text-hub-green mb-4"><Leaf size={28} strokeWidth={2} /></div>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                Full nutrition.<br />No compromise.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                Commercial distribution forces corner-cutting - shelf life, transport, regulation.
                Homestead producers grow without that overhead. What you get is what they eat.
              </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="text-hub-green mb-4"><BadgeCheck size={28} strokeWidth={2} /></div>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                You pay the farmer.<br />Not the chain.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                Distributor. Wholesaler. Retailer. Each takes a cut. By the time it reaches the shelf
                the producer saw a fraction of what you paid. Here, you pay them directly.
              </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="text-hub-green mb-4"><Users size={28} strokeWidth={2} /></div>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                Their reputation.<br />Your confidence.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                Your neighbor trusts a producer because they know them. Homestead lets that trust
                travel - to buyers who've never met them, backed by every batch they've delivered.
              </p>
            </div>
          </div>
        </section>

        {/* ── FROM THE HOMESTEAD ────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900">
                From the Homestead
              </h2>
              <p className="text-gray-500 text-sm font-medium mt-1">Backed. Verified. Ready to claim.</p>
            </div>
            <Link to="/market" className="text-hub-green text-sm font-black uppercase tracking-widest hover:underline flex items-center gap-1">
              Browse all <ArrowRight size={14} strokeWidth={3} />
            </Link>
          </div>
          <FeaturedListings />
        </section>

        {/* ── THE DEAL ──────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="bg-hub-green/5 border-2 border-hub-green/20 rounded-2xl p-8 md:p-12">
            <p className="text-hub-green text-xs font-black uppercase tracking-widest mb-3">The deal</p>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-gray-900 mb-2 leading-tight">
              Better food<br />Priced by demand — kept by the producer
            </h2>
            <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-2xl mb-8">
              The price on the left is what the grocery store charges — the distributor cut,
              the shelf fee, the corporate margin, all baked in. The token price is what that
              food actually costs when none of that overhead exists. This platform is a hedge
              against that system, not a participant in it.
            </p>

            <div className="grid md:grid-cols-[1fr_auto_1fr] items-stretch gap-2 mb-4">
              <PriceEvidenceCard />
              <div className="flex items-center justify-center px-2">
                <ArrowRight size={28} className="text-hub-green" strokeWidth={3} />
              </div>
              <div className="border-4 border-hub-green rounded-xl p-6 text-center flex flex-col items-center justify-center bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hub-green opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-hub-green" />
                  </span>
                  <p className="text-hub-green text-[10px] font-black uppercase tracking-widest">Token Price</p>
                </div>
                <p className="text-5xl font-black text-gray-900">{cartonSize} <span className="text-hub-green">$EGG</span></p>
                {eggUsd && <p className="text-gray-400 text-xs font-medium mt-1">≈ ${(parseFloat(eggUsd) * cartonSize).toFixed(2)} USD</p>}
                <div className="flex gap-2 mt-4">
                  {[1, 6, 12].map(n => (
                    <button key={n} onClick={() => setCartonSize(n)} className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border transition-all ${cartonSize === n ? 'bg-hub-green border-hub-green text-white' : 'border-hub-green/30 text-hub-green hover:border-hub-green'}`}>
                      {n} egg{n > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
                <p className="text-gray-400 text-xs font-medium mt-3 leading-relaxed">Local farm. Nutrient-rich. This morning.</p>
              </div>
            </div>

            <DealCreditBanner />

            <div className="mt-8 border-t border-hub-green/10 pt-8">
              <p className="text-gray-600 font-medium leading-relaxed max-w-2xl mb-3">
                The token path costs less - not as a gimmick, as a reflection of reality.
                No distributor, no shelf-life engineering, no corporate margin. The result is a
                more <strong className="text-gray-900 font-black">nutrient-dense</strong> product at a lower price. That's what cutting out the middleman actually does.
              </p>
              <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-2xl mb-6">
                The friction of setting it up is the cost of the difference. Swap a little ETH for
                community tokens on our{' '}
                <Link to="/swap" className="text-hub-green font-black hover:underline underline-offset-2">Swap page</Link>{' '}
                - takes about five minutes. Or submit a store price photo and earn your first $EGG token on us. To keep the token meaningful, photo submissions require a small ETH balance in your wallet - not spent, just held. It's proof you've bridged and have skin in the game.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/swap" className="inline-flex items-center gap-2 bg-hub-green text-white font-black py-3 px-8 uppercase tracking-widest hover:bg-green-700 transition-all shadow-md rounded">
                  Get the Deal <ArrowRight size={16} strokeWidth={3} />
                </Link>
                <button
                  onClick={() => setShowHowItWorks(true)}
                  className="inline-flex items-center gap-2 border-2 border-hub-green text-hub-green font-black py-3 px-8 uppercase tracking-widest hover:bg-hub-green/5 transition-all rounded"
                >
                  How it works
                </button>
              </div>

              {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}
            </div>
          </div>
        </section>

        {/* ── BECOME THE SUPPLY ─────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-3">
              Buyers become producers.<br />That's how the market grows.
            </h2>
            <p className="text-gray-500 font-medium leading-relaxed max-w-2xl">
              The neighbor who buys your eggs today could be selling you tomatoes next season.
              Every producer who joins brings new supply. Every buyer who holds a token signals
              real demand. The more people who participate - on either side - the less anyone
              depends on a supply chain that was never built for them.
            </p>
            <p className="text-gray-500 font-medium leading-relaxed max-w-2xl mt-3">
              You don't have to grow at scale. You don't need a commercial kitchen or a distributor
              relationship. If you produce more than you consume, Homestead is your market.
            </p>
          </div>
        </section>

        {/* ── REPUTATION ────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <p className="text-hub-green text-xs font-black uppercase tracking-widest mb-3">Not just farmers</p>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                Vetted service providers.<br />Same market, same rules.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                A carpenter. An electrician. A mechanic. Anyone who produces more than they consume -
                in goods or in skills - can participate. Homestead isn't limited to what grows in the ground.
                It's for anyone the current system undervalues.
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <p className="text-hub-green text-xs font-black uppercase tracking-widest mb-3">Your stake is your reputation</p>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                Built by you.<br />Not assigned by a bank.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                Every transaction, every delivered batch, every redeemed token adds to your on-chain
                standing. No credit agency decides your tier. No institution gatekeeps your access.
                Your history is what you've actually done - verifiable, neutral, and yours.
              </p>
            </div>
          </div>
        </section>

        {/* ── HOW TO GET IN ─────────────────────────────────────────────── */}
        <section className="mb-12 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-8 py-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900">
              How do I participate?
            </h2>
            <p className="text-gray-500 text-sm font-medium mt-1">
              No application. No approval committee. No fee paid to a gatekeeper for access.
              Your trust is an investment proven by math.
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            <div className="px-8 py-6 flex gap-5">
              <span className="text-hub-green font-black text-2xl shrink-0">01</span>
              <div>
                <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">Stake ETH</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                  Deposit ETH into the protocol. You receive a credential token that reflects your
                  standing - not a receipt, not a yield instrument. Proof that you have skin in the game.
                  This is your investment in your own reputation.
                </p>
              </div>
            </div>
            <div className="px-8 py-6 flex gap-5">
              <span className="text-hub-green font-black text-2xl shrink-0">02</span>
              <div>
                <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">Back your production</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                  Open a lot against your stake. The collateral ratio is enforced by math, not a loan officer.
                  Production tokens are minted - each one a redeemable promise backed by your stake.
                  No rehypothecation. One token, one real thing.
                </p>
              </div>
            </div>
            <div className="px-8 py-6 flex gap-5">
              <span className="text-hub-green font-black text-2xl shrink-0">03</span>
              <div>
                <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">List and sell direct</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                  Put your goods on the market. The token price is what real demand says your
                  production is worth — not a distributor's offer, not a grocery store margin that
                  squeezes both sides. Pricing leverage belongs to the producer here, not the
                  platform. The friction of paying in tokens is the cost of opting out of a system
                  that was never designed in your favor. What you're buying is genuinely better:
                  full nutrition, grown without compromise, from someone who eats what they sell.
                  You pay a fair price directly to the producer. They keep it.
                  Every fulfilled order builds your on-chain track record - portable, verifiable,
                  and not controlled by any platform that can revoke it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRODUCER CTA ──────────────────────────────────────────────── */}
        <section className="mb-12 bg-white border-l-8 border-hub-green rounded-r-2xl p-8 md:p-10 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-gray-900 mb-3 leading-snug">
            You grow it.<br />Demand prices it.<br />You keep it.
          </h2>
          <p className="text-gray-500 font-medium leading-relaxed mb-6 max-w-xl">
            A distributor pays you their price - fixed, negotiated down, regardless of how good your
            product is or how many people want it. On Homestead, the token price reflects real market
            demand. When demand outpaces your supply, the price rises - and that value goes to you,
            not the middleman who got there first.
          </p>
          {isConnected ? (
            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-2 bg-hub-green hover:bg-green-700 text-white font-black py-3 px-8 rounded uppercase tracking-widest transition-all shadow-md"
            >
              <LayoutDashboard size={16} />
              {formatAddress(address)}
            </button>
          ) : (
            <button
              onClick={() => open()}
              className="inline-flex items-center gap-2 bg-hub-green hover:bg-green-700 text-white font-black py-3 px-8 rounded uppercase tracking-widest transition-all shadow-md"
            >
              <Wallet size={16} />
              Get Started
            </button>
          )}
        </section>

        {/* ── EXCHANGE TOOLS ────────────────────────────────────────────── */}
        <section className="mb-4 bg-white shadow-md rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Exchange Tools</p>
          </div>
          <div className="flex border-b border-gray-100">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-all border-b-4 ${
                  activeTab === tab
                    ? 'border-hub-green text-hub-green bg-white'
                    : 'border-transparent text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeTab === 'Exchange' && (
              <div className="grid md:grid-cols-3 gap-4">
                {features.map((f) => (
                  <Link key={f.title} to={f.to}
                    className="group border border-gray-100 rounded-xl p-5 hover:shadow-md hover:border-hub-green transition-all"
                  >
                    <div className="text-hub-green mb-3 group-hover:scale-110 transition-transform inline-block">
                      {f.icon}
                    </div>
                    <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">{f.title}</h3>
                    <p className="text-gray-500 text-sm font-medium leading-relaxed">{f.text}</p>
                  </Link>
                ))}
              </div>
            )}
            {activeTab === 'Portals' && <DynamicPortals />}
          </div>
        </section>


      </div>
    </div>
  );
}
