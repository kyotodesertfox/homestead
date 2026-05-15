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
  if (!wei && wei !== 0n) return '—';
  return parseFloat(formatUnits(BigInt(wei), 18)).toFixed(4);
}

export default function StakePanel({ onClose }) {
  const { address } = useAccount();
  const client = usePublicClient();

  const [batchIds,   setBatchIds]   = useState([]);
  const [claimable,  setClaimable]  = useState({}); // batchId → bigint
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

  // Fetch StakePosted events for this wallet to find their batch IDs
  useEffect(() => {
    if (!address || !client || !ADDRESSES.TREASURY) return;
    setLoadingIds(true);
    client.getLogs({
      address: ADDRESSES.TREASURY,
      event:   TREASURY_ABI.find(e => e.name === 'StakePosted' && e.type === 'event'),
      args:    { brewer: address },
      fromBlock: 0n,
      toBlock:   'latest',
    }).then(logs => {
      const ids = logs.map(l => Number(l.args.batchId));
      setBatchIds(ids);
    }).catch(() => setBatchIds([])).finally(() => setLoadingIds(false));
  }, [address, client]);

  // Read claimable per batch
  useEffect(() => {
    if (!batchIds.length || !ADDRESSES.TREASURY) return;
    Promise.all(
      batchIds.map(id =>
        client.readContract({
          address:      ADDRESSES.TREASURY,
          abi:          TREASURY_ABI,
          functionName: 'claimableStake',
          args:         [BigInt(id)],
        }).then(v => [id, v]).catch(() => [id, 0n])
      )
    ).then(pairs => {
      setClaimable(Object.fromEntries(pairs));
    });
  }, [batchIds, client]);

  const { writeContract, data: claimHash, isPending: claiming } = useWriteContract();
  const { isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimHash, query: { enabled: !!claimHash } });

  useEffect(() => {
    if (!claimSuccess) return;
    refetchCumulative();
    // Re-read claimable after claim
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

  const tierIndex = typeof tier === 'number' ? tier : (tier != null ? Number(tier) : 0);
  const hasClaimable = Object.values(claimable).some(v => v > 0n);

  return (
    <div className="fixed inset-0 z-60 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 h-full w-full max-w-sm bg-hub-dark border-l border-hub-green/20 shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-hub-green" />
            <span className="text-white font-black uppercase tracking-widest text-sm">Your Stake</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Tier + cumulative */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Attestation Tier</span>
              <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${TIER_COLORS[tierIndex]}`}>
                {TIER_LABELS[tierIndex]}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">Lifetime Stake</span>
              <span className="text-white font-black text-3xl">{fmtEth(cumulative)} <span className="text-white/40 text-base font-bold">ETH</span></span>
            </div>
            <p className="text-white/30 text-xs font-medium leading-relaxed">
              Cumulative ETH staked across all batches. Tier unlocks automatically as your stake grows — no approval needed.
            </p>
          </div>

          {/* Claimable batches */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Active Batches</h3>

            {loadingIds ? (
              <div className="flex items-center gap-2 text-white/30 text-xs py-4">
                <Loader size={14} className="animate-spin" />
                Loading batches…
              </div>
            ) : batchIds.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-white/30 text-xs font-medium">No batches yet. Post a stake to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {batchIds.map(id => {
                  const amount = claimable[id] ?? 0n;
                  const hasClaim = amount > 0n;
                  return (
                    <div key={id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Batch #{id}</p>
                        <p className={`font-black text-sm mt-0.5 ${hasClaim ? 'text-hub-green' : 'text-white/20'}`}>
                          {hasClaim ? `${fmtEth(amount)} ETH claimable` : 'Nothing to claim'}
                        </p>
                      </div>
                      {hasClaim && (
                        <button
                          onClick={() => handleClaim(id)}
                          disabled={claiming}
                          className="shrink-0 bg-hub-green hover:brightness-110 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest px-3 py-2 rounded-lg transition-all"
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

        </div>

        {/* Footer — post more stake */}
        <div className="px-6 py-5 border-t border-white/10 shrink-0">
          <button
            className="w-full flex items-center justify-between bg-hub-green hover:brightness-110 text-white font-black uppercase tracking-widest text-xs px-5 py-3.5 rounded-xl transition-all"
          >
            <div className="flex items-center gap-2">
              <Zap size={14} strokeWidth={3} />
              Post More Stake
            </div>
            <ChevronRight size={14} />
          </button>
          <p className="text-white/20 text-[10px] font-medium text-center mt-2">
            Opens the producer onboarding flow
          </p>
        </div>

      </div>
    </div>
  );
}
