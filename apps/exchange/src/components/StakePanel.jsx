import { useState, useEffect } from 'react';
import { X, TrendingUp, Zap, ChevronRight, Loader } from 'lucide-react';
import OnboardingWizard from './OnboardingWizard';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { ADDRESSES, TREASURY_ABI, MARKETPLACE_ABI } from '../contracts';

const ZERO = '0x0000000000000000000000000000000000000000';

const TIER_LABELS = ['None', 'Holder', 'Producer', 'Verified'];
const TIER_COLORS = [
  'text-gray-500  border-gray-500/30  bg-gray-500/10',
  'text-sky-400   border-sky-400/30   bg-sky-400/10',
  'text-hub-green border-hub-green/30 bg-hub-green/10',
  'text-amber-400 border-amber-400/30 bg-amber-400/10',
];

function fmtEth(wei) {
  if (wei == null) return '-';
  return parseFloat(formatUnits(BigInt(wei), 18)).toFixed(4);
}

export default function StakePanel({ onClose }) {
  const { address } = useAccount();
  const client      = usePublicClient();

  const [batches,    setBatches]    = useState([]);
  const [claimable,  setClaimable]  = useState({});
  const [listings,   setListings]   = useState([]);
  const [loadingIds, setLoadingIds] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

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

  const loadBatches = async () => {
    if (!address || !client) return;
    setLoadingIds(true);

    // ── Treasury batches -filter LotOpened events by producer address ──
    if (ADDRESSES.TREASURY) {
      try {
        const lotOpenedAbi = TREASURY_ABI.find(x => x.name === 'LotOpened' && x.type === 'event');
        const logs = await client.getLogs({
          address:   ADDRESSES.TREASURY,
          event:     lotOpenedAbi,
          args:      { producer: address },
          fromBlock: 0n,
        });
        if (logs.length > 0) {
          const results = await Promise.all(
            logs.map(({ args }) =>
              client.readContract({
                address: ADDRESSES.TREASURY, abi: TREASURY_ABI,
                functionName: 'batches', args: [args.batchId],
              }).then(b => ({ id: Number(args.batchId), ...b })).catch(() => null)
            )
          );
          const mine = results.filter(Boolean);
          setBatches(mine);
          const claimPairs = await Promise.all(
            mine.map(b =>
              client.readContract({
                address: ADDRESSES.TREASURY, abi: TREASURY_ABI,
                functionName: 'claimableStake', args: [BigInt(b.id)],
              }).then(v => [b.id, v]).catch(() => [b.id, 0n])
            )
          );
          setClaimable(Object.fromEntries(claimPairs));
        } else {
          setBatches([]);
        }
      } catch {
        setBatches([]);
      }
    }

    // ── Marketplace listings -runs regardless of Treasury result ──
    if (ADDRESSES.MARKETPLACE) {
      try {
        // Post-incremented: first listing = ID 0. Fall back to scanning 10 IDs if
        // nextListingId doesn't exist on the deployed contract (pre-upgrade).
        let scanCount = 10;
        try {
          const nextListingId = await client.readContract({
            address: ADDRESSES.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'nextListingId',
          });
          scanCount = Math.max(Number(nextListingId), 1);
        } catch { /* pre-upgrade contract -use fallback scanCount */ }
        const listingResults = await Promise.all(
          Array.from({ length: scanCount }, (_, i) => i).map(id =>
            client.readContract({
              address: ADDRESSES.MARKETPLACE, abi: MARKETPLACE_ABI,
              functionName: 'getListing', args: [BigInt(id)],
            }).then(l => ({
              id,
              nftContract:    l.nftContract,
              paymentToken:   l.paymentToken,
              price:          l.price,
              proceeds:       l.proceeds,
              inventoryCount: l.inventoryCount,
              active:         l.active,
            })).catch(() => null)
          )
        );
        setListings(
          listingResults.filter(
            l => l && l.proceeds && l.nftContract !== '0x0000000000000000000000000000000000000000'
              && l.proceeds.toLowerCase() === address.toLowerCase()
          )
        );
      } catch {
        setListings([]);
      }
    }

    setLoadingIds(false);
  };

  useEffect(() => { loadBatches(); }, [address, client]);

  const { writeContract, data: claimHash, isPending: claiming } = useWriteContract();
  const { isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimHash, query: { enabled: !!claimHash } });

  const { writeContract: writeWithdraw, data: withdrawHash, isPending: withdrawing } = useWriteContract();
  const { isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash, query: { enabled: !!withdrawHash } });

  useEffect(() => {
    if (!claimSuccess) return;
    refetchCumulative();
    loadBatches();
  }, [claimSuccess]);

  useEffect(() => {
    if (!withdrawSuccess) return;
    loadBatches();
  }, [withdrawSuccess]);

  const handleWithdraw = (listingId, count) => {
    writeWithdraw({
      address:      ADDRESSES.MARKETPLACE,
      abi:          MARKETPLACE_ABI,
      functionName: 'withdrawInventory',
      args:         [BigInt(listingId), BigInt(count)],
    });
  };

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
    <>
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
            Cumulative ETH staked across all batches. Tier is derived on-chain from your lifetime stake -no approval needed.
          </p>

          {/* Active batches */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Active Batches</p>

            {loadingIds ? (
              <div className="flex items-center gap-2 text-stone-500 text-xs py-4">
                <Loader size={14} className="animate-spin" />
                Loading batches…
              </div>
            ) : batches.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <p className="text-stone-500 text-xs font-medium">No batches yet. Post a stake to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {batches.map(batch => {
                  const amount   = claimable[batch.id] ?? 0n;
                  const hasClaim = amount > 0n;
                  const redeemed = Number(batch.redeemedCount);
                  const total    = Number(batch.totalNFTs);
                  return (
                    <div key={batch.id} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest">Batch #{batch.id}</p>
                          {batch.listed  && <span className="text-[9px] font-black uppercase tracking-widest text-hub-green border border-hub-green/30 px-1.5 py-0.5 rounded-full">Listed</span>}
                          {batch.slashed && <span className="text-[9px] font-black uppercase tracking-widest text-red-400 border border-red-400/30 px-1.5 py-0.5 rounded-full">Slashed</span>}
                        </div>
                        {total > 0 && (
                          <p className="text-stone-500 text-[10px] font-medium">
                            {redeemed}/{total} redeemed · {fmtEth(batch.stakedAmount)} ETH staked
                          </p>
                        )}
                        <p className={`font-black text-sm mt-0.5 ${hasClaim ? 'text-hub-green' : 'text-stone-600'}`}>
                          {hasClaim ? `${fmtEth(amount)} ETH claimable` : total === 0 ? 'Floor stake -no NFTs' : 'Nothing to claim yet'}
                        </p>
                      </div>
                      {hasClaim && (
                        <button
                          onClick={() => handleClaim(batch.id)}
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

          {/* Marketplace listings */}
          {listings.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Your Listings</p>
              <div className="space-y-2">
                {listings.map(listing => (
                  <div key={listing.id} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest">Listing #{listing.id}</p>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border
                        ${listing.active
                          ? 'text-hub-green border-hub-green/30'
                          : 'text-stone-500 border-stone-500/30'}`}>
                        {listing.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div>
                        <p className="text-stone-500 text-[10px] font-medium">
                          {Number(listing.inventoryCount)} in inventory
                        </p>
                        <p className="text-stone-600 text-[9px] font-mono mt-0.5 truncate">
                          {listing.nftContract.slice(0, 10)}…{listing.nftContract.slice(-6)}
                        </p>
                      </div>
                      {Number(listing.inventoryCount) > 0 && (
                        <button
                          onClick={() => handleWithdraw(listing.id, Number(listing.inventoryCount))}
                          disabled={withdrawing}
                          className="shrink-0 text-[9px] font-black uppercase tracking-widest border border-stone-500/30 text-stone-400 hover:border-white/30 hover:text-white disabled:opacity-40 px-3 py-1.5 rounded-xl transition-all"
                        >
                          {withdrawing ? <Loader size={10} className="animate-spin" /> : 'Withdraw All'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post more stake */}
          <button
            onClick={() => setWizardOpen(true)}
            className="w-full flex items-center justify-between bg-white/5 hover:bg-hub-green/10 border border-hub-green/30 hover:border-hub-green text-white font-black uppercase tracking-widest text-xs px-5 py-4 rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-2">
              <Zap size={14} strokeWidth={3} className="text-hub-green" />
              Post More Stake
            </div>
            <ChevronRight size={14} className="text-stone-500 group-hover:text-hub-green transition-colors" />
          </button>

        </div>
      </div>
    </div>

    {wizardOpen && (
      <OnboardingWizard onClose={() => setWizardOpen(false)} />
    )}
    </>
  );
}
