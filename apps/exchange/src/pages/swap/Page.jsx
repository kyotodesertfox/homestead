import React, { useState, useMemo, useEffect } from 'react';
import { ArrowDown, Info, ChevronDown } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import {
  useAccount, useBalance, useChainId,
  useReadContract, useWriteContract, useWaitForTransactionReceipt,
} from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { ADDRESSES, ROUTER_ABI, ERC20_ABI, PAIR_ABI, TREASURY_ABI, CONTRACT_URI_ABI, DEADLINE, applySlippage } from '../../contracts';

const HUB_CHAIN_ID = 167000;

const TOKENS = [
  { symbol: 'ETH',   address: null,                decimals: 18, color: 'bg-blue-500'  },
  { symbol: '$BEER', address: ADDRESSES.BEER_TOKEN, decimals: 18, color: 'bg-amber-400' },
  { symbol: '$EGG',  address: null,                decimals: 18, color: 'bg-yellow-400' },
];

function buildPath(from, to) {
  if (from === 'ETH'   && to === '$BEER') return [ADDRESSES.WETH, ADDRESSES.BEER_TOKEN];
  if (from === '$BEER' && to === 'ETH')   return [ADDRESSES.BEER_TOKEN, ADDRESSES.WETH];
  return null;
}

const IPFS_GATEWAY = 'https://cloudflare-ipfs.com/ipfs/';
function toHttp(uri) {
  if (!uri) return null;
  return uri.startsWith('ipfs://') ? IPFS_GATEWAY + uri.slice(7) : uri;
}

