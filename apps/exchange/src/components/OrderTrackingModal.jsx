import { X, CheckCircle, Circle } from 'lucide-react';
import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import { ADDRESSES, NFT_ABI, MARKETPLACE_ABI, TREASURY_ABI } from '../contracts';

const STEPS = [
  { label: 'Listed',          desc: 'Available on Marketplace'         },
  { label: 'Purchased',       desc: 'Payment secured in escrow'        },
  { label: 'In Delivery',     desc: 'Coordinate pickup via Messages'   },
  { label: 'Redeemed',        desc: 'Physical delivery confirmed'      },
  { label: 'Stake Claimable', desc: 'Brewer\'s ETH stake unlocked'     },
];

function deriveStep(hasListing, redeemed, claimable) {
  if (!hasListing) return 1;            // in wallet but not from marketplace
  if (!redeemed)   return 3;            // purchased → in delivery (awaiting redemption)
  if (claimable > 0n) return 5;         // stake is claimable
  return 4;                             // redeemed, stake not yet claimable (or no batch)
}

export default function OrderTrackingModal({ tokenId, nftContract, onClose }) {
  const nftAddr = nftContract ?? ADDRESSES.BEERNFT;

  const { data: tokenListing } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'getTokenListing',
    args:    [tokenId],
  });

  const listingId = tokenListing?.[0] ?? 0n;
  const batchId   = tokenListing?.[1] ?? 0n;
  const hasListing = listingId > 0n || batchId > 0n;

  const { data: multi } = useReadContracts({
    contracts: [
      { address: nftAddr,             abi: NFT_ABI,         functionName: 'redeemed',        args: [tokenId] },
      { address: nftAddr,             abi: NFT_ABI,         functionName: 'tokenURI',         args: [tokenId] },
      { address: ADDRESSES.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: 'getListing',     args: [listingId] },
      { address: ADDRESSES.TREASURY,  abi: TREASURY_ABI,    functionName: 'claimableStake',  args: [batchId]  },
    ],
    query: { enabled: tokenListing != null },
  });

  const redeemed   = multi?.[0]?.result ?? false;
  const tokenUri   = multi?.[1]?.result;
  const listing    = multi?.[2]?.result;
  const claimable  = multi?.[3]?.result ?? 0n;

  const currentStep = deriveStep(hasListing, redeemed, claimable);

  const price   = listing?.[2];
  const seller  = listing?.[3];

  const fmtAddr = a => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—';
  const fmtEth  = v => v ? parseFloat(formatUnits(v, 18)).toFixed(4) : '0';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-hub-dark border-2 border-hub-green/30 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5 shrink-0">
          <div>
            <h2 className="font-black uppercase tracking-tight text-white text-lg">Order Tracking</h2>
            <p className="text-stone-500 text-xs font-bold mt-0.5">Token #{tokenId?.toString()}</p>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-7 pb-7 space-y-6">

          {/* 5-step tracker */}
          <div className="relative">
            {/* connecting line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-white/10" />
            <div
              className="absolute top-5 left-5 h-0.5 bg-hub-green transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />

            <div className="relative flex justify-between">
              {STEPS.map((step, i) => {
                const stepNum   = i + 1;
                const completed = stepNum < currentStep;
                const active    = stepNum === currentStep;
                return (
                  <div key={step.label} className="flex flex-col items-center gap-2 w-[19%]">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all z-10 ${
                      completed ? 'bg-hub-green border-hub-green'
                      : active  ? 'bg-hub-dark border-hub-green ring-4 ring-hub-green/20'
                      :           'bg-hub-dark border-white/20'
                    }`}>
                      {completed ? (
                        <CheckCircle size={18} className="text-white" />
                      ) : active ? (
                        <div className="w-3 h-3 rounded-full bg-hub-green animate-pulse" />
                      ) : (
                        <Circle size={18} className="text-white/20" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className={`text-[10px] font-black uppercase tracking-widest leading-tight ${
                        active ? 'text-hub-green' : completed ? 'text-white' : 'text-stone-600'
                      }`}>{step.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current status */}
          <div className="bg-hub-green/10 border border-hub-green/30 rounded-2xl px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-hub-green mb-1">
              Current Status
            </p>
            <p className="text-white font-bold text-sm">{STEPS[currentStep - 1].desc}</p>
          </div>

          {/* Order details */}
          {hasListing && (
            <div className="bg-white/5 rounded-2xl border border-white/10 divide-y divide-white/10">
              {price != null && (
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">Price</span>
                  <span className="text-white font-black text-sm">{fmtEth(price)} $BEER</span>
                </div>
              )}
              {seller && (
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">Seller</span>
                  <span className="text-white font-mono text-xs">{fmtAddr(seller)}</span>
                </div>
              )}
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">Listing</span>
                <span className="text-white font-black text-sm">#{listingId?.toString()}</span>
              </div>
              {batchId > 0n && (
                <div className="flex justify-between items-center px-5 py-3">
                  <span className="text-stone-400 text-xs font-bold uppercase tracking-widest">Batch</span>
                  <span className="text-white font-black text-sm">#{batchId?.toString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Redeem action */}
          {!redeemed && hasListing && currentStep >= 3 && (
            <div className="bg-white/5 rounded-2xl border border-white/10 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">
                Ready to confirm delivery?
              </p>
              <p className="text-stone-400 text-xs font-medium mb-3">
                Scan the seller's QR code at pickup or confirm delivery here to burn your escrowed $BEER and release the brewer's stake.
              </p>
              <RedeemButton nftContract={nftAddr} tokenId={tokenId} />
            </div>
          )}

          {/* Stake claimable notice */}
          {currentStep === 5 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">
                Stake Claimable
              </p>
              <p className="text-amber-200 text-xs font-medium">
                {fmtEth(claimable)} ETH is available for the brewer to claim from Treasury.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function RedeemButton({ nftContract, tokenId }) {
  const { writeContract, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const pending = isPending || isConfirming;

  if (isSuccess) return (
    <p className="text-hub-green text-xs font-black uppercase tracking-widest">Redeemed ✓</p>
  );

  return (
    <button
      onClick={() => writeContract({
        address: ADDRESSES.MARKETPLACE,
        abi:     MARKETPLACE_ABI,
        functionName: 'redeem',
        args:    [nftContract, tokenId],
      })}
      disabled={pending}
      className="w-full py-3 rounded-xl bg-hub-green hover:brightness-110 text-white font-black uppercase tracking-widest text-sm disabled:opacity-40 transition-all"
    >
      {pending ? 'Confirming…' : 'Confirm Delivery'}
    </button>
  );
}
