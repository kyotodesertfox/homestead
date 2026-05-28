import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAccount, useReadContract, useReadContracts, useSendTransaction, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { parseEther, formatUnits } from 'viem';
import { CheckCircle, Wallet, Home, AlertCircle } from 'lucide-react';
import { ADDRESSES, ERC20_ABI, FACTORY_ABI, PAIR_ABI, TOKEN_DEPLOYER_ABI } from '../../contracts';

const ZERO = '0x0000000000000000000000000000000000000000';

function addressColor(addr) {
  const hex = addr.slice(2);
  let n = 0;
  for (let i = 0; i < hex.length; i++) n = (n * 31 + parseInt(hex[i], 16)) & 0xfffff;
  return `hsl(${n % 360}, 65%, 52%)`;
}

export default function PayPage() {
  const [searchParams]  = useSearchParams();
  const tokenParam      = searchParams.get('token');  // address or symbol
  const ethParam        = searchParams.get('eth');    // optional pre-fill
  const [ethAmount, setEthAmount] = useState(ethParam ?? '');
  const [resolvedToken, setResolvedToken] = useState(null); // address
  const [resolving, setResolving] = useState(false);

  const { isConnected } = useAccount();
  const { open }        = useAppKit();
  const publicClient    = usePublicClient();

  const isAddr = tokenParam?.startsWith('0x') && tokenParam.length === 42;

  // If param is already an address, use it directly
  useEffect(() => {
    if (isAddr) { setResolvedToken(tokenParam); return; }
    if (!tokenParam || !publicClient) return;

    // Symbol lookup — get all tokens, multicall symbols, find match
    setResolving(true);
    publicClient.readContract({
      address: ADDRESSES.TOKEN_DEPLOYER, abi: TOKEN_DEPLOYER_ABI, functionName: 'getAllTokens',
    }).then(async allTokens => {
      const calls = allTokens.map(addr => ({
        address: addr, abi: ERC20_ABI, functionName: 'symbol',
      }));
      const results = await publicClient.multicall({ contracts: calls });
      const idx = results.findIndex(r => r.status === 'success' && r.result?.toUpperCase() === tokenParam.toUpperCase());
      if (idx !== -1) setResolvedToken(allTokens[idx]);
    }).finally(() => setResolving(false));
  }, [tokenParam, isAddr, publicClient]);

  // Token metadata
  const { data: tokenMeta } = useReadContracts({
    contracts: [
      { address: resolvedToken, abi: ERC20_ABI, functionName: 'symbol' },
      { address: resolvedToken, abi: ERC20_ABI, functionName: 'name'   },
    ],
    query: { enabled: !!resolvedToken },
  });
  const symbol = tokenMeta?.[0]?.result;
  const name   = tokenMeta?.[1]?.result;

  // Pair address
  const { data: pairAddress } = useReadContract({
    address: ADDRESSES.FACTORY, abi: FACTORY_ABI, functionName: 'getPair',
    args: [resolvedToken, ADDRESSES.WETH],
    query: { enabled: !!resolvedToken && !!ADDRESSES.WETH },
  });
  const hasPair = pairAddress && pairAddress !== ZERO;

  // Reserves for spot price
  const { data: token0 }   = useReadContract({ address: pairAddress, abi: PAIR_ABI, functionName: 'token0',      query: { enabled: hasPair } });
  const { data: reserves } = useReadContract({ address: pairAddress, abi: PAIR_ABI, functionName: 'getReserves', query: { enabled: hasPair } });

  const [rawR0, rawR1] = reserves ?? [0n, 0n];
  const [r0, r1] = token0?.toLowerCase() === resolvedToken?.toLowerCase()
    ? [rawR0, rawR1] : [rawR1, rawR0];
  const hasLiquidity  = r0 > 0n && r1 > 0n;
  const tokenPriceEth = hasLiquidity ? Number(formatUnits(r1, 18)) / Number(formatUnits(r0, 18)) : 0;

  const ethNum      = parseFloat(ethAmount) || 0;
  const tokenEquiv  = tokenPriceEth > 0 && ethNum > 0 ? (ethNum / tokenPriceEth).toLocaleString(undefined, { maximumFractionDigits: 2 }) : null;

  // Send ETH directly to pair receive()
  const { sendTransaction, data: hash, isPending } = useSendTransaction();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash });

  const handlePay = () => {
    if (!hasPair || !ethAmount || ethNum <= 0) return;
    sendTransaction({ to: pairAddress, value: parseEther(ethAmount) });
  };

  const color = resolvedToken ? addressColor(resolvedToken) : '#22c55e';

  // ── States ─────────────────────────────────────────────────────────────────

  if (!tokenParam) return <ErrorScreen message="No token specified in this payment link." />;
  if (resolving)   return <LoadingScreen />;
  if (!resolvedToken) return <ErrorScreen message={`Token "${tokenParam}" not found on this network.`} />;

  if (confirmed) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center">
      <CheckCircle size={64} className="mb-6" style={{ color }} />
      <p className="text-white font-black text-2xl uppercase tracking-widest mb-2">Payment Sent</p>
      <p className="text-gray-400 font-medium text-sm mb-1">
        {ethNum} ETH → {symbol} pool
      </p>
      <p className="text-gray-600 text-xs font-mono mt-4 break-all">{hash}</p>
      <a href="/" className="mt-10 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
        <Home size={14} /> Homestead
      </a>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col px-5 pt-10 pb-8" style={{ maxWidth: 480, margin: '0 auto' }}>

      {/* Header */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-black uppercase tracking-widest text-gray-500">Homestead Pay</span>
      </div>

      {/* Token identity */}
      <div className="mb-8">
        <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-1">{name ?? '…'}</p>
        <p className="text-white font-black text-5xl tracking-tight" style={{ color }}>${symbol ?? '…'}</p>
        {hasLiquidity && (
          <p className="text-gray-500 text-sm font-medium mt-2">
            1 ETH ≈ {(1 / tokenPriceEth).toLocaleString(undefined, { maximumFractionDigits: 2 })} {symbol}
          </p>
        )}
      </div>

      {/* What this does */}
      <div className="bg-white/5 rounded-2xl px-5 py-4 mb-8 border border-white/10">
        <p className="text-gray-400 text-sm font-medium leading-relaxed">
          Your ETH seeds the <span className="text-white font-black">{symbol}/ETH</span> pool directly — supporting the producer price floor.
        </p>
      </div>

      {/* Amount input */}
      <div className="mb-3">
        <label className="text-xs font-black uppercase tracking-widest text-gray-500 block mb-2">ETH Amount</label>
        <div className="relative">
          <input
            type="number"
            min="0"
            step="0.001"
            placeholder="0.00"
            value={ethAmount}
            onChange={e => setEthAmount(e.target.value)}
            className="w-full bg-white/10 text-white font-black text-3xl rounded-2xl px-5 py-5 border-2 border-white/10 focus:outline-none transition-colors placeholder-white/20"
            style={{ '--tw-border-opacity': 1 }}
            onFocus={e => e.target.style.borderColor = color}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 font-black text-lg">ETH</span>
        </div>
        {tokenEquiv && (
          <p className="text-sm font-medium mt-2 ml-1" style={{ color }}>
            ≈ {tokenEquiv} {symbol} equivalent
          </p>
        )}
      </div>

      {/* Quick amounts */}
      <div className="flex gap-2 mb-8">
        {['0.01', '0.05', '0.1', '0.5'].map(amt => (
          <button key={amt} onClick={() => setEthAmount(amt)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${
              ethAmount === amt ? 'text-white border-current' : 'text-gray-500 border-white/10 hover:border-white/30'
            }`}
            style={ethAmount === amt ? { borderColor: color, color } : {}}>
            {amt}
          </button>
        ))}
      </div>

      {/* No pair warning */}
      {resolvedToken && !hasPair && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-amber-400 text-sm font-medium">This token doesn't have a trading pair yet. Payment unavailable.</p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-auto">
        {!isConnected ? (
          <button onClick={() => open()}
            className="w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-95"
            style={{ backgroundColor: color }}>
            <Wallet size={18} />
            Connect Wallet to Pay
          </button>
        ) : (
          <button
            onClick={handlePay}
            disabled={!hasPair || !ethAmount || ethNum <= 0 || isPending || confirming}
            className="w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: color }}>
            {isPending || confirming ? 'Sending…' : `Pay ${ethNum > 0 ? `${ethNum} ETH` : ''}`}
          </button>
        )}
        <p className="text-center text-gray-600 text-xs font-medium mt-4">
          ETH is sent directly to the {symbol}/ETH pool
        </p>
      </div>

    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-hub-green border-t-transparent animate-spin" />
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center">
      <AlertCircle size={40} className="text-red-400 mb-4" />
      <p className="text-white font-black text-lg mb-2">Invalid Payment Link</p>
      <p className="text-gray-500 text-sm font-medium">{message}</p>
      <a href="/" className="mt-8 text-xs font-black uppercase tracking-widest text-gray-600 hover:text-white transition-colors">
        ← Homestead
      </a>
    </div>
  );
}
