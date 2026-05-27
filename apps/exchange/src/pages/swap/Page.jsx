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

// Product tokens only — ETH is always the other side and is never selectable
const TOKENS = [
  { symbol: '$BEER', address: ADDRESSES.BEER_TOKEN, decimals: 18, color: 'bg-amber-400' },
  { symbol: '$EGG',  address: null,                 decimals: 18, color: 'bg-sky-400'    },
  { symbol: '$SPA',  address: null,                 decimals: 18, color: 'bg-purple-400' },
];

function buildPath(tokenSymbol, isSelling) {
  if (tokenSymbol === '$BEER') {
    return isSelling
      ? [ADDRESSES.BEER_TOKEN, ADDRESSES.WETH]
      : [ADDRESSES.WETH, ADDRESSES.BEER_TOKEN];
  }
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
      } catch {}
    }
    resolve();
  }, [uri]);
  if (imgSrc) return <img src={imgSrc} alt={symbol} className="w-5 h-5 rounded-full object-cover" />;
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

  const [tokenAmount, setTokenAmount]     = useState('');
  const [selectedToken, setSelectedToken] = useState('$BEER');
  const [isSelling, setIsSelling]         = useState(false);
  const [mounted, setMounted]             = useState(false);
  useEffect(() => setMounted(true), []);

  const tokenDef = TOKENS.find(t => t.symbol === selectedToken);
  const path     = buildPath(selectedToken, isSelling);

  const tokenAmountBig = useMemo(() => {
    try { return tokenAmount ? parseUnits(tokenAmount, 18) : 0n; }
    catch { return 0n; }
  }, [tokenAmount]);

  // Buy: getAmountsIn(desiredTokenOut, [WETH, TOKEN]) → ethIn = amounts[0]
  const { data: buyQuote } = useReadContract({
    address: ADDRESSES.ROUTER,
    abi: ROUTER_ABI,
    functionName: 'getAmountsIn',
    args: [tokenAmountBig, path ?? [ADDRESSES.WETH, ADDRESSES.BEER_TOKEN]],
    query: { enabled: !isSelling && !!path && tokenAmountBig > 0n },
  });

  // Sell: getAmountsOut(tokenIn, [TOKEN, WETH]) → ethOut = amounts[1]
  const { data: sellQuote } = useReadContract({
    address: ADDRESSES.ROUTER,
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [tokenAmountBig, path ?? [ADDRESSES.BEER_TOKEN, ADDRESSES.WETH]],
    query: { enabled: isSelling && !!path && tokenAmountBig > 0n },
  });

  const { data: lpFeeBps = 30n } = useReadContract({
    address: ADDRESSES.BEER_WETH_PAIR,
    abi: PAIR_ABI,
    functionName: 'swapFeeBps',
  });

  const { data: exitFeeBps = 0n } = useReadContract({
    address: ADDRESSES.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'dexExitFeeBps',
  });

  // Gross ETH before platform exit fee
  const grossEthAmount = isSelling ? (sellQuote?.[1] ?? 0n) : (buyQuote?.[0] ?? 0n);

  // Net ETH after exit fee (only applied when selling)
  const netEthAmount = isSelling && grossEthAmount > 0n
    ? (grossEthAmount * (10000n - exitFeeBps)) / 10000n
    : grossEthAmount;

  const { data: reserves } = useReadContract({
    address: ADDRESSES.BEER_WETH_PAIR,
    abi: PAIR_ABI,
    functionName: 'getReserves',
    query: { enabled: !!path && tokenAmountBig > 0n },
  });

  const { data: ethBal   } = useBalance({ address, query: { enabled: !!address } });
  const { data: tokenBal } = useBalance({
    address,
    token: tokenDef?.address ?? undefined,
    chainId,
    query: { enabled: !!address && !!tokenDef?.address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.BEER_TOKEN,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address ?? '0x0000000000000000000000000000000000000000', ADDRESSES.ROUTER],
    query: { enabled: !!address && isSelling },
  });
  const needsApproval = isSelling && allowance !== undefined && allowance < tokenAmountBig;

  const { writeContract: writeApprove, data: approveTxHash } = useWriteContract();
  const { writeContract: writeSwap,   data: swapTxHash }     = useWriteContract();
  const { isLoading: approving, isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: swapping }                                = useWaitForTransactionReceipt({ hash: swapTxHash });
  useEffect(() => { if (approveConfirmed) refetchAllowance(); }, [approveConfirmed, refetchAllowance]);

  const isPending = approving || swapping;

  const insufficientBalance = isSelling
    ? !!tokenBal && tokenAmountBig > 0n && tokenAmountBig > tokenBal.value
    : !!ethBal && grossEthAmount > 0n && grossEthAmount > ethBal.value;

  // Rate: ETH per TOKEN (consistent for both directions)
  const rateDisplay = useMemo(() => {
    if (tokenAmountBig === 0n || netEthAmount === 0n) return null;
    return parseFloat(formatUnits(netEthAmount, 18)) / parseFloat(formatUnits(tokenAmountBig, 18));
  }, [tokenAmountBig, netEthAmount]);

  // Price impact: deviation from mid price expressed as %
  const priceImpact = useMemo(() => {
    if (!reserves || tokenAmountBig === 0n || netEthAmount === 0n) return null;
    const [r0, r1] = reserves; // r0 = BEER (token0), r1 = WETH
    if (r0 === 0n || r1 === 0n) return null;
    const midPrice  = parseFloat(formatUnits(r1, 18)) / parseFloat(formatUnits(r0, 18));
    const execPrice = parseFloat(formatUnits(netEthAmount, 18)) / parseFloat(formatUnits(tokenAmountBig, 18));
    return Math.abs((midPrice - execPrice) / midPrice * 100).toFixed(2);
  }, [reserves, tokenAmountBig, netEthAmount]);

  // LP fee: on the input token (BEER when selling, ETH when buying)
  const lpFeeDisplay = useMemo(() => {
    if (tokenAmountBig === 0n) return '0';
    if (isSelling) return parseFloat(formatUnits((tokenAmountBig * lpFeeBps) / 10000n, 18)).toFixed(4);
    return grossEthAmount > 0n ? parseFloat(formatUnits((grossEthAmount * lpFeeBps) / 10000n, 18)).toFixed(6) : '0';
  }, [tokenAmountBig, grossEthAmount, lpFeeBps, isSelling]);

  const exitFeeDisplay = useMemo(() => {
    if (!isSelling || grossEthAmount === 0n) return null;
    return parseFloat(formatUnits((grossEthAmount * exitFeeBps) / 10000n, 18)).toFixed(6);
  }, [isSelling, grossEthAmount, exitFeeBps]);

  const lpFeePercent   = (Number(lpFeeBps)  / 100).toFixed(2).replace(/\.?0+$/, '');
  const exitFeePercent = (Number(exitFeeBps) / 100).toFixed(2).replace(/\.?0+$/, '');
  const lpFeeCurrency  = isSelling ? selectedToken : 'ETH';

  // Minimum received: BEER when buying, ETH when selling
  const minReceived        = isSelling ? applySlippage(grossEthAmount) : applySlippage(tokenAmountBig);
  const minReceivedDisplay = isSelling
    ? `${parseFloat(formatUnits(minReceived, 18)).toFixed(8)} ETH`
    : `${parseFloat(formatUnits(minReceived, 18)).toFixed(4)} ${selectedToken}`;

  const handleToggle  = () => { setIsSelling(s => !s); setTokenAmount(''); };
  // Floor to whole units — BEER/EGG are whole-unit tokens
  const handleMax     = () => { if (isSelling && tokenBal) setTokenAmount((tokenBal.value / (10n ** 18n)).toString()); };
  const handleApprove = () => writeApprove({
    address: ADDRESSES.BEER_TOKEN, abi: ERC20_ABI,
    functionName: 'approve', args: [ADDRESSES.ROUTER, tokenAmountBig],
  });
  const handleSwap = () => {
    if (!path || tokenAmountBig === 0n || !address) return;
    const dl = DEADLINE();
    if (isSelling) {
      writeSwap({
        address: ADDRESSES.ROUTER, abi: ROUTER_ABI,
        functionName: 'swapExactTokensForETH',
        args: [tokenAmountBig, applySlippage(grossEthAmount), path, address, dl],
      });
    } else {
      // Send the exact ETH quoted by getAmountsIn; amountOutMin protects against slippage
      writeSwap({
        address: ADDRESSES.ROUTER, abi: ROUTER_ABI,
        functionName: 'swapExactETHForTokens',
        args: [applySlippage(tokenAmountBig), path, address, dl],
        value: grossEthAmount,
      });
    }
  };

  const networkName = chain?.name ?? 'Taiko';
  const statusColor = chainId === HUB_CHAIN_ID ? 'bg-emerald-500' : 'bg-amber-400';

  if (!mounted) return null;

  // Display values
  const ethDisplay = netEthAmount > 0n
    ? parseFloat(formatUnits(netEthAmount, 18)).toFixed(8)
    : tokenAmountBig > 0n ? '...' : '0.00';

  const tokenBalDisplay = tokenBal ? parseFloat(formatUnits(tokenBal.value, 18)).toFixed(0) : '...';
  const ethBalDisplay   = ethBal   ? parseFloat(formatUnits(ethBal.value, 18)).toFixed(4)   : '...';

  const tokenLabel = isSelling ? 'You Sell' : 'You Buy';
  const ethLabel   = isSelling ? 'You Receive' : 'You Pay';

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
        {selectedToken} Coming Soon
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
      <button onClick={handleApprove} disabled={isPending || tokenAmountBig === 0n} className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm transition-all active:scale-95 disabled:opacity-50">
        {approving ? 'Approving...' : `Approve ${selectedToken}`}
      </button>
    );
  } else {
    actionButton = (
      <button onClick={handleSwap} disabled={isPending || tokenAmountBig === 0n || (!isSelling && grossEthAmount === 0n)} className="w-full mt-2 bg-hub-green hover:bg-hub-light text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm transition-all active:scale-95 disabled:opacity-50">
        {swapping ? 'Swapping...' : isSelling ? `Sell ${selectedToken}` : `Buy ${selectedToken}`}
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

              {/* TOKEN BOX — always the editable input */}
              <div className="bg-black/40 border border-white/10 p-5 rounded-2xl text-left">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">{tokenLabel}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-hub-green">
                    Balance: {tokenBalDisplay} {selectedToken}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-4 mb-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className="bg-transparent text-3xl font-black text-white outline-none w-full overflow-hidden"
                    value={tokenAmount}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || /^\d+$/.test(v)) setTokenAmount(v);
                    }}
                  />
                  <TokenSelect
                    selected={selectedToken}
                    options={TOKENS}
                    onChange={(sym) => { setSelectedToken(sym); setTokenAmount(''); }}
                  />
                </div>
                {isSelling && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleMax}
                      className="bg-white/5 hover:bg-white/10 text-[9px] font-black text-stone-400 px-4 py-1.5 rounded-lg border border-white/5 transition-all uppercase"
                    >
                      Max
                    </button>
                  </div>
                )}
              </div>

              {/* DIRECTION TOGGLE */}
              <div className="flex justify-center -my-2 z-10">
                <button
                  onClick={handleToggle}
                  className="bg-hub-dark border-2 border-hub-green p-2 rounded-full text-hub-green shadow-xl hover:rotate-180 transition-all duration-500"
                >
                  <ArrowDown size={20} strokeWidth={3} />
                </button>
              </div>

              {/* ETH BOX — display only, never editable */}
              <div className="bg-black/40 border border-white/10 p-5 rounded-2xl text-left">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">{ethLabel}</span>
                  {!isSelling && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                      Wallet: {ethBalDisplay} ETH
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center gap-4">
                  <div className={`text-3xl font-black select-none ${netEthAmount > 0n ? 'text-white' : 'text-stone-600'}`}>
                    {ethDisplay}
                  </div>
                  <div className="shrink-0 bg-stone-800 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white font-black" style={{ fontSize: 9 }}>Ξ</div>
                    <span className="font-black text-white text-xs">ETH</span>
                  </div>
                </div>
              </div>

              {/* TRADE DETAILS */}
              {tokenAmountBig > 0n && !!path && netEthAmount > 0n && (
                <div className="bg-black/20 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest text-stone-400 flex flex-col gap-2 border border-white/5">
                  {rateDisplay !== null && (
                    <div className="flex justify-between">
                      <span>Rate</span>
                      <span className="text-white">1 {selectedToken} = {rateDisplay.toFixed(6)} ETH</span>
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
                    <span className="text-white">{lpFeeDisplay} {lpFeeCurrency}</span>
                  </div>
                  {exitFeeDisplay !== null && (
                    <div className="flex justify-between">
                      <span>Community Fee ({exitFeePercent}%)</span>
                      <span className="text-white">{exitFeeDisplay} ETH</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span>Minimum Received</span>
                    <span className="text-white">{minReceivedDisplay}</span>
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