function TokenLogo({ symbol, address, color }) {
  const { data: uri } = useReadContract({
    address: address ?? undefined,
    abi: CONTRACT_URI_ABI,
    functionName: 'contractURI',
    query: { enabled: !!address },
  });

  const [imgSrc, setImgSrc] = useState(null);

  useEffect(() => {
    if (!uri) return;
    async function resolve() {
      try {
        let meta;
        if (uri.startsWith('data:application/json')) {
          meta = JSON.parse(atob(uri.split(',')[1]));
        } else {
          meta = await fetch(toHttp(uri)).then(r => r.json());
        }
        setImgSrc(toHttp(meta?.image) ?? null);
      } catch { /* uri not set or fetch failed — fall through to fallback */ }
    }
    resolve();
  }, [uri]);

  if (imgSrc) return <img src={imgSrc} alt={symbol} className="w-5 h-5 rounded-full object-cover" />;
  if (symbol === 'ETH') return (
    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white font-black" style={{ fontSize: 9 }}>Ξ</div>
  );
  return <div className={`w-4 h-4 rounded-full ${color}`} />;
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
        <TokenLogo symbol={tok.symbol} address={tok.address} color={tok.color} />
        <span className="font-black text-white text-xs">{tok.symbol}</span>
        <ChevronDown size={12} className="text-stone-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-stone-900 border border-white/10 rounded-xl overflow-hidden z-20 min-w-[130px]">
          {options.filter(t => t.symbol !== selected).map(t => (
            <button
              key={t.symbol}
              onClick={() => { onChange(t.symbol); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 text-xs font-black text-white transition-colors"
            >
              <TokenLogo symbol={t.symbol} address={t.address} color={t.color} />
              {t.symbol}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SwapPage() {
  const { open }                        = useAppKit();
  const { isConnected, address, chain } = useAccount();
  const chainId                         = useChainId();

  const [amount, setAmount]       = useState('');
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken]     = useState('$BEER');
  const [mounted, setMounted]     = useState(false);
  useEffect(() => setMounted(true), []);

  const isBeerToEth = fromToken === '$BEER';
  const path        = buildPath(fromToken, toToken);
  const fromDef     = TOKENS.find(t => t.symbol === fromToken);

  const amountBig = useMemo(() => {
    try { return amount ? parseUnits(amount, 18) : 0n; }
    catch { return 0n; }
  }, [amount]);

  const { data: quoteData } = useReadContract({
    address: ADDRESSES.ROUTER,
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [amountBig, path ?? [ADDRESSES.WETH, ADDRESSES.BEER_TOKEN]],
    query: { enabled: !!path && amountBig > 0n },
  });

  // LP fee from pair contract (30 bps = 0.3%) — requires updated DexPair implementation
  const { data: lpFeeBps = 30n } = useReadContract({
    address: ADDRESSES.BEER_WETH_PAIR,
    abi: PAIR_ABI,
    functionName: 'swapFeeBps',
  });

  // Platform exit fee from Treasury — only applied on BEER → ETH
  const { data: exitFeeBps = 0n } = useReadContract({
    address: ADDRESSES.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'dexExitFeeBps',
  });

  const grossAmountOut = quoteData?.[1] ?? 0n;
  // For BEER→ETH the router deducts the platform fee from the ETH output after the swap
  const amountOut    = isBeerToEth && grossAmountOut > 0n
    ? (grossAmountOut * (10000n - exitFeeBps)) / 10000n
    : grossAmountOut;
  // amountOutMin is checked by the contract against the gross output (before platform fee)
  const amountOutMin = applySlippage(grossAmountOut);

  const { data: reserves } = useReadContract({
    address: ADDRESSES.BEER_WETH_PAIR,
    abi: PAIR_ABI,
    functionName: 'getReserves',
    query: { enabled: !!path && amountBig > 0n },
  });

  const { data: fromBalance } = useBalance({
    address,
    token: fromDef?.address ?? undefined,
    chainId,
    query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.BEER_TOKEN,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address ?? '0x0000000000000000000000000000000000000000', ADDRESSES.ROUTER],
    query: { enabled: !!address && isBeerToEth },
  });
  const needsApproval = isBeerToEth && allowance !== undefined && allowance < amountBig;

  const { writeContract: writeApprove, data: approveTxHash } = useWriteContract();
  const { writeContract: writeSwap,   data: swapTxHash }     = useWriteContract();

  const { isLoading: approving, isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: swapping }                                = useWaitForTransactionReceipt({ hash: swapTxHash });

  useEffect(() => { if (approveConfirmed) refetchAllowance(); }, [approveConfirmed, refetchAllowance]);

  const isPending = approving || swapping;

  const rateDisplay = useMemo(() => {
    if (!quoteData || amountBig === 0n || amountOut === 0n) return null;
    return parseFloat(formatUnits(amountOut, 18)) / parseFloat(formatUnits(amountBig, 18));
  }, [quoteData, amountBig, amountOut]);

  const priceImpact = useMemo(() => {
    if (!reserves || !quoteData || amountBig === 0n || amountOut === 0n) return null;
    const [r0, r1] = reserves; // BEER = token0, WETH = token1
    const [rIn, rOut] = isBeerToEth ? [r0, r1] : [r1, r0];
    if (rIn === 0n || rOut === 0n) return null;
    const midPrice  = parseFloat(formatUnits(rOut, 18)) / parseFloat(formatUnits(rIn, 18));
    const execPrice = parseFloat(formatUnits(amountOut, 18)) / parseFloat(formatUnits(amountBig, 18));
    return Math.max(0, ((midPrice - execPrice) / midPrice) * 100).toFixed(2);
  }, [reserves, quoteData, amountBig, amountOut, isBeerToEth]);

  const lpFeeDisplay = useMemo(() => {
    if (amountBig === 0n) return '0';
    return parseFloat(formatUnits((amountBig * lpFeeBps) / 10000n, 18)).toFixed(6);
  }, [amountBig, lpFeeBps]);

  const exitFeeDisplay = useMemo(() => {
    if (!isBeerToEth || grossAmountOut === 0n) return null;
    return parseFloat(formatUnits((grossAmountOut * exitFeeBps) / 10000n, 18)).toFixed(6);
  }, [isBeerToEth, grossAmountOut, exitFeeBps]);

  const lpFeePercent   = (Number(lpFeeBps)   / 100).toFixed(2).replace(/\.?0+$/, '');
  const exitFeePercent = (Number(exitFeeBps)  / 100).toFixed(2).replace(/\.?0+$/, '');

  const insufficientBalance = !!fromBalance && amountBig > 0n && amountBig > fromBalance.value;

  const balanceLabel = useMemo(() => {
    if (!mounted || !isConnected) return 'Balance: 0.00';
    if (!fromBalance) return 'Balance: ...';
    return `Balance: ${parseFloat(formatUnits(fromBalance.value, fromBalance.decimals)).toFixed(4)}`;
  }, [mounted, isConnected, fromBalance]);

  const handleFlip    = () => { setFromToken(toToken); setToToken(fromToken); setAmount(''); };
  const handleMax     = () => { if (fromBalance) setAmount(formatUnits(fromBalance.value, fromBalance.decimals)); };
  const handleApprove = () => writeApprove({ address: ADDRESSES.BEER_TOKEN, abi: ERC20_ABI, functionName: 'approve', args: [ADDRESSES.ROUTER, amountBig] });
  const handleSwap    = () => {
    if (!path || amountBig === 0n || !address) return;
    const dl = DEADLINE();
    if (isBeerToEth) {
      writeSwap({ address: ADDRESSES.ROUTER, abi: ROUTER_ABI, functionName: 'swapExactTokensForETH', args: [amountBig, amountOutMin, path, address, dl] });
    } else {
      writeSwap({ address: ADDRESSES.ROUTER, abi: ROUTER_ABI, functionName: 'swapExactETHForTokens', args: [amountOutMin, path, address, dl], value: amountBig });
    }
  };

  const networkName = chain?.name ?? 'Taiko';
  const statusColor = chainId === HUB_CHAIN_ID ? 'bg-emerald-500' : 'bg-amber-400';

  if (!mounted) return null;

  let actionButton;
  if (!isConnected) {
    actionButton = (
      <button onClick={() => open()} className="w-full mt-2 bg-stone-800 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm">
        Connect Wallet
      </button>
    );
  } else if (!path) {
    actionButton = (
      <button disabled className="w-full mt-2 bg-stone-700 text-stone-500 font-black py-5 rounded-2xl uppercase tracking-widest text-sm cursor-not-allowed">
        No Route Available
      </button>
    );
  } else if (insufficientBalance) {
    actionButton = (
      <button disabled className="w-full mt-2 bg-stone-700 text-stone-500 font-black py-5 rounded-2xl uppercase tracking-widest text-sm cursor-not-allowed">
        Insufficient Balance
      </button>
    );
  } else if (needsApproval) {
    actionButton = (
      <button onClick={handleApprove} disabled={isPending || amountBig === 0n} className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm transition-all active:scale-95 disabled:opacity-50">
        {approving ? 'Approving...' : 'Approve $BEER'}
      </button>
    );
  } else {
    actionButton = (
      <button onClick={handleSwap} disabled={isPending || amountBig === 0n || !quoteData} className="w-full mt-2 bg-hub-green hover:bg-hub-light text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm transition-all active:scale-95 disabled:opacity-50">
        {swapping ? 'Swapping...' : `Swap ${fromToken} → ${toToken}`}
      </button>
    );
  }

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

              {/* FLIP */}
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
                    {!path ? '—' : amountOut > 0n ? parseFloat(formatUnits(amountOut, 18)).toFixed(6) : '0.00'}
                  </div>
                  <TokenSelect
                    selected={toToken}
                    options={TOKENS.filter(t => t.symbol !== fromToken)}
                    onChange={(sym) => setToToken(sym)}
                  />
                </div>
              </div>

              {/* DETAILS */}
              {amountBig > 0n && path && quoteData && (
                <div className="bg-black/20 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest text-stone-400 flex flex-col gap-2 border border-white/5">
                  {rateDisplay !== null && (
                    <div className="flex justify-between">
                      <span>Rate</span>
                      <span className="text-white">1 {fromToken} = {rateDisplay.toFixed(6)} {toToken}</span>
                    </div>
                  )}
                  {priceImpact !== null && (
                    <div className="flex justify-between">
                      <span>Price Impact</span>
                      <span className={parseFloat(priceImpact) > 2 ? 'text-rose-500' : 'text-emerald-500'}>{priceImpact}%</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Market Fee ({lpFeePercent}%)</span>
                    <span className="text-white">{lpFeeDisplay} {fromToken}</span>
                  </div>
                  {exitFeeDisplay !== null && (
                    <div className="flex justify-between">
                      <span>Community Fee ({exitFeePercent}%)</span>
                      <span className="text-white">{exitFeeDisplay} ETH</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span>Minimum Received</span>
                    <span className="text-white">{parseFloat(formatUnits(amountOutMin, 18)).toFixed(6)} {toToken}</span>
                  </div>
                </div>
              )}

              {actionButton}

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
                Trade $BEER and other Homestead tokens instantly.
                Buying is free — selling carries a small fee that goes back to the community.
                Your order is protected against up to 0.5% price movement while it confirms.
              </p>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
