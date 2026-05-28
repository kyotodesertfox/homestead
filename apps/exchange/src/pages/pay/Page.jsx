import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAccount, useReadContract, useReadContracts, useSendTransaction, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { parseEther, formatUnits } from 'viem';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle, Wallet, AlertCircle, Copy, Check, Link } from 'lucide-react';
import { ADDRESSES, ERC20_ABI, FACTORY_ABI, PAIR_ABI, TOKEN_DEPLOYER_ABI } from '../../contracts';

const ZERO = '0x0000000000000000000000000000000000000000';

function addressColor(addr) {
  const hex = addr.slice(2);
  let n = 0;
  for (let i = 0; i < hex.length; i++) n = (n * 31 + parseInt(hex[i], 16)) & 0xfffff;
  return `hsl(${n % 360}, 65%, 52%)`;
}

// ── Link Builder (producer side — /pay with no params) ────────────────────────

function LinkBuilder() {
  const publicClient = usePublicClient();
  const [tokens, setTokens]       = useState([]);
  const [selected, setSelected]   = useState(null);
  const [ethAmount, setEthAmount] = useState('');
  const [generated, setGenerated] = useState(null);
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    if (!publicClient) return;
    publicClient.readContract({
      address: ADDRESSES.TOKEN_DEPLOYER, abi: TOKEN_DEPLOYER_ABI, functionName: 'getAllTokens',
    }).then(async allTokens => {
      const filtered = allTokens.filter(a => a.toLowerCase() !== ADDRESSES.STK_HOMESTEAD?.toLowerCase());
      const calls = filtered.flatMap(addr => [
        { address: addr, abi: ERC20_ABI, functionName: 'symbol' },
        { address: addr, abi: ERC20_ABI, functionName: 'name'   },
      ]);
      const results = await publicClient.multicall({ contracts: calls });
      const parsed = filtered.map((addr, i) => ({
        address: addr,
        symbol:  results[i * 2]?.result   ?? addr.slice(0, 6),
        name:    results[i * 2 + 1]?.result ?? '',
      }));
      setTokens(parsed);
      if (parsed.length) setSelected(parsed[0].address);
    });
  }, [publicClient]);

  const token = tokens.find(t => t.address === selected);
  const color = selected ? addressColor(selected) : '#22c55e';

  const handleGenerate = () => {
    if (!token) return;
    const params = new URLSearchParams({ token: token.symbol });
    if (ethAmount && parseFloat(ethAmount) > 0) params.set('eth', ethAmount);
    setGenerated(`${window.location.origin}/pay?${params.toString()}`);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-50 min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        <header className="border-b-8 border-hub-green pb-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
            Homestead <span className="text-hub-green">Pay</span>
          </h1>
          <p className="text-gray-500 font-bold mt-2 uppercase tracking-widest text-sm italic flex items-center gap-2">
            <Link size={13} /> Generate a payment link
          </p>
        </header>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">

          {/* Token selector */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Select Token</p>
            <div className="flex flex-col gap-2">
              {tokens.map(t => {
                const c = addressColor(t.address);
                const active = selected === t.address;
                return (
                  <button key={t.address} onClick={() => { setSelected(t.address); setGenerated(null); }}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all hover:shadow-sm"
                    style={{ borderColor: active ? c : '#e5e7eb', backgroundColor: active ? `${c}0d` : 'white' }}>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c }} />
                    <div>
                      <p className="font-black text-gray-900 text-sm">${t.symbol}</p>
                      <p className="text-gray-400 text-xs font-medium">{t.name}</p>
                    </div>
                    {active && <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: c }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional amount */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
              Pre-fill Amount <span className="text-gray-300 font-medium normal-case">(optional)</span>
            </p>
            <div className="relative">
              <input type="number" min="0" step="0.001" placeholder="0.00"
                value={ethAmount}
                onChange={e => { setEthAmount(e.target.value); setGenerated(null); }}
                className="w-full border-2 border-gray-200 focus:border-hub-green rounded-xl px-4 py-3 text-gray-900 font-black text-xl outline-none transition-colors placeholder-gray-200"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">ETH</span>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={!selected}
            className="w-full py-4 rounded-xl bg-hub-green hover:brightness-110 text-white font-black uppercase tracking-widest text-sm transition-all active:scale-95 disabled:opacity-40">
            Generate QR Code
          </button>
        </div>

        {/* Result */}
        {generated && (
          <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center gap-5">
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <QRCodeSVG value={generated} size={200} fgColor="#111827" bgColor="transparent"
                level="M" includeMargin={false} />
            </div>

            <div className="text-center">
              <p className="font-black uppercase tracking-widest text-gray-900" style={{ color }}>
                ${token?.symbol}{ethAmount && parseFloat(ethAmount) > 0 ? ` — ${ethAmount} ETH` : ''}
              </p>
              <p className="text-gray-400 text-xs font-medium mt-1">Direct pool contribution</p>
            </div>

            <button onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 hover:border-hub-green text-gray-500 hover:text-hub-green transition-all text-xs font-black uppercase tracking-widest w-full justify-center">
              {copied ? <><Check size={13} className="text-hub-green" /> Copied</> : <><Copy size={13} /> Copy Link</>}
            </button>

            <p className="text-gray-300 text-xs font-mono break-all text-center">{generated}</p>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Payment screen (customer side — ?token= in URL) ───────────────────────────

export default function PayPage() {
  const [searchParams] = useSearchParams();
  const tokenParam     = searchParams.get('token');
  const ethParam       = searchParams.get('eth');

  if (!tokenParam) return <LinkBuilder />;
  return <PayScreen tokenParam={tokenParam} ethParam={ethParam} />;
}

function PayScreen({ tokenParam, ethParam }) {
  const [ethAmount, setEthAmount]   = useState(ethParam ?? '');
  const [resolvedToken, setResolvedToken] = useState(null);
  const [resolving, setResolving]   = useState(false);

  const { isConnected } = useAccount();
  const { open }        = useAppKit();
  const publicClient    = usePublicClient();

  const isAddr = tokenParam?.startsWith('0x') && tokenParam.length === 42;

  useEffect(() => {
    if (isAddr) { setResolvedToken(tokenParam); return; }
    if (!publicClient) return;
    setResolving(true);
    publicClient.readContract({
      address: ADDRESSES.TOKEN_DEPLOYER, abi: TOKEN_DEPLOYER_ABI, functionName: 'getAllTokens',
    }).then(async allTokens => {
      const calls = allTokens.map(addr => ({ address: addr, abi: ERC20_ABI, functionName: 'symbol' }));
      const results = await publicClient.multicall({ contracts: calls });
      const idx = results.findIndex(r => r.status === 'success' && r.result?.toUpperCase() === tokenParam.toUpperCase());
      if (idx !== -1) setResolvedToken(allTokens[idx]);
    }).finally(() => setResolving(false));
  }, [tokenParam, isAddr, publicClient]);

  const { data: tokenMeta } = useReadContracts({
    contracts: [
      { address: resolvedToken, abi: ERC20_ABI, functionName: 'symbol' },
      { address: resolvedToken, abi: ERC20_ABI, functionName: 'name'   },
    ],
    query: { enabled: !!resolvedToken },
  });
  const symbol = tokenMeta?.[0]?.result;
  const name   = tokenMeta?.[1]?.result;

  const { data: pairAddress } = useReadContract({
    address: ADDRESSES.FACTORY, abi: FACTORY_ABI, functionName: 'getPair',
    args: [resolvedToken, ADDRESSES.WETH],
    query: { enabled: !!resolvedToken && !!ADDRESSES.WETH },
  });
  const hasPair = pairAddress && pairAddress !== ZERO;

  const { data: token0   } = useReadContract({ address: pairAddress, abi: PAIR_ABI, functionName: 'token0',      query: { enabled: hasPair } });
  const { data: reserves } = useReadContract({ address: pairAddress, abi: PAIR_ABI, functionName: 'getReserves', query: { enabled: hasPair } });

  const [rawR0, rawR1] = reserves ?? [0n, 0n];
  const [r0, r1] = token0?.toLowerCase() === resolvedToken?.toLowerCase()
    ? [rawR0, rawR1] : [rawR1, rawR0];
  const hasLiquidity  = r0 > 0n && r1 > 0n;
  const tokenPriceEth = hasLiquidity ? Number(formatUnits(r1, 18)) / Number(formatUnits(r0, 18)) : 0;

  const ethNum     = parseFloat(ethAmount) || 0;
  const tokenEquiv = tokenPriceEth > 0 && ethNum > 0
    ? (ethNum / tokenPriceEth).toLocaleString(undefined, { maximumFractionDigits: 2 }) : null;

  const { sendTransaction, data: hash, isPending } = useSendTransaction();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash });

  const handlePay = () => {
    if (!hasPair || !ethAmount || ethNum <= 0) return;
    sendTransaction({ to: pairAddress, value: parseEther(ethAmount) });
  };

  const color = resolvedToken ? addressColor(resolvedToken) : '#22c55e';

  if (resolving) return <LoadingScreen />;
  if (!resolvedToken) return <ErrorScreen message={`Token "${tokenParam}" not found on this network.`} />;

  if (confirmed) return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <CheckCircle size={56} className="mb-6 text-hub-green" />
      <h2 className="font-black uppercase tracking-tighter text-gray-900 text-3xl mb-2">Payment Sent</h2>
      <p className="text-gray-500 font-medium">{ethNum} ETH → {symbol}/ETH pool</p>
      <p className="text-gray-300 text-xs font-mono mt-4 break-all max-w-sm">{hash}</p>
      <a href="/" className="mt-10 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-hub-green transition-colors">
        ← Homestead
      </a>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        <header className="border-b-8 pb-6" style={{ borderColor: color }}>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-1">{name ?? '…'}</p>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
            Pay with <span style={{ color }}>${symbol ?? '…'}</span>
          </h1>
          {hasLiquidity && (
            <p className="text-gray-500 font-bold mt-2 text-sm">
              1 {symbol} ≈ {tokenPriceEth.toFixed(8)} ETH
            </p>
          )}
        </header>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">

          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <p className="text-gray-500 text-sm font-medium leading-relaxed">
              Your ETH goes directly into the <span className="font-black text-gray-900">{symbol}/ETH</span> pool — supporting the producer price floor.
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-2">ETH Amount</label>
            <div className="relative">
              <input type="number" min="0" step="0.001" placeholder="0.00"
                value={ethAmount} onChange={e => setEthAmount(e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-hub-green rounded-xl px-4 py-4 text-gray-900 font-black text-3xl outline-none transition-colors placeholder-gray-200"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">ETH</span>
            </div>
            {tokenEquiv && (
              <p className="text-sm font-bold mt-1.5 ml-1" style={{ color }}>≈ {tokenEquiv} {symbol} equivalent</p>
            )}
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2">
            {['0.01', '0.05', '0.1', '0.5'].map(amt => (
              <button key={amt} onClick={() => setEthAmount(amt)}
                className="flex-1 py-2.5 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all"
                style={{
                  borderColor: ethAmount === amt ? color : '#e5e7eb',
                  color: ethAmount === amt ? color : '#9ca3af',
                  backgroundColor: ethAmount === amt ? `${color}0d` : 'white',
                }}>
                {amt}
              </button>
            ))}
          </div>

          {/* No pair warning */}
          {!hasPair && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-700 text-sm font-medium">This token doesn't have a trading pair yet.</p>
            </div>
          )}

          {/* CTA */}
          {!isConnected ? (
            <button onClick={() => open()}
              className="w-full py-4 rounded-xl bg-hub-green hover:brightness-110 text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
              <Wallet size={16} /> Connect Wallet to Pay
            </button>
          ) : (
            <button onClick={handlePay}
              disabled={!hasPair || !ethAmount || ethNum <= 0 || isPending || confirming}
              className="w-full py-4 rounded-xl text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 hover:brightness-110"
              style={{ backgroundColor: color }}>
              {isPending || confirming ? 'Sending…' : `Pay ${ethNum > 0 ? `${ethNum} ETH` : ''}`}
            </button>
          )}

          <p className="text-center text-gray-400 text-xs font-medium">
            ETH is sent directly to the {symbol}/ETH pool
          </p>
        </div>

      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-hub-green border-t-transparent animate-spin" />
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <AlertCircle size={40} className="text-red-400 mb-4" />
      <h2 className="font-black uppercase tracking-tighter text-gray-900 text-2xl mb-2">Invalid Link</h2>
      <p className="text-gray-500 font-medium text-sm">{message}</p>
      <a href="/" className="mt-8 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-hub-green transition-colors">← Homestead</a>
    </div>
  );
}
