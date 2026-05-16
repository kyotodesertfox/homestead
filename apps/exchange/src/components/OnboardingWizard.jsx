import { useState, useEffect } from 'react';
import { X, Zap, ChevronRight, ChevronLeft, Check, Loader } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, formatUnits } from 'viem';
import {
  ADDRESSES, TREASURY_ABI, TOKEN_DEPLOYER_ABI, NFT_DEPLOYER_ABI,
  MARKETPLACE_ABI, ERC20_ABI, NFT_ABI,
} from '../contracts';

const ZERO = '0x0000000000000000000000000000000000000000';
const STEP_LABELS = ['Token', 'Collection', 'Batch', 'Stake', 'List'];

export default function OnboardingWizard({ onClose, skipInitial = false }) {
  const { address } = useAccount();
  const client = usePublicClient();

  // step: -1 = initial floor stake, 0-4 = production batch steps, 5 = done
  const [step, setStep]               = useState(null);
  const [tokens, setTokens]           = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedNFT, setSelectedNFT]     = useState(null);
  const [cidsText, setCidsText]       = useState('');
  const [tokenToEmit, setTokenToEmit] = useState('');
  const [ethAmount, setEthAmount]     = useState('');
  const [price, setPrice]             = useState('');
  const [batchId, setBatchId]         = useState(null);
  const [txHash, setTxHash]           = useState(null);
  const [txType, setTxType]           = useState(null);
  const [txError, setTxError]         = useState('');

  const { data: cumulative } = useReadContract({
    address: ADDRESSES.TREASURY,
    abi:     TREASURY_ABI,
    functionName: 'cumulativeStake',
    args:    [address ?? ZERO],
    query:   { enabled: !!address },
  });

  const { data: tierT2Threshold } = useReadContract({
    address: ADDRESSES.TREASURY,
    abi:     TREASURY_ABI,
    functionName: 'tierThreshold',
    args:    [2],
    query:   { enabled: !!ADDRESSES.TREASURY },
  });

  // Determine starting step once cumulative stake is known
  useEffect(() => {
    if (step !== null) return;
    if (skipInitial) { setStep(0); return; }
    if (cumulative === undefined) return;
    setStep(cumulative === 0n ? -1 : 0);
  }, [cumulative, skipInitial, step]);

  // Load registered tokens
  useEffect(() => {
    if (!client || !ADDRESSES.TOKEN_DEPLOYER) return;
    client.readContract({ address: ADDRESSES.TOKEN_DEPLOYER, abi: TOKEN_DEPLOYER_ABI, functionName: 'getAllTokens' })
      .then(async addrs => {
        const meta = await Promise.all(addrs.map(async addr => {
          const [name, symbol] = await Promise.all([
            client.readContract({ address: addr, abi: ERC20_ABI, functionName: 'name'   }).catch(() => 'Unknown'),
            client.readContract({ address: addr, abi: ERC20_ABI, functionName: 'symbol' }).catch(() => '???'),
          ]);
          return { address: addr, name, symbol };
        }));
        setTokens(meta);
      }).catch(() => {});
  }, [client]);

  // Load registered NFT collections
  useEffect(() => {
    if (!client || !ADDRESSES.NFT_DEPLOYER) return;
    client.readContract({ address: ADDRESSES.NFT_DEPLOYER, abi: NFT_DEPLOYER_ABI, functionName: 'getAllContracts' })
      .then(async addrs => {
        const meta = await Promise.all(addrs.map(async addr => {
          const [name, symbol] = await Promise.all([
            client.readContract({ address: addr, abi: NFT_ABI, functionName: 'name'   }).catch(() => 'Unknown Collection'),
            client.readContract({ address: addr, abi: NFT_ABI, functionName: 'symbol' }).catch(() => '???'),
          ]);
          return { address: addr, name, symbol };
        }));
        setCollections(meta);
      }).catch(() => {});
  }, [client]);

  const { writeContractAsync } = useWriteContract();
  const { isSuccess: txSuccess, isLoading: txConfirming } = useWaitForTransactionReceipt({
    hash:  txHash,
    query: { enabled: !!txHash },
  });

  useEffect(() => {
    if (!txSuccess) return;
    if (txType === 'initialStake') {
      setTxHash(null); setTxType(null);
      setEthAmount('');
      setStep(0);
    } else if (txType === 'stake') {
      client.readContract({ address: ADDRESSES.TREASURY, abi: TREASURY_ABI, functionName: 'nextBatchId' })
        .then(id => setBatchId(Number(id))).catch(() => {});
      setTxHash(null); setTxType(null);
      setStep(4);
    } else if (txType === 'list') {
      setTxHash(null); setTxType(null);
      setStep(5);
    }
  }, [txSuccess, txType, client]);

  const cids = cidsText.split('\n').map(s => s.trim()).filter(s => s.length >= 46);
  const busy  = txConfirming || !!txHash;

  const selectedTokenMeta = tokens.find(t => t.address === selectedToken);
  const selectedNFTMeta   = collections.find(c => c.address === selectedNFT);

  async function send(args) {
    setTxError('');
    try {
      const hash = await writeContractAsync(args);
      setTxHash(hash);
    } catch (e) {
      setTxError(e.shortMessage ?? e.message ?? 'Transaction failed');
    }
  }

  const handleInitialStake = () => {
    if (!ethAmount) return;
    setTxType('initialStake');
    send({
      address: ADDRESSES.TREASURY,
      abi:     TREASURY_ABI,
      functionName: 'postStake',
      args:    [ZERO, ZERO, [], 0n],
      value:   parseEther(ethAmount),
    });
  };

  const handlePostStake = () => {
    if (!selectedToken || !selectedNFT || !cids.length || !tokenToEmit || !ethAmount) return;
    setTxType('stake');
    send({
      address: ADDRESSES.TREASURY,
      abi:     TREASURY_ABI,
      functionName: 'postStake',
      args:    [selectedToken, selectedNFT, cids, BigInt(tokenToEmit)],
      value:   parseEther(ethAmount),
    });
  };

  const handleCreateListing = () => {
    if (!selectedNFT || !selectedToken || !price || !batchId) return;
    setTxType('list');
    send({
      address: ADDRESSES.MARKETPLACE,
      abi:     MARKETPLACE_ABI,
      functionName: 'createListing',
      args:    [selectedNFT, selectedToken, BigInt(price), BigInt(batchId), 0n],
    });
  };

  if (step === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <Loader size={28} className="text-hub-green animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-hub-dark border-2 border-hub-green/30 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-hub-green" />
            <h2 className="font-black uppercase tracking-tight text-white text-xl">
              {step === -1 ? 'Enter the Platform' : step === 5 ? "You're Live" : 'New Batch'}
            </h2>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Step indicators */}
        {step >= 0 && step < 5 && (
          <div className="flex items-center gap-1 px-7 pb-5 shrink-0">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all
                  ${i < step  ? 'bg-hub-green text-white'
                  : i === step ? 'bg-hub-green/20 border border-hub-green text-hub-green'
                  :              'bg-white/5 border border-white/10 text-stone-600'}`}>
                  {i < step ? <Check size={10} /> : i + 1}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest hidden sm:block
                  ${i === step ? 'text-hub-green' : 'text-stone-600'}`}>{label}</span>
                {i < STEP_LABELS.length - 1 && (
                  <ChevronRight size={10} className="text-stone-700 mx-0.5" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto px-7 pb-7 flex-1 space-y-4">

          {/* ── STEP -1: Initial floor stake ── */}
          {step === -1 && (
            <div className="space-y-4">
              <p className="text-stone-400 text-sm font-medium leading-relaxed">
                Staking ETH is your entry point. It builds your on-chain reputation and locks permanent collateral
                against your future token supply. You don't need a token yet.
              </p>

              {tierT2Threshold != null && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Producer Tier Threshold</p>
                  <p className="text-white font-black">
                    {parseFloat(formatUnits(tierT2Threshold, 18)).toFixed(4)} ETH
                  </p>
                  <p className="text-stone-500 text-xs mt-1">Reach this to unlock production batch creation.</p>
                </div>
              )}

              {cumulative != null && cumulative > 0n && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Your Current Stake</p>
                  <p className="text-hub-green font-black">{parseFloat(formatUnits(cumulative, 18)).toFixed(4)} ETH</p>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">ETH Amount</label>
                <input
                  type="number" step="0.001" placeholder="0.000"
                  value={ethAmount} onChange={e => setEthAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-hub-green/50 placeholder-stone-600"
                />
              </div>

              {txError && <p className="text-red-400 text-xs font-bold">{txError}</p>}

              <button
                onClick={handleInitialStake}
                disabled={!ethAmount || busy}
                className="w-full bg-hub-green hover:brightness-110 disabled:opacity-40 text-white font-black uppercase tracking-widest text-xs px-5 py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                {busy ? <><Loader size={14} className="animate-spin" /> Confirming…</> : 'Post Stake'}
              </button>

              {cumulative != null && cumulative > 0n && (
                <button onClick={() => setStep(0)} className="w-full text-stone-500 hover:text-stone-300 font-black uppercase tracking-widest text-xs py-2 transition-colors">
                  Skip — I already have stake
                </button>
              )}
            </div>
          )}

          {/* ── STEP 0: Select token ── */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-stone-400 text-xs font-medium leading-relaxed">
                Select the token your batch will emit. Buyers need this token to purchase your NFTs.
              </p>
              {tokens.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <Loader size={14} className="animate-spin text-stone-500 mx-auto mb-2" />
                  <p className="text-stone-500 text-xs">Loading registered tokens…</p>
                </div>
              ) : tokens.map(t => (
                <button
                  key={t.address}
                  onClick={() => setSelectedToken(t.address)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all
                    ${selectedToken === t.address
                      ? 'border-hub-green bg-hub-green/10'
                      : 'border-white/10 bg-white/5 hover:border-hub-green/30'}`}
                >
                  <div className="text-left">
                    <p className="font-black uppercase tracking-tight text-white">{t.symbol}</p>
                    <p className="text-[10px] text-stone-500 font-medium mt-0.5">{t.name}</p>
                    <p className="text-[9px] text-stone-600 font-mono mt-0.5">{t.address.slice(0, 10)}…{t.address.slice(-6)}</p>
                  </div>
                  {selectedToken === t.address && <Check size={16} className="text-hub-green shrink-0" />}
                </button>
              ))}
              <button
                onClick={() => setStep(1)}
                disabled={!selectedToken}
                className="w-full bg-hub-green hover:brightness-110 disabled:opacity-40 text-white font-black uppercase tracking-widest text-xs px-5 py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* ── STEP 1: Select NFT collection ── */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-stone-400 text-xs font-medium leading-relaxed">
                Select the NFT collection for this batch. Each NFT represents one physical unit.
              </p>
              {collections.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <Loader size={14} className="animate-spin text-stone-500 mx-auto mb-2" />
                  <p className="text-stone-500 text-xs">Loading registered collections…</p>
                </div>
              ) : collections.map(c => (
                <button
                  key={c.address}
                  onClick={() => setSelectedNFT(c.address)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all
                    ${selectedNFT === c.address
                      ? 'border-hub-green bg-hub-green/10'
                      : 'border-white/10 bg-white/5 hover:border-hub-green/30'}`}
                >
                  <div className="text-left">
                    <p className="font-black uppercase tracking-tight text-white">{c.symbol}</p>
                    <p className="text-[10px] text-stone-500 font-medium mt-0.5">{c.name}</p>
                    <p className="text-[9px] text-stone-600 font-mono mt-0.5">{c.address.slice(0, 10)}…{c.address.slice(-6)}</p>
                  </div>
                  {selectedNFT === c.address && <Check size={16} className="text-hub-green shrink-0" />}
                </button>
              ))}
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="px-5 py-3 rounded-2xl border border-white/10 text-stone-400 font-black uppercase tracking-widest text-xs hover:border-white/20 transition-colors flex items-center gap-1">
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedNFT}
                  className="flex-1 bg-hub-green hover:brightness-110 disabled:opacity-40 text-white font-black uppercase tracking-widest text-xs px-5 py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Batch details ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">
                  IPFS CIDs — one per line
                </label>
                <textarea
                  rows={5}
                  placeholder={'QmAbc123...\nQmDef456...\nQmGhi789...'}
                  value={cidsText}
                  onChange={e => setCidsText(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:outline-none focus:border-hub-green/50 placeholder-stone-700 resize-none"
                />
                <p className="text-stone-600 text-[10px] mt-1 font-medium">
                  {cids.length} valid CID{cids.length !== 1 ? 's' : ''} — each becomes one NFT
                </p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">
                  Tokens to Emit
                </label>
                <input
                  type="number" placeholder="e.g. 100"
                  value={tokenToEmit} onChange={e => setTokenToEmit(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-hub-green/50 placeholder-stone-600"
                />
                <p className="text-stone-600 text-[10px] mt-1 font-medium">
                  Amount of {selectedTokenMeta?.symbol ?? 'token'} minted to you when stake is posted.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-5 py-3 rounded-2xl border border-white/10 text-stone-400 font-black uppercase tracking-widest text-xs hover:border-white/20 transition-colors flex items-center gap-1">
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={cids.length === 0 || !tokenToEmit}
                  className="flex-1 bg-hub-green hover:brightness-110 disabled:opacity-40 text-white font-black uppercase tracking-widest text-xs px-5 py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Post stake ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Batch Summary</p>
                {[
                  ['Token',           selectedTokenMeta?.symbol ?? '—'],
                  ['Collection',      selectedNFTMeta?.symbol ?? '—'],
                  ['NFTs',            cids.length],
                  ['Tokens to Emit',  `${tokenToEmit} ${selectedTokenMeta?.symbol ?? ''}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-stone-400 font-medium">{label}</span>
                    <span className="text-white font-black">{value}</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">ETH Stake Amount</label>
                <input
                  type="number" step="0.001" placeholder="0.000"
                  value={ethAmount} onChange={e => setEthAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-hub-green/50 placeholder-stone-600"
                />
                <p className="text-stone-600 text-[10px] mt-1 font-medium">
                  Permanently locked as floor. Unlocks pro-rata as NFTs are redeemed.
                </p>
              </div>
              {txError && <p className="text-red-400 text-xs font-bold">{txError}</p>}
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="px-5 py-3 rounded-2xl border border-white/10 text-stone-400 font-black uppercase tracking-widest text-xs hover:border-white/20 transition-colors flex items-center gap-1">
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  onClick={handlePostStake}
                  disabled={!ethAmount || busy}
                  className="flex-1 bg-hub-green hover:brightness-110 disabled:opacity-40 text-white font-black uppercase tracking-widest text-xs px-5 py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {busy ? <><Loader size={14} className="animate-spin" /> Confirming…</> : 'Post Stake'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Create listing ── */}
          {step === 4 && (
            <div className="space-y-4">
              {batchId && (
                <div className="bg-hub-green/10 border border-hub-green/30 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-hub-green mb-1">Batch Created</p>
                  <p className="text-white font-black text-lg">Batch #{batchId}</p>
                  <p className="text-stone-400 text-xs mt-0.5">
                    {cids.length} NFT{cids.length !== 1 ? 's' : ''} minted · {tokenToEmit} {selectedTokenMeta?.symbol} emitted
                  </p>
                </div>
              )}
              <p className="text-stone-400 text-xs font-medium leading-relaxed">
                Set a price per NFT in {selectedTokenMeta?.symbol ?? 'your token'} to make this batch purchasable.
              </p>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">
                  Price per NFT
                </label>
                <input
                  type="number" step="0.1" placeholder="e.g. 10"
                  value={price} onChange={e => setPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-hub-green/50 placeholder-stone-600"
                />
                <p className="text-stone-600 text-[10px] mt-1 font-medium">
                  In {selectedTokenMeta?.symbol ?? 'tokens'} per unit.
                </p>
              </div>
              {txError && <p className="text-red-400 text-xs font-bold">{txError}</p>}
              <button
                onClick={handleCreateListing}
                disabled={!price || busy}
                className="w-full bg-hub-green hover:brightness-110 disabled:opacity-40 text-white font-black uppercase tracking-widest text-xs px-5 py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                {busy ? <><Loader size={14} className="animate-spin" /> Confirming…</> : 'Create Listing'}
              </button>
              <button onClick={() => setStep(5)} className="w-full text-stone-500 hover:text-stone-300 font-black uppercase tracking-widest text-xs py-2 transition-colors">
                Skip for now
              </button>
            </div>
          )}

          {/* ── STEP 5: Done ── */}
          {step === 5 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-hub-green/20 border-2 border-hub-green flex items-center justify-center mx-auto">
                <Check size={28} className="text-hub-green" />
              </div>
              {batchId && (
                <p className="text-stone-400 text-sm">
                  Batch #{batchId} is on the marketplace.
                </p>
              )}
              <p className="text-stone-500 text-xs leading-relaxed">
                Deposit your NFT inventory into the listing to make it purchasable. Buyers will acquire{' '}
                {selectedTokenMeta?.symbol ?? 'your token'} via the DEX to purchase.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-hub-green hover:brightness-110 text-white font-black uppercase tracking-widest text-xs px-5 py-4 rounded-2xl transition-all"
              >
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
