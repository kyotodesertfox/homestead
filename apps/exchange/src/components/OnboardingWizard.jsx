import { useState, useEffect } from 'react';
import { X, Zap, Loader, Check } from 'lucide-react';
import { useAccount, useBalance, usePublicClient, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatUnits } from 'viem';
import { ADDRESSES, TREASURY_ABI } from '../contracts';

const ZERO = '0x0000000000000000000000000000000000000000';

export default function OnboardingWizard({ onClose }) {
  const { address } = useAccount();
  const client = usePublicClient();
  const { data: ethBalance } = useBalance({ address, query: { enabled: !!address } });
  const [estimating, setEstimating] = useState(false);

  const [ethAmount, setEthAmount] = useState('');
  const [txHash,    setTxHash]    = useState(null);
  const [txError,   setTxError]   = useState('');
  const [done,      setDone]      = useState(false);

  const { data: cumulative } = useReadContract({
    address: ADDRESSES.TREASURY,
    abi:     TREASURY_ABI,
    functionName: 'cumulativeStake',
    args:    [address ?? ZERO],
    query:   { enabled: !!address && !!ADDRESSES.TREASURY },
  });

  const { data: tierT2Threshold } = useReadContract({
    address: ADDRESSES.TREASURY,
    abi:     TREASURY_ABI,
    functionName: 'tierThreshold',
    args:    [2],
    query:   { enabled: !!ADDRESSES.TREASURY },
  });

  const { writeContractAsync } = useWriteContract();
  const { isSuccess, isLoading: confirming } = useWaitForTransactionReceipt({
    hash:  txHash,
    query: { enabled: !!txHash },
  });

  useEffect(() => {
    if (!isSuccess) return;
    setDone(true);
    setTxHash(null);
    setEthAmount('');
  }, [isSuccess]);

  const busy = confirming || !!txHash;

  const handleStake = async () => {
    if (!ethAmount) return;
    setTxError('');
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.TREASURY,
        abi:     TREASURY_ABI,
        functionName: 'postStake',
        args:    [],
        value:   parseEther(ethAmount),
      });
      setTxHash(hash);
    } catch (e) {
      setTxError(e.shortMessage ?? e.message ?? 'Transaction failed');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-hub-dark border-2 border-hub-green/30 rounded-3xl w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-7 pt-7 pb-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-hub-green" />
            <h2 className="font-black uppercase tracking-tight text-white text-xl">Post Stake</h2>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="px-7 pb-7 space-y-4">
          {done ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-hub-green/20 border-2 border-hub-green flex items-center justify-center mx-auto">
                <Check size={24} className="text-hub-green" />
              </div>
              <p className="text-white font-black">Stake posted.</p>
              <p className="text-stone-500 text-xs">Your stkHomestead balance has been updated.</p>
              <button
                onClick={onClose}
                className="w-full bg-hub-green hover:brightness-110 text-white font-black uppercase tracking-widest text-xs px-5 py-3 rounded-2xl transition-all mt-2"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="text-stone-400 text-sm font-medium leading-relaxed">
                ETH deposited here is permanently locked as the ecosystem floor. You receive stkHomestead 1:1 in wei — your collateral credential.
              </p>

              {tierT2Threshold != null && tierT2Threshold > 0n && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Producer Tier Threshold</p>
                  <p className="text-white font-black">{parseFloat(formatUnits(tierT2Threshold, 18)).toFixed(4)} ETH</p>
                  <p className="text-stone-500 text-xs mt-1">Reach this to unlock production batch creation.</p>
                </div>
              )}

              {cumulative != null && cumulative > 0n && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Your Lifetime Stake</p>
                  <p className="text-hub-green font-black">{parseFloat(formatUnits(cumulative, 18)).toFixed(4)} ETH</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">ETH Amount</label>
                  {ethBalance != null && (
                    <span className="text-[10px] text-stone-500 font-medium">
                      Balance: <span className="text-stone-300">{parseFloat(formatUnits(ethBalance.value, 18)).toFixed(4)}</span>
                      <button
                        disabled={estimating || busy}
                        onClick={async () => {
                          if (!ethBalance || !address) return;
                          setEstimating(true);
                          try {
                            const [gasEstimate, gasPrice] = await Promise.all([
                              client.estimateContractGas({
                                address:      ADDRESSES.TREASURY,
                                abi:          TREASURY_ABI,
                                functionName: 'postStake',
                                args:         [],
                                value:        1n, // reference value — gas units don't vary with amount
                                account:      address,
                              }),
                              client.getGasPrice(),
                            ]);
                            const gasCost = gasEstimate * gasPrice;
                            const safe = ethBalance.value > gasCost ? ethBalance.value - gasCost : 0n;
                            setEthAmount(formatUnits(safe, 18));
                          } catch {
                            const fallback = 100000000000000n; // 0.0001 ETH fallback
                            const safe = ethBalance.value > fallback ? ethBalance.value - fallback : 0n;
                            setEthAmount(formatUnits(safe, 18));
                          } finally {
                            setEstimating(false);
                          }
                        }}
                        className="ml-2 text-hub-green font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-40 transition-all"
                      >
                        {estimating ? <Loader size={10} className="animate-spin inline" /> : 'MAX'}
                      </button>
                    </span>
                  )}
                </div>
                <input
                  type="number" step="0.001" placeholder="0.000"
                  value={ethAmount} onChange={e => setEthAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-hub-green/50 placeholder-stone-600"
                />
              </div>

              {txError && <p className="text-red-400 text-xs font-bold">{txError}</p>}

              <button
                onClick={handleStake}
                disabled={!ethAmount || busy}
                className="w-full bg-hub-green hover:brightness-110 disabled:opacity-40 text-white font-black uppercase tracking-widest text-xs px-5 py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                {busy ? <><Loader size={14} className="animate-spin" /> Confirming…</> : 'Post Stake'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
