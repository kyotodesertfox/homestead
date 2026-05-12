import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Wallet, Copy, CheckCheck, ExternalLink, ArrowUpDown, Beer, Egg, Flame } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useBalance, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, useDisconnect } from 'wagmi';
import { formatUnits } from 'viem';
import { ADDRESSES, BEER_TOKEN_ABI } from '../../contracts';

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

  const { data: ethBalance }  = useBalance({ address, query: { enabled: !!address } });
  const { data: beerBalance } = useBalance({ address, token: ADDRESSES.BEER_TOKEN, query: { enabled: !!address } });

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

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Address</p>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-sm">{fmt(address)}</span>
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

            <div className="flex gap-3">
              <div className="bg-white/5 rounded-2xl p-4 min-w-[110px] border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">ETH</p>
                <p className="font-black text-white text-xl">{ethBalance ? fmtEth(ethBalance.value) : '—'}</p>
              </div>
              <div className="bg-amber-500/10 rounded-2xl p-4 min-w-[110px] border border-amber-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">$BEER</p>
                <p className="font-black text-white text-xl">{beerBalance ? fmtBeer(beerBalance.value) : '—'}</p>
              </div>
            </div>
          </div>
        </section>

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
