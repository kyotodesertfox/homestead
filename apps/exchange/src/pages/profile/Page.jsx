import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Wallet, Copy, CheckCheck, ExternalLink, ArrowUpDown, Beer, Egg, Flame, X, Droplets, TrendingUp, Lock } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useBalance, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, useDisconnect } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { ADDRESSES, BEER_TOKEN_ABI, ERC20_ABI, PAIR_ABI, ROUTER_ABI } from '../../contracts';

const HUB_CHAIN_ID = 167000;

function fmt(addr)    { return `${addr.slice(0, 6)}...${addr.slice(-4)}`; }
function fmtEth(wei)  { return parseFloat(formatUnits(wei, 18)).toFixed(4); }
function fmtBeer(wei) { const n = parseFloat(formatUnits(wei, 18)); return n % 1 === 0 ? n.toFixed(0) : n.toFixed(4); }

export default function ProfilePage() {
  const { open }                        = useAppKit();
  const { disconnect }                  = useDisconnect();
  const { isConnected, address, chain } = useAccount();
  const chainId                         = useChainId();
  const [copied, setCopied]             = useState(false);
  const [showLiquidity, setShowLiquidity] = useState(false);

  const { data: ethBalance }  = useBalance({ address, query: { enabled: !!address } });
  const { data: beerRaw } = useReadContract({
    address: ADDRESSES.BEER_TOKEN,
    abi: BEER_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address && !!ADDRESSES.BEER_TOKEN },
  });

  // --- Mint ---
  const { data: isMinter } = useReadContract({
    address: ADDRESSES.BEER_TOKEN,
    abi: BEER_TOKEN_ABI,
    functionName: 'isMinter',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  });

  const [mintAmount, setMintAmount] = useState('');
  const [mintDest, setMintDest]     = useState('wallet');

  const { writeContract: writeMint, data: mintTxHash }        = useWriteContract();
  const { isLoading: minting, isSuccess: mintConfirmed }       = useWaitForTransactionReceipt({ hash: mintTxHash });

  const handleMint = () => {
    if (!mintAmount || isNaN(mintAmount) || Number(mintAmount) <= 0) return;
    const amount = BigInt(Math.round(Number(mintAmount)));
    if (mintDest === 'pool') {
      writeMint({ address: ADDRESSES.BEER_TOKEN, abi: BEER_TOKEN_ABI, functionName: 'mintToPool',   args: [ADDRESSES.BEER_WETH_PAIR, amount] });
    } else {
      writeMint({ address: ADDRESSES.BEER_TOKEN, abi: BEER_TOKEN_ABI, functionName: 'mintToWallet', args: [address, amount] });
    }
  };

  useEffect(() => { if (mintConfirmed) setMintAmount(''); }, [mintConfirmed]);

  // --- Copy ---
  const copyAddress = () => {
    if (!address) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(address).catch(() => {});
    } else {
      try {
        const el = document.createElement('input');
        el.value = address;
        el.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      } catch { }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onCorrectChain = chainId === HUB_CHAIN_ID;

  if (!isConnected) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center py-20 px-4">
        <div className="text-center max-w-sm">
          <LayoutDashboard size={56} className="mx-auto text-hub-green mb-6" />
          <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900 mb-2">Your Dashboard</h2>
          <p className="text-gray-500 font-medium mb-8 text-sm">Connect your wallet to view balances and activity.</p>
          <button
            onClick={() => open()}
            className="bg-hub-green hover:bg-hub-light text-white font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-sm shadow-lg transition-all active:scale-95"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">

        <header className="border-b-8 border-hub-green pb-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
            Your <span className="text-hub-green">Dashboard</span>
          </h1>
        </header>

        {/* Wallet card */}
        <section className="bg-hub-dark border-2 border-hub-green/30 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-5">
            <Wallet size={18} className="text-hub-green" />
            <h2 className="font-black uppercase tracking-tight text-white text-sm">Wallet</h2>
            <div className="ml-auto flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${onCorrectChain ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">{chain?.name ?? 'Unknown'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Address</p>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-base">{fmt(address)}</span>
                <div className="relative">
                  <button onClick={copyAddress} className="text-stone-500 hover:text-hub-green transition-colors">
                    {copied ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  {copied && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 bg-white text-gray-900 text-[10px] font-black px-2 py-1 rounded whitespace-nowrap pointer-events-none shadow-lg">
                      Copied!
                    </div>
                  )}
                </div>
                <a href={`https://taikoscan.io/address/${address}`} target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-hub-green transition-colors">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 min-w-[110px] border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">ETH</p>
              <p className="font-black text-white text-2xl">{ethBalance ? fmtEth(ethBalance.value) : '—'}</p>
            </div>
          </div>
        </section>

        {/* Token balances */}
        <div className="grid grid-cols-2 gap-4">
          <BeerCard beerRaw={beerRaw} address={address} onOpen={() => setShowLiquidity(true)} />
          <div className="bg-hub-dark border-2 border-yellow-500/20 rounded-3xl p-5 shadow-xl opacity-40">
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-1">$EGG</p>
            <p className="font-black text-white/30 text-3xl">—</p>
          </div>
        </div>

        {showLiquidity && <LiquidityModal onClose={() => setShowLiquidity(false)} />}

        {/* Mint $BEER — only visible to minters */}
        {isMinter === true && (
          <section className="bg-hub-dark border-2 border-hub-green/30 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-5">
              <Flame size={18} className="text-hub-green" />
              <h2 className="font-black uppercase tracking-tight text-white text-sm">Mint $BEER</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Amount"
                value={mintAmount}
                onChange={e => setMintAmount(e.target.value)}
                className="flex-1 bg-white/10 text-white placeholder-white/30 font-black rounded-xl px-4 py-3 border border-white/10 focus:outline-none focus:border-hub-green transition-colors"
              />

              <div className="flex rounded-xl overflow-hidden border border-white/10">
                <button
                  onClick={() => setMintDest('wallet')}
                  className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors ${mintDest === 'wallet' ? 'bg-hub-green text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                >
                  To Wallet
                </button>
                <button
                  onClick={() => setMintDest('pool')}
                  className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors ${mintDest === 'pool' ? 'bg-hub-green text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                >
                  To Pool
                </button>
              </div>

              <button
                onClick={handleMint}
                disabled={minting || !mintAmount || Number(mintAmount) <= 0}
                className="bg-hub-green hover:bg-hub-light disabled:opacity-40 text-white font-black px-8 py-3 rounded-xl uppercase tracking-widest text-sm transition-all active:scale-95 whitespace-nowrap"
              >
                {minting ? 'Minting...' : mintConfirmed ? 'Minted ✓' : 'Mint'}
              </button>
            </div>

            <p className="mt-3 text-[10px] font-bold text-white/30 uppercase tracking-widest">
              {mintDest === 'pool' ? 'Tokens go directly into the BEER/WETH liquidity pool.' : 'Tokens land in your connected wallet.'}
            </p>
          </section>
        )}

        {/* Quick actions */}
        <section>
          <h2 className="font-black uppercase tracking-tight text-gray-900 text-sm mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ActionCard
              icon={<ArrowUpDown size={24} className="text-hub-green" />}
              title="Swap"
              description="Trade $BEER and ecosystem tokens"
              href="/swap"
              internal
            />
            <ActionCard
              icon={<Beer size={24} className="text-amber-400" />}
              title="Beer Portal"
              description="Your stash, collateral and the market"
              href="/beer/profile"
            />
            <ActionCard
              icon={<Egg size={24} className="text-yellow-400" />}
              title="Egg Portal"
              description="Coming soon"
              href="/egg/"
              disabled
            />
          </div>
        </section>

        <button
          onClick={() => disconnect()}
          className="w-full py-4 rounded-2xl border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-black uppercase tracking-widest text-sm transition-all active:scale-95"
        >
          Disconnect Wallet
        </button>

      </div>
    </div>
  );
}

// ─── Beer Card (shows BEER + LP balance) ─────────────────────────────────────
function BeerCard({ beerRaw, address, onOpen }) {
  const ZERO = '0x0000000000000000000000000000000000000000';
  const { data: lpBalance } = useReadContract({
    address: ADDRESSES.BEER_WETH_PAIR,
    abi:     ERC20_ABI,
    functionName: 'balanceOf',
    args:    [address ?? ZERO],
    query:   { enabled: !!address },
  });
  const hasLp = lpBalance != null && lpBalance > 0n;

  return (
    <button
      onClick={onOpen}
      className="bg-hub-dark border-2 border-amber-500/30 hover:border-amber-500 rounded-3xl p-5 shadow-xl text-left transition-all group"
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">$BEER</p>
        <Droplets size={14} className="text-amber-500/40 group-hover:text-amber-400 transition-colors" />
      </div>
      <p className="font-black text-white text-3xl">{beerRaw != null ? fmtBeer(beerRaw) : '—'}</p>
      {hasLp && (
        <p className="text-[9px] font-black uppercase tracking-widest text-hub-green/70 mt-1">
          LP: {parseFloat(formatUnits(lpBalance, 18)).toFixed(4)}
        </p>
      )}
      <p className="text-[9px] font-black uppercase tracking-widest text-amber-500/40 group-hover:text-amber-400 mt-1 transition-colors">
        {hasLp ? 'View portfolio →' : 'Manage liquidity →'}
      </p>
    </button>
  );
}

function ActionCard({ icon, title, description, href, internal = false, disabled = false }) {
  const cls = `block bg-white border-2 rounded-2xl p-5 shadow-sm transition-all ${
    disabled
      ? 'border-gray-100 opacity-40 cursor-not-allowed'
      : 'border-gray-200 hover:border-hub-green hover:shadow-md cursor-pointer'
  }`;

  const inner = (
    <>
      <div className="mb-3">{icon}</div>
      <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">{title}</h3>
      <p className="text-xs text-gray-500 font-medium mt-1">{description}</p>
    </>
  );

  if (disabled) return <div className={cls}>{inner}</div>;
  if (internal)  return <a href={href} className={cls}>{inner}</a>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
}

const PCT_BTNS = [0, 25, 50, 75, 100];
function PctButtons({ onSelect }) {
  return (
    <div className="flex gap-1.5 mt-2">
      {PCT_BTNS.map(p => (
        <button key={p} onClick={() => onSelect(p)}
          className="flex-1 py-1 rounded-lg bg-white/10 hover:bg-hub-green text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
          {p}%
        </button>
      ))}
    </div>
  );
}

const safeFmt = (val, decimals = 18) => {
  try { return val != null ? formatUnits(val, decimals) : null; } catch { return null; }
};

const TABS = [
  { id: 'holdings',  label: 'Holdings',  Icon: Droplets  },
  { id: 'liquidity', label: 'Liquidity', Icon: TrendingUp },
  { id: 'staking',   label: 'Staking',   Icon: Lock       },
];

function LiquidityModal({ onClose }) {
  const { address } = useAccount();
  const [tab, setTab]         = useState('holdings');
  const [liqTab, setLiqTab]   = useState('add');
  const [beerInput, setBeerInput] = useState('');
  const [ethInput,  setEthInput]  = useState('');
  const [lpInput,   setLpInput]   = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const ZERO = '0x0000000000000000000000000000000000000000';

  const { data: ethBal  } = useBalance({ address, query: { enabled: !!address } });
  const { data: beerBal } = useReadContract({ address: ADDRESSES.BEER_TOKEN,     abi: BEER_TOKEN_ABI, functionName: 'balanceOf',  args: [address ?? ZERO], query: { enabled: !!address } });
  const { data: reserves, isLoading: reservesLoading } = useReadContract({ address: ADDRESSES.BEER_WETH_PAIR, abi: PAIR_ABI, functionName: 'getReserves' });
  const { data: lpBalance, refetch: refetchLp }        = useReadContract({ address: ADDRESSES.BEER_WETH_PAIR, abi: ERC20_ABI, functionName: 'balanceOf',  args: [address ?? ZERO], query: { enabled: !!address } });
  const { data: lpSupply  }                            = useReadContract({ address: ADDRESSES.BEER_WETH_PAIR, abi: ERC20_ABI, functionName: 'totalSupply' });
  const { data: beerAllow, refetch: refetchBeerAllow } = useReadContract({ address: ADDRESSES.BEER_TOKEN,     abi: BEER_TOKEN_ABI, functionName: 'allowance', args: [address ?? ZERO, ADDRESSES.ROUTER], query: { enabled: !!address } });
  const { data: lpAllow,   refetch: refetchLpAllow   } = useReadContract({ address: ADDRESSES.BEER_WETH_PAIR, abi: ERC20_ABI,      functionName: 'allowance', args: [address ?? ZERO, ADDRESSES.ROUTER], query: { enabled: !!address } });

  // Only treat pool as empty when reserves have loaded AND are actually 0
  const reservesLoaded = reserves != null;
  const [r0, r1]     = reservesLoaded ? reserves : [0n, 0n];
  const hasLiquidity = reservesLoaded && r0 > 0n && r1 > 0n;
  const poolEmpty    = reservesLoaded && r0 === 0n && r1 === 0n;

  // LP position breakdown
  const hasLp      = (lpBalance ?? 0n) > 0n && (lpSupply ?? 0n) > 0n;
  const lpShare    = hasLp ? Number(lpBalance) / Number(lpSupply) : 0;        // fraction 0–1
  const lpBeer     = hasLp ? (lpBalance * r0) / lpSupply : 0n;
  const lpEth      = hasLp ? (lpBalance * r1) / lpSupply : 0n;
  const lpSharePct = (lpShare * 100).toFixed(4);

  const beerWei = useMemo(() => { try { return beerInput ? parseUnits(beerInput, 18) : 0n; } catch { return 0n; } }, [beerInput]);
  const ethWei  = useMemo(() => { try { return ethInput  ? parseUnits(ethInput,  18) : 0n; } catch { return 0n; } }, [ethInput]);
  const lpWei   = useMemo(() => { try { return lpInput   ? parseUnits(lpInput,   18) : 0n; } catch { return 0n; } }, [lpInput]);

  const ethRequired  = hasLiquidity && beerWei > 0n ? (beerWei * r1) / r0 : ethWei;
  const expectedBeer = (lpSupply ?? 0n) > 0n && lpWei > 0n ? (lpWei * r0) / lpSupply : 0n;
  const expectedEth  = (lpSupply ?? 0n) > 0n && lpWei > 0n ? (lpWei * r1) / lpSupply : 0n;

  const needsBeerApproval = beerWei > 0n && (beerAllow ?? 0n) < beerWei;
  const needsLpApproval   = lpWei   > 0n && (lpAllow   ?? 0n) < lpWei;

  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { writeContract: writeAdd,     data: addHash }     = useWriteContract();
  const { writeContract: writeRemove,  data: removeHash }  = useWriteContract();

  const { isLoading: approving, isSuccess: approved } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: adding,    isSuccess: addDone }  = useWaitForTransactionReceipt({ hash: addHash });
  const { isLoading: removing,  isSuccess: removeDone}= useWaitForTransactionReceipt({ hash: removeHash });

  useEffect(() => {
    if (!approved) return;
    if (pendingAction === 'add')    refetchBeerAllow();
    if (pendingAction === 'remove') refetchLpAllow();
    setPendingAction(null);
  }, [approved]);

  useEffect(() => { if (addDone || removeDone) refetchLp(); }, [addDone, removeDone]);

  const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 1200);
  const slip = (n) => n * 9900n / 10000n;

  const handleAdd = () => {
    if (!beerWei || (!hasLiquidity && !ethWei)) return;
    if (needsBeerApproval) {
      setPendingAction('add');
      writeApprove({ address: ADDRESSES.BEER_TOKEN, abi: BEER_TOKEN_ABI, functionName: 'approve', args: [ADDRESSES.ROUTER, beerWei] });
      return;
    }
    writeAdd({ address: ADDRESSES.ROUTER, abi: ROUTER_ABI, functionName: 'addLiquidityETH',
      args: [ADDRESSES.BEER_TOKEN, beerWei, slip(beerWei), slip(ethRequired), address, deadline()],
      value: ethRequired });
  };

  const handleRemove = () => {
    if (!lpWei) return;
    if (needsLpApproval) {
      setPendingAction('remove');
      writeApprove({ address: ADDRESSES.BEER_WETH_PAIR, abi: ERC20_ABI, functionName: 'approve', args: [ADDRESSES.ROUTER, lpWei] });
      return;
    }
    writeRemove({ address: ADDRESSES.ROUTER, abi: ROUTER_ABI, functionName: 'removeLiquidityETH',
      args: [ADDRESSES.BEER_TOKEN, lpWei, slip(expectedBeer), slip(expectedEth), address, deadline()] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-hub-dark border-2 border-hub-green/30 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="font-black uppercase tracking-tight text-white text-lg">$BEER Portfolio</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6 shrink-0">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors -mb-px ${
                tab === id ? 'border-hub-green text-hub-green' : 'border-transparent text-stone-500 hover:text-white'
              }`}>
              <Icon size={12} strokeWidth={3} />{label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1 space-y-4">

          {/* ── Holdings ── */}
          {tab === 'holdings' && (
            <>
              {/* Balances */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">$BEER Balance</p>
                  <p className="font-black text-white text-2xl">{beerBal != null ? fmtBeer(beerBal) : '—'}</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">ETH Balance</p>
                  <p className="font-black text-white text-2xl">{ethBal ? fmtEth(ethBal.value) : '—'}</p>
                </div>
              </div>

              {/* LP Position */}
              <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-hub-green">LP Position — BEER/ETH</p>
                  {hasLp && (
                    <span className="text-[10px] font-black text-hub-green bg-hub-green/10 px-2 py-0.5 rounded-md">
                      {lpSharePct}% of pool
                    </span>
                  )}
                </div>
                {!reservesLoaded || reservesLoading ? (
                  <p className="px-4 pb-4 text-stone-500 text-xs font-bold">Loading pool data…</p>
                ) : !hasLp ? (
                  <p className="px-4 pb-4 text-stone-500 text-xs font-bold">No LP tokens in this wallet.</p>
                ) : (
                  <div className="px-4 pb-4 space-y-2 mt-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400 font-bold">LP Tokens</span>
                      <span className="text-white font-black">{parseFloat(formatUnits(lpBalance, 18)).toFixed(6)}</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400 font-bold">$BEER in pool</span>
                      <span className="text-amber-400 font-black">{fmtBeer(lpBeer)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400 font-bold">ETH in pool</span>
                      <span className="text-white font-black">{fmtEth(lpEth)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Pool reserves */}
              <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Total Pool Reserves</p>
                {reservesLoading || !reservesLoaded ? (
                  <p className="text-stone-500 text-xs font-bold">Loading…</p>
                ) : poolEmpty ? (
                  <p className="text-amber-400 text-xs font-bold">Pool is currently empty.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400 font-bold">$BEER</span>
                      <span className="text-white font-black">{fmtBeer(r0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400 font-bold">ETH</span>
                      <span className="text-white font-black">{fmtEth(r1)}</span>
                    </div>
                    {r0 > 0n && r1 > 0n && (
                      <div className="flex justify-between text-sm pt-1 border-t border-white/10">
                        <span className="text-stone-400 font-bold">Price</span>
                        <span className="text-hub-green font-black">
                          {(Number(formatUnits(r1, 18)) / Number(formatUnits(r0, 18))).toFixed(8)} ETH / BEER
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button onClick={() => setTab('liquidity')}
                className="w-full py-3 rounded-xl bg-hub-green text-white font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all">
                Manage Liquidity →
              </button>
            </>
          )}

          {/* ── Liquidity ── */}
          {tab === 'liquidity' && (
            <>
              <div className="flex rounded-xl overflow-hidden border border-white/10">
                {['add', 'remove'].map(t => (
                  <button key={t} onClick={() => setLiqTab(t)}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${liqTab === t ? 'bg-hub-green text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                    {t}
                  </button>
                ))}
              </div>

              {liqTab === 'add' ? (
                <div className="space-y-3">
                  {reservesLoading || !reservesLoaded ? (
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest bg-white/5 rounded-xl px-3 py-2">Loading pool data…</p>
                  ) : poolEmpty ? (
                    <p className="text-amber-400 text-xs font-bold uppercase tracking-widest bg-amber-500/10 rounded-xl px-3 py-2">
                      Pool is empty — you set the initial price
                    </p>
                  ) : null}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">$BEER Amount</label>
                      <span className="text-[10px] font-black text-amber-400">Balance: {beerBal != null ? Math.round(Number(safeFmt(beerBal))) : '—'}</span>
                    </div>
                    <input type="number" min="0" placeholder="0" value={beerInput} onChange={e => setBeerInput(e.target.value)}
                      className="w-full bg-white/10 text-white placeholder-white/20 font-black rounded-xl px-4 py-3 border border-white/10 focus:outline-none focus:border-hub-green transition-colors" />
                    <PctButtons onSelect={p => {
                      const n = beerBal != null ? Math.round(Number(safeFmt(beerBal)) * p / 100) : 0;
                      setBeerInput(n > 0 ? n.toString() : '0');
                    }} />
                  </div>
                  {hasLiquidity ? (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">ETH Required (at market rate)</p>
                      <p className="font-black text-white text-lg">{beerWei > 0n ? formatUnits(ethRequired, 18) : '—'}</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">ETH Amount (sets initial price)</label>
                        <span className="text-[10px] font-black text-stone-400">Balance: {ethBal != null ? parseFloat(safeFmt(ethBal.value)).toFixed(4) : '—'}</span>
                      </div>
                      <input type="number" min="0" placeholder="0" value={ethInput} onChange={e => setEthInput(e.target.value)}
                        className="w-full bg-white/10 text-white placeholder-white/20 font-black rounded-xl px-4 py-3 border border-white/10 focus:outline-none focus:border-hub-green transition-colors" />
                    </div>
                  )}
                  <button onClick={handleAdd} disabled={approving || adding || !beerWei || (!hasLiquidity && !ethWei)}
                    className="w-full py-4 bg-hub-green hover:bg-hub-light disabled:opacity-40 text-white font-black uppercase tracking-widest text-sm rounded-xl transition-all active:scale-95">
                    {approving ? 'Approving…' : adding ? 'Adding Liquidity…' : needsBeerApproval ? 'Approve $BEER' : 'Add Liquidity'}
                  </button>
                  {addDone && <p className="text-emerald-400 text-xs font-black uppercase tracking-widest text-center">Liquidity added!</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Your LP Balance</p>
                    <p className="font-black text-white">{lpBalance != null ? parseFloat(formatUnits(lpBalance, 18)).toFixed(6) : '—'}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">LP to Remove</label>
                      <span className="text-[10px] font-black text-hub-green">Balance: {lpBalance != null ? parseFloat(safeFmt(lpBalance)).toFixed(6) : '—'}</span>
                    </div>
                    <input type="number" min="0" placeholder="0" value={lpInput} onChange={e => setLpInput(e.target.value)}
                      className="w-full bg-white/10 text-white placeholder-white/20 font-black rounded-xl px-4 py-3 border border-white/10 focus:outline-none focus:border-hub-green transition-colors" />
                    <PctButtons onSelect={p => {
                      const amount = (lpBalance ?? 0n) * BigInt(p) / 100n;
                      setLpInput(p === 0 ? '0' : formatUnits(amount, 18));
                    }} />
                  </div>
                  {lpWei > 0n && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">You'll receive (~)</p>
                      <div className="flex justify-between"><span className="text-sm text-white/60 font-bold">$BEER</span><span className="text-sm font-black text-white">{formatUnits(expectedBeer, 18)}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-white/60 font-bold">ETH</span><span className="text-sm font-black text-white">{formatUnits(expectedEth, 18)}</span></div>
                    </div>
                  )}
                  <button onClick={handleRemove} disabled={approving || removing || !lpWei}
                    className="w-full py-4 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-40 font-black uppercase tracking-widest text-sm rounded-xl transition-all active:scale-95">
                    {approving ? 'Approving…' : removing ? 'Removing…' : needsLpApproval ? 'Approve LP Token' : 'Remove Liquidity'}
                  </button>
                  {removeDone && <p className="text-emerald-400 text-xs font-black uppercase tracking-widest text-center">Liquidity removed!</p>}
                </div>
              )}
            </>
          )}

          {/* ── Staking ── */}
          {tab === 'staking' && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-hub-green/10 flex items-center justify-center">
                <Lock size={32} className="text-hub-green/40" />
              </div>
              <div>
                <p className="text-white font-black text-lg uppercase tracking-tight">Staking Coming Soon</p>
                <p className="text-stone-500 text-sm font-medium mt-1 max-w-xs">
                  Lock $BEER or LP tokens to earn rewards. Feature under development.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
