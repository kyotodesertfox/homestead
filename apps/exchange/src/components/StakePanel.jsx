import { useState, useEffect } from 'react';
import { X, TrendingUp, Zap, ChevronRight, Loader } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { ADDRESSES, TREASURY_ABI } from '../contracts';

const ZERO = '0x0000000000000000000000000000000000000000';

const TIER_LABELS = ['None', 'Holder', 'Producer', 'Verified'];
const TIER_COLORS = [
  'text-gray-500  border-gray-500/30  bg-gray-500/10',
  'text-sky-400   border-sky-400/30   bg-sky-400/10',
  'text-hub-green border-hub-green/30 bg-hub-green/10',
  'text-amber-400 border-amber-400/30 bg-amber-400/10',
];

function fmtEth(wei) {
  if (wei == null) return '—';
  return parseFloat(formatUnits(BigInt(wei), 18)).toFixed(4);
}

export default function StakePanel({ onClose }) {
  const { address } = useAccount();
  const client      = usePublicClient();

  const [batchIds,   setBatchIds]   = useState([]);
  const [claimable,  setClaimable]  = useState({});
  const [loadingIds, setLoadingIds] = useState(true);

  const { data: cumulative, refetch: refetchCumulative } = useReadContract({
    address: ADDRESSES.TREASURY,
    abi:     TREASURY_ABI,
    functionName: 'cumulativeStake',
    args:    [address ?? ZERO],
    query:   { enabled: !!address && !!ADDRESSES.TREASURY },
  });

  const { data: tier } = useReadContract({
    address: ADDRESSES.TREASURY,
    abi:     TREASURY_ABI,
    functionName: 'attestationTier',
    args:    [address ?? ZERO],
    query:   { enabled: !!address && !!ADDRESSES.TREASURY },
  });

  useEffect(() => {
    if (!address || !client || !ADDRESSES.TREASURY) return;
    setLoadingIds(true);
    client.getLogs({
      address:   ADDRESSES.TREASURY,
      event:     TREASURY_ABI.find(e => e.name === 'StakePosted' && e.type === 'event'),
      args:      { brewer: address },
      fromBlock: 0n,
      toBlock:   'latest',
    }).then(logs => {
      setBatchIds(logs.map(l => Number(l.args.batchId)));
    }).catch(() => setBatchIds([])).finally(() => setLoadingIds(false));
  }, [address, client]);

  useEffect(() => {
    if (!batchIds.length || !ADDRESSES.TREASURY || !client) return;
    Promise.all(
      batchIds.map(id =>
        client.readContract({
          address:      ADDRESSES.TREASURY,
          abi:          TREASURY_ABI,
          functionName: 'claimableStake',
          args:         [BigInt(id)],
        }).then(v => [id, v]).catch(() => [id, 0n])
      )
    ).then(pairs => setClaimable(Object.fromEntries(pairs)));
  }, [batchIds, client]);

  const { writeContract, data: claimHash, isPending: claiming } = useWriteContract();
  const { isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimHash, query: { enabled: !!claimHash } });

  useEffect(() => {
    if (!claimSuccess) return;
    refetchCumulative();
    setBatchIds(ids => [...ids]);
  }, [claimSuccess]);

  const handleClaim = (batchId) => {
    writeContract({
      address:      ADDRESSES.TREASURY,
      abi:          TREASURY_ABI,
      functionName: 'claimStake',
      args:         [BigInt(batchId)],
    });
  };

  const tierIndex = tier != null ? Number(tier) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-hub-dark border-2 border-hub-green/30 rounded-3xl w-full max-w-[32rem] shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-hub-green" />
            <h2 className="font-black uppercase tracking-tight text-white text-xl">Your Stake</h2>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-7 pb-7 flex-1 space-y-5">

          {/* Tier + cumulative */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Lifetime Stake</p>
              <p className="font-black text-white text-2xl">{fmtEth(cumulative)}</p>
              <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest mt-0.5">ETH</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Attestation Tier</p>
              <span className={`inline-block text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border mt-1 ${TIER_COLORS[tierIndex]}`}>
                {TIER_LABELS[tierIndex]}
              </span>
              <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest mt-2">Stake more to advance</p>
            </div>
          </div>

          <p className="text-stone-500 text-xs font-medium leading-relaxed">
            Cumulative ETH staked across all batches. Tier is derived on-chain from your lifetime stake — no approval needed.
          </p>

          {/* Active batches */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Active Batches</p>

            {loadingIds ? (
              <div className="flex items-center gap-2 text-stone-500 text-xs py-4">
                <Loader size={14} className="animate-spin" />
                Loading batches…
              </div>
            ) : batchIds.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <p className="text-stone-500 text-xs font-medium">No batches yet. Post a stake to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {batchIds.map(id => {
                  const amount   = claimable[id] ?? 0n;
                  const hasClaim = amount > 0n;
                  return (
                    <div key={id} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest">Batch #{id}</p>
                        <p className={`font-black text-sm mt-0.5 ${hasClaim ? 'text-hub-green' : 'text-stone-600'}`}>
                          {hasClaim ? `${fmtEth(amount)} ETH claimable` : 'Nothing to claim'}
                        </p>
                      </div>
                      {hasClaim && (
                        <button
                          onClick={() => handleClaim(id)}
                          disabled={claiming}
                          className="shrink-0 bg-hub-green hover:brightness-110 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
                        >
                          {claiming ? '…' : 'Claim'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Post more stake */}
          <button className="w-full flex items-center justify-between bg-white/5 hover:bg-hub-green/10 border border-hub-green/30 hover:border-hub-green text-white font-black uppercase tracking-widest text-xs px-5 py-4 rounded-2xl transition-all group">
            <div className="flex items-center gap-2">
              <Zap size={14} strokeWidth={3} className="text-hub-green" />
              Post More Stake
            </div>
            <ChevronRight size={14} className="text-stone-500 group-hover:text-hub-green transition-colors" />
          </button>

        </div>
      </div>
    </div>
  );
}
