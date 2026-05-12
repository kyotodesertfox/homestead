import React, { useState, useMemo } from 'react';
import { ArrowDown, Info, Wallet, ChevronDown } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { formatUnits } from 'viem';

const HUB_CHAIN_ID = 167000;

const TOKENS = [
  { symbol: 'ETH',  address: null,                                         decimals: 18, color: 'bg-blue-500' },
  { symbol: '$BEER', address: '0x0000000000000000000000000000000000000001',  decimals: 18, color: 'bg-amber-400' },
  { symbol: '$EGG',  address: '0x69F97203BaE2F60bf19322EDf339d40e80a6270A', decimals: 18, color: 'bg-yellow-400' },
];

const RATES = {
  'ETH->$BEER':  5000,
  '$BEER->ETH':  1 / 5000,
  'ETH->$EGG':   40,
  '$EGG->ETH':   1 / 40,
  '$BEER->$EGG': 40 / 5000,
  '$EGG->$BEER': 5000 / 40,
};

function getRate(from, to) {
  return RATES[`${from}->${to}`] ?? null;
}

function TokenSelect({ selected, options, onChange }) {
  const [open, setOpen] = useState(false);
  const tok = options.find(t => t.symbol === selected) ?? options[0];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="bg-stone-800 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2 hover:bg-stone-700 transition-colors"
      >
        <div className={`w-3 h-3 rounded-full ${tok.color}`} />
        <span className="font-black text-white text-xs">{tok.symbol}</span>
        <ChevronDown size={12} className="text-stone-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-stone-900 border border-white/10 rounded-xl overflow-hidden z-20 min-w-[120px]">
          {options.filter(t => t.symbol !== selected).map(t => (
            <button
              key={t.symbol}
              onClick={() => { onChange(t.symbol); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 text-xs font-black text-white transition-colors"
            >
              <div className={`w-3 h-3 rounded-full ${t.color}`} />
              {t.symbol}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SwapPage() {
  const { open } = useAppKit();
  const { isConnected, address, chain } = useAccount();
  const currentChainId = useChainId();

  const [amount, setAmount]     = useState('');
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken]   = useState('$BEER');
  const [mounted, setMounted]   = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const fromDef = TOKENS.find(t => t.symbol === fromToken);
  const toDef   = TOKENS.find(t => t.symbol === toToken);

  const { data: fromBalance } = useBalance({
    address,
    token: fromDef?.address ?? undefined,
    chainId: currentChainId,
    query: { enabled: !!address }
  });

  const rate         = getRate(fromToken, toToken);
  const inputNum     = parseFloat(amount) || 0;
  const LP_FEE       = 0.003;
  const SLIPPAGE     = 0.005;
  const rawOut       = rate !== null ? inputNum * rate : 0;
  const fee          = rawOut * LP_FEE;
  const finalOut     = rawOut - fee;
  const minReceived  = finalOut * (1 - SLIPPAGE);
  const priceImpact  = inputNum > 10 ? (inputNum * 0.01).toFixed(2) : '0.01';

  const balanceLabel = useMemo(() => {
    if (!mounted || !isConnected) return `Balance: 0.00`;
    if (!fromBalance) return 'Balance: ...';
    const val = parseFloat(formatUnits(fromBalance.value, fromBalance.decimals));
    return `Balance: ${val.toFixed(4)}`;
  }, [mounted, isConnected, fromBalance]);

  const handleFlip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount('');
  };

  const handleMax = () => {
    if (!fromBalance) return;
    setAmount(formatUnits(fromBalance.value, fromBalance.decimals));
  };

  const networkName  = chain?.name ?? 'Taiko';
  const statusColor  = currentChainId === HUB_CHAIN_ID ? 'bg-emerald-500' : 'bg-amber-400';

  if (!mounted) return null;

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">

        <header className="mb-12 border-b-8 border-hub-green pb-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
            Homestead <span className="text-hub-green">Swap</span>
          </h1>
          <p className="text-gray-600 font-bold mt-2 uppercase tracking-widest text-sm italic">
            Trade Ecosystem Tokens
          </p>
        </header>

        <div className="max-w-2xl mx-auto">
          <section
            className="bg-hub-dark border-4 border-hub-green rounded-3xl p-6 shadow-xl relative overflow-visible"
            style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')`, backgroundBlendMode: 'overlay' }}
          >
            <div className="flex flex-col gap-4">

              {/* FROM */}
              <div className="bg-black/40 border border-white/10 p-5 rounded-2xl text-left">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">You Sell</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-hub-green">{balanceLabel}</span>
                </div>
                <div className="flex justify-between items-center gap-4 mb-4">
                  <input
                    type="number"
                    placeholder="0.0"
                    className="bg-transparent text-3xl font-black text-white outline-none w-full"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <TokenSelect
                    selected={fromToken}
                    options={TOKENS.filter(t => t.symbol !== toToken)}
                    onChange={(sym) => setFromToken(sym)}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleMax}
                    className="bg-white/5 hover:bg-white/10 text-[9px] font-black text-stone-400 px-4 py-1.5 rounded-lg border border-white/5 transition-all uppercase"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* DIRECTION */}
              <div className="flex justify-center -my-2 z-10">
                <button
                  onClick={handleFlip}
                  className="bg-hub-dark border-2 border-hub-green p-2 rounded-full text-hub-green shadow-xl hover:rotate-180 transition-all duration-500"
                >
                  <ArrowDown size={20} strokeWidth={3} />
                </button>
              </div>

              {/* TO */}
              <div className="bg-black/40 border border-white/10 p-5 rounded-2xl text-left">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">You Receive</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <div className="text-3xl font-black text-white">
                    {inputNum > 0 ? finalOut.toFixed(6) : '0.00'}
                  </div>
                  <TokenSelect
                    selected={toToken}
                    options={TOKENS.filter(t => t.symbol !== fromToken)}
                    onChange={(sym) => setToToken(sym)}
                  />
                </div>
              </div>

              {/* DETAILS */}
              {inputNum > 0 && rate !== null && (
                <div className="bg-black/20 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest text-stone-400 flex flex-col gap-2 border border-white/5">
                  <div className="flex justify-between">
                    <span>Rate</span>
                    <span className="text-white">1 {fromToken} = {rate?.toFixed(6)} {toToken}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price Impact</span>
                    <span className={parseFloat(priceImpact) > 2 ? 'text-rose-500' : 'text-emerald-500'}>{priceImpact}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LP Fee (0.3%)</span>
                    <span className="text-white">{fee.toFixed(6)} {toToken}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span>Minimum Received</span>
                    <span className="text-white">{minReceived.toFixed(6)} {toToken}</span>
                  </div>
                </div>
              )}

              {/* ACTION */}
              {isConnected ? (
                <button className="w-full mt-2 bg-hub-green hover:bg-hub-light text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm transition-all active:scale-95">
                  Swap {fromToken} → {toToken}
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
            <div className="text-hub-green mt-1 shrink-0">
              <Info size={24} strokeWidth={3} />
            </div>
            <div>
              <h4 className="text-gray-900 font-black text-sm uppercase tracking-tight">About the Swap</h4>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed font-medium">
                All Homestead tokens trade through the same AMM router on {networkName}.
                Entry is free; exit carries a small fee that strengthens the ecosystem floor.
                Slippage tolerance is 0.5%.
              </p>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
