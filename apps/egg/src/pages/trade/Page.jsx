import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { formatUnits } from 'viem';
import { Info } from 'lucide-react';

const EGG_MAINNET_ADDRESS = '0x69F97203BaE2F60bf19322EDf339d40e80a6270A';
const EGG_CHAIN_ID = 167000;

export default function TradePage() {
  const currentChainId = useChainId();
  const { address, isConnected, chain } = useAccount();
  const { open } = useAppKit();

  const [amount, setAmount]     = useState('');
  const [isSwapped, setIsSwapped] = useState(false);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const { data: ethBalance } = useBalance({
    address,
    chainId: currentChainId,
    query: { enabled: !!address, refetchInterval: 5000 }
  });

  const { data: eggBalance, isError: eggError, isLoading: eggLoading } = useBalance({
    address,
    token: EGG_MAINNET_ADDRESS,
    chainId: currentChainId,
    query: { enabled: !!address && !!EGG_MAINNET_ADDRESS, retry: false }
  });

  const LP_FEE_PCT    = 0.003;
  const SLIPPAGE_PCT  = 0.005;

  const inputNum      = parseFloat(amount) || 0;
  const simulatedPrice = 0.025;
  const rawReceive    = isSwapped ? inputNum / simulatedPrice : inputNum * simulatedPrice;
  const lpFee         = rawReceive * LP_FEE_PCT;
  const finalReceive  = rawReceive - lpFee;
  const minReceived   = finalReceive * (1 - SLIPPAGE_PCT);
  const priceImpact   = inputNum > 10 ? (inputNum * 0.01).toFixed(2) : "0.01";

  const handlePercentage = (pct) => {
    const currentBalance = isSwapped ? ethBalance : eggBalance;
    if (!currentBalance?.value) return;
    const bigPct   = BigInt(Math.floor(pct * 100));
    const finalVal = (currentBalance.value * bigPct) / 10000n;
    setAmount(formatUnits(finalVal, currentBalance.decimals));
  };

  const getTopDisplay = () => {
    if (!mounted || !isConnected) return { label: 'Balance: 0.00', symbol: isSwapped ? 'ETH' : 'EGG' };

    if (isSwapped) {
      if (!ethBalance) return { label: 'Balance: ...', symbol: 'ETH' };
      const val = parseFloat(formatUnits(ethBalance.value, ethBalance.decimals));
      return { label: `Balance: ${val.toFixed(4)}`, symbol: 'ETH' };
    } else {
      if (eggLoading) return { label: 'Balance: Loading...', symbol: 'EGG' };
      if (eggError || !eggBalance || eggBalance.symbol !== 'EGG') {
        return { label: 'Balance: —', symbol: 'EGG' };
      }
      const val = formatUnits(eggBalance.value, eggBalance.decimals);
      return { label: `Balance: ${val}`, symbol: 'EGG' };
    }
  };

  const topDisplay  = getTopDisplay();
  const networkName = chain?.name ?? 'Taiko';
  const statusColor = currentChainId === EGG_CHAIN_ID ? 'bg-emerald-500' : 'bg-amber-400';

  if (!mounted) return null;

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">

        <header className="mb-12 border-b-8 border-egg-yolk pb-6 flex flex-col md:flex-row justify-between items-end">
          <div className="w-full md:w-auto">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
              EGG <span className="text-egg-yolk">Exchange</span>
            </h1>
            <p className="text-gray-600 font-bold mt-2 uppercase tracking-widest text-sm italic">
              Trade $EGG
            </p>
          </div>
        </header>

        <div className="max-w-2xl mx-auto">
          <section className="bg-homestead-header border-4 border-[#D9A06F] rounded-3xl p-6 shadow-xl relative overflow-visible"
            style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')`, backgroundBlendMode: 'overlay' }}
          >
            <div className="flex flex-col gap-4">

              {/* YOU SELL */}
              <div className="bg-black/40 border border-white/10 p-5 rounded-2xl text-left">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">You Sell</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-egg-yolk">{topDisplay.label}</span>
                </div>
                <div className="flex justify-between items-center gap-4 mb-4">
                  <input
                    type="number"
                    placeholder="0.0"
                    className="bg-transparent text-3xl font-black text-white outline-none w-full"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <div className="bg-stone-800 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                    {!isSwapped && <div className="w-4 h-4 rounded-full bg-egg-yolk shadow-[0_0_8px_#f59e0b]" />}
                    <span className="font-black text-white text-xs">{topDisplay.symbol}</span>
                  </div>
                </div>
                <div className="flex justify-between gap-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => handlePercentage(pct)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-[9px] font-black text-stone-400 py-1.5 rounded-lg border border-white/5 transition-all uppercase"
                    >
                      {pct === 100 ? 'Max' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* DIRECTION TOGGLE */}
              <div className="flex justify-center -my-2 z-10">
                <button
                  onClick={() => { setIsSwapped(!isSwapped); setAmount(''); }}
                  className="bg-homestead-header border-2 border-[#D9A06F] p-2 rounded-full text-egg-yolk shadow-xl hover:rotate-180 transition-all duration-500"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M19 12l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* YOU RECEIVE */}
              <div className="bg-black/40 border border-white/10 p-5 rounded-2xl text-left">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">You Receive</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <div className="text-3xl font-black text-white">
                    {inputNum > 0 ? finalReceive.toFixed(isSwapped ? 2 : 4) : "0.00"}
                  </div>
                  <div className="bg-stone-800 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                    {isSwapped && <div className="w-4 h-4 rounded-full bg-egg-yolk shadow-[0_0_8px_#f59e0b]" />}
                    <span className="font-black text-white text-xs">{isSwapped ? 'EGG' : 'ETH'}</span>
                  </div>
                </div>
              </div>

              {/* DETAILS */}
              {inputNum > 0 && (
                <div className="bg-black/20 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest text-stone-400 flex flex-col gap-2 border border-white/5">
                  <div className="flex justify-between">
                    <span>Price Impact</span>
                    <span className={parseFloat(priceImpact) > 2 ? "text-rose-500" : "text-emerald-500"}>{priceImpact}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Liquidity Provider Fee</span>
                    <span className="text-white">{lpFee.toFixed(6)} {isSwapped ? 'EGG' : 'ETH'}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span>Minimum Received</span>
                    <span className="text-white">{minReceived.toFixed(4)} {isSwapped ? 'EGG' : 'ETH'}</span>
                  </div>
                </div>
              )}

              {/* ACTION */}
              {isConnected ? (
                <button className="w-full mt-2 bg-egg-yolk hover:bg-amber-400 text-homestead-header font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm transition-all active:scale-95">
                  {isSwapped ? 'Buy $EGG' : 'Sell $EGG'}
                </button>
              ) : (
                <button onClick={() => open()} className="w-full mt-2 bg-stone-800 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm">
                  Connect Wallet
                </button>
              )}

              <div className="flex items-center justify-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${statusColor}`} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">{networkName}</span>
              </div>
            </div>
          </section>

          <section className="mt-8 bg-white border border-gray-100 rounded-2xl p-5 flex gap-4 items-start shadow-sm">
            <div className="text-egg-yolk mt-1 shrink-0">
              <Info size={24} strokeWidth={3} />
            </div>
            <div>
              <h4 className="text-gray-900 font-black text-sm uppercase tracking-tight">About the Exchange</h4>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed font-medium">
                The $EGG economy uses an Automated Market Maker on {networkName}. Slippage is set to 0.5%. Entry is free; exit carries a small fee to protect the floor.
              </p>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
