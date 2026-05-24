import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Wallet, Copy, CheckCheck, ExternalLink, ArrowUpDown, Beer, Egg, Flame, X, Droplets, TrendingUp, Lock, ShoppingBag, MessageSquare, ChevronRight, PackageOpen, Settings } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useBalance, useChainId, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, useDisconnect, usePublicClient } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { ADDRESSES, BEER_TOKEN_ABI, ERC20_ABI, PAIR_ABI, ROUTER_ABI, MARKETPLACE_ABI, NFT_ABI, TREASURY_ABI } from '../../contracts';
import MessagesPanel      from '../../components/MessagesPanel';
import StakePanel         from '../../components/StakePanel';
import OrderTrackingModal from '../../components/OrderTrackingModal';

const HUB_CHAIN_ID = 167000;

function fmt(addr)    { return `${addr.slice(0, 6)}...${addr.slice(-4)}`; }
function fmtEth(wei)  { return parseFloat(formatUnits(wei, 18)).toFixed(4); }
function fmtBeer(wei) { const n = parseFloat(formatUnits(wei, 18)); return n % 1 === 0 ? n.toFixed(0) : n.toFixed(4); }

const IPFS_GW = 'https://ipfs.io/ipfs/';
const resolveIpfs = (uri) => uri?.startsWith('ipfs://') ? uri.replace('ipfs://', IPFS_GW) : uri;
async function fetchNftMeta(tokenUri) {
  try {
    const m = await fetch(resolveIpfs(tokenUri)).then(r => r.json());
    return {
      name:        m?.name        ?? null,
      description: m?.description ?? null,
      image:       m?.image       ? resolveIpfs(m.image) : null,
      style:       m?.attributes?.find(a => a.trait_type === 'Style')?.value ?? null,
      abv:         m?.attributes?.find(a => a.trait_type === 'ABV')?.value   ?? null,
      ibu:         m?.attributes?.find(a => a.trait_type === 'IBU')?.value   ?? null,
    };
  } catch { return null; }
}

export default function ProfilePage() {
  const { open }                        = useAppKit();
  const { disconnect }                  = useDisconnect();
  const { isConnected, address, chain } = useAccount();
  const chainId                         = useChainId();
  const [copied, setCopied]             = useState(false);
  const [showLiquidity, setShowLiquidity] = useState(false);
  const [showMessages,  setShowMessages]  = useState(false);
  const [showStake,     setShowStake]     = useState(false);

  const { data: ethBalance }    = useBalance({ address, query: { enabled: !!address } });
  const { data: cumulativeStake } = useReadContract({
    address: ADDRESSES.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'cumulativeStake',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address && !!ADDRESSES.TREASURY },
  });
  const { data: beerRaw } = useReadContract({
    address: ADDRESSES.BEER_TOKEN,
    abi: BEER_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address && !!ADDRESSES.BEER_TOKEN },
  });
  const { data: treasuryOwner } = useReadContract({
    address: ADDRESSES.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'owner',
    query: { enabled: !!ADDRESSES.TREASURY },
  });
  const isOwner = !!address && !!treasuryOwner && address.toLowerCase() === treasuryOwner.toLowerCase();

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

        <header className="border-b-8 border-hub-green pb-6 flex items-end justify-between gap-4">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
            Your <span className="text-hub-green">Dashboard</span>
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            {isOwner && (
              <a
                href="/admin"
                className="hidden md:flex items-center gap-2 py-2.5 px-5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-md"
              >
                <Settings size={14} />
                Admin
              </a>
            )}
            <button
              onClick={() => setShowMessages(true)}
              className="flex items-center gap-2 py-2.5 px-5 rounded-2xl bg-hub-green hover:bg-green-700 text-white font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-md"
            >
              <Lock size={14} />
              Messages
            </button>
          </div>
        </header>

        {showMessages && <MessagesPanel onClose={() => setShowMessages(false)} />}
        {showStake    && <StakePanel    onClose={() => setShowStake(false)}    />}

        {/* Wallet card */}
        <section className="bg-hub-dark border-2 border-hub-green/30 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-5">
            <Wallet size={18} className="text-hub-green" />
            <h2 className="font-black uppercase tracking-tight text-white text-sm">Wallet</h2>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${onCorrectChain ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className={`text-xs font-black uppercase tracking-widest ${onCorrectChain ? 'text-emerald-400' : 'text-amber-400'}`}>{chain?.name ?? 'Unknown'}</span>
              </div>
              <button
                onClick={() => disconnect()}
                className="text-xs font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Address — full width */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 w-full">
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
            {/* ETH + Stake — side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">ETH</p>
                <p className="font-black text-white text-2xl">{ethBalance ? fmtEth(ethBalance.value) : '—'}</p>
              </div>
              <button
                onClick={() => setShowStake(true)}
                className="bg-white/5 hover:bg-hub-green/10 border border-hub-green/30 hover:border-hub-green rounded-2xl p-4 text-left transition-all group"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-hub-green mb-1">Stake</p>
                <p className="font-black text-white text-2xl">{cumulativeStake != null ? fmtEth(cumulativeStake) : '—'}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Manage</span>
                  <ChevronRight size={10} className="text-white/30 group-hover:text-hub-green transition-colors" />
                </div>
              </button>
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

        {/* NFT Listings */}
        <MyListingsSection address={address} />

        {/* My Orders */}
        <MyOrdersSection address={address} />

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

      </div>
    </div>
  );
}

// ─── My Orders ───────────────────────────────────────────────────────────────

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

function MyOrdersSection({ address }) {
  const [trackingToken, setTrackingToken] = useState(null);

  const { data: nftBalance } = useReadContract({
    address: ADDRESSES.BEER_NFT,
    abi:     NFT_ABI,
    functionName: 'balanceOf',
    args:    [address ?? ZERO_ADDR],
    query:   { enabled: !!address && !!ADDRESSES.BEER_NFT },
  });

  const indices = nftBalance != null
    ? Array.from({ length: Number(nftBalance) }, (_, i) => BigInt(i))
    : [];

  const { data: tokenIdResults } = useReadContracts({
    contracts: indices.map(i => ({
      address:      ADDRESSES.BEER_NFT,
      abi:          NFT_ABI,
      functionName: 'tokenOfOwnerByIndex',
      args:         [address, i],
    })),
    query: { enabled: indices.length > 0 },
  });

  const tokenIds = tokenIdResults?.map(r => r.result).filter(t => t != null) ?? [];

  const { data: listingResults } = useReadContracts({
    contracts: tokenIds.map(tokenId => ({
      address:      ADDRESSES.MARKETPLACE,
      abi:          MARKETPLACE_ABI,
      functionName: 'getTokenListing',
      args:         [tokenId],
    })),
    query: { enabled: tokenIds.length > 0 && !!ADDRESSES.MARKETPLACE },
  });

  // Only show tokens that were bought through a marketplace listing
  const orderTokens = tokenIds.filter((_, i) => {
    const res = listingResults?.[i]?.result;
    if (!res) return false;
    const [listingId, batchId] = res;
    return listingId > 0n || batchId > 0n;
  });

  if (!address || orderTokens.length === 0) return null;

  return (
    <>
      <section>
        <h2 className="font-black uppercase tracking-tight text-gray-900 text-sm mb-4">My Orders</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {orderTokens.map(tokenId => (
            <OrderCard
              key={tokenId.toString()}
              tokenId={tokenId}
              onClick={() => setTrackingToken(tokenId)}
            />
          ))}
        </div>
      </section>

      {trackingToken != null && (
        <OrderTrackingModal
          tokenId={trackingToken}
          nftContract={ADDRESSES.BEER_NFT}
          onClose={() => setTrackingToken(null)}
        />
      )}
    </>
  );
}

function OrderCard({ tokenId, onClick }) {
  const [meta,   setMeta]   = useState(null);
  const [imgErr, setImgErr] = useState(false);

  const { data: tokenUri } = useReadContract({
    address:      ADDRESSES.BEER_NFT,
    abi:          NFT_ABI,
    functionName: 'tokenURI',
    args:         [tokenId],
    query:        { enabled: tokenId != null },
  });

  const { data: redeemed } = useReadContract({
    address:      ADDRESSES.BEER_NFT,
    abi:          NFT_ABI,
    functionName: 'redeemed',
    args:         [tokenId],
    query:        { enabled: tokenId != null },
  });

  useEffect(() => {
    if (!tokenUri) return;
    fetchNftMeta(tokenUri).then(m => m && setMeta(m));
  }, [tokenUri]);

  const statusLabel = redeemed ? 'Redeemed' : 'In Delivery';
  const statusCls   = redeemed
    ? 'bg-stone-700 text-stone-400'
    : 'bg-hub-green text-white';

  return (
    <button
      onClick={onClick}
      className="bg-hub-dark border-2 border-white/10 hover:border-hub-green/50 rounded-2xl overflow-hidden text-left transition-all group"
    >
      <div className="relative aspect-square bg-black/30 overflow-hidden">
        {meta?.image && !imgErr ? (
          <img
            src={meta.image}
            alt={meta.name ?? 'NFT'}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PackageOpen size={32} className="text-white/10" />
          </div>
        )}
        <span className={`absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${statusCls}`}>
          {statusLabel}
        </span>
      </div>
      <div className="p-3">
        <p className="text-white font-black text-sm truncate leading-tight">
          {meta?.name ?? `Token #${tokenId}`}
        </p>
        <p className="text-stone-500 text-[9px] font-black uppercase tracking-widest mt-0.5">
          #{tokenId.toString()} · Track order →
        </p>
      </div>
    </button>
  );
}

// ─── Staking Position Cards ───────────────────────────────────────────────────

function StakingPositionCards({ address }) {
  const ZERO = '0x0000000000000000000000000000000000000000';

  const { data: staked } = useReadContract({
    address:      ADDRESSES.TREASURY,
    abi:          TREASURY_ABI,
    functionName: 'cumulativeStake',
    args:         [address ?? ZERO],
    query:        { enabled: !!address && !!ADDRESSES.TREASURY },
  });

  const { data: nextBatchId } = useReadContract({
    address:      ADDRESSES.TREASURY,
    abi:          TREASURY_ABI,
    functionName: 'nextBatchId',
    query:        { enabled: !!ADDRESSES.TREASURY },
  });

  const batchCount   = nextBatchId != null ? Number(nextBatchId) : 0;
  const batchIndices = Array.from({ length: batchCount }, (_, i) => i + 1);

  // Read batch structs + claimable amounts in one shot
  const { data: batchResults, refetch: refetchBatches } = useReadContracts({
    contracts: [
      ...batchIndices.map(i => ({
        address: ADDRESSES.TREASURY, abi: TREASURY_ABI,
        functionName: 'batches', args: [BigInt(i)],
      })),
      ...batchIndices.map(i => ({
        address: ADDRESSES.TREASURY, abi: TREASURY_ABI,
        functionName: 'claimableStake', args: [BigInt(i)],
      })),
    ],
    query: { enabled: batchCount > 0 && !!ADDRESSES.TREASURY },
  });

  const batchStructs  = batchResults?.slice(0, batchCount)?.map(r => r.result) ?? [];
  const claimableAmts = batchResults?.slice(batchCount)?.map(r => r.result ?? 0n) ?? [];

  const myBatchIds = batchIndices.filter(
    i => batchStructs[i]?.producer?.toLowerCase() === address?.toLowerCase()
  );
  const totalClaimable = myBatchIds.reduce((sum, i) => sum + (claimableAmts[i] ?? 0n), 0n);

  const { writeContract, data: claimTxHash, isPending: claiming } = useWriteContract();
  const { isLoading: claimConfirming, isSuccess: claimDone } = useWaitForTransactionReceipt({ hash: claimTxHash });

  const firstClaimableId = myBatchIds.find(i => (claimableAmts[i] ?? 0n) > 0n);

  const handleClaim = () => {
    if (firstClaimableId == null) return;
    writeContract({
      address:      ADDRESSES.TREASURY,
      abi:          TREASURY_ABI,
      functionName: 'claimStake',
      args:         [BigInt(firstClaimableId)],
    });
  };

  useEffect(() => { if (claimDone) refetchBatches(); }, [claimDone]);

  const claimPending = claiming || claimConfirming;
  const hasClaimable = totalClaimable > 0n;

  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      {/* ETH Staked */}
      <div className="bg-hub-green/10 rounded-xl p-4 border border-hub-green/20">
        <p className="text-[9px] font-black uppercase tracking-widest text-hub-green/70 mb-1">ETH Staked</p>
        <p className="font-black text-white text-2xl">{staked != null ? fmtEth(staked) : '—'}</p>
        <p className="text-[9px] text-stone-500 font-bold mt-0.5">collateral posted</p>
      </div>

      {/* ETH Claimable */}
      <div className={`rounded-xl p-4 border transition-colors ${
        hasClaimable ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'
      }`}>
        <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
          hasClaimable ? 'text-amber-400' : 'text-stone-500'
        }`}>ETH Claimable</p>
        <p className="font-black text-white text-2xl">{fmtEth(totalClaimable)}</p>
        {hasClaimable ? (
          <button
            onClick={handleClaim}
            disabled={claimPending}
            className="mt-1.5 text-[9px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300 disabled:opacity-40 transition-colors"
          >
            {claimPending ? 'Claiming…' : claimDone ? 'Claimed ✓' : 'Claim →'}
          </button>
        ) : (
          <p className="text-[9px] text-stone-500 font-bold mt-0.5">unlocked on redemption</p>
        )}
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

// ─── My NFT Listings ─────────────────────────────────────────────────────────

function MyListingsSection({ address }) {
  const [selected, setSelected] = useState(null);
  // selected = { id, meta, refetchCard }

  const { data: nextId } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'nextListingId',
    query:   { enabled: !!ADDRESSES.MARKETPLACE && !!address },
  });

  if (!ADDRESSES.MARKETPLACE || !address) return null;

  const listingIds = nextId != null ? Array.from({ length: Number(nextId) }, (_, i) => i) : [];

  return (
    <>
      <section>
        <h2 className="font-black uppercase tracking-tight text-gray-900 text-sm mb-4">My Listings</h2>
        {listingIds.length === 0 ? (
          <p className="text-gray-400 text-sm font-medium">No market listings found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {listingIds.map(id => (
              <MyListingCard
                key={id}
                id={id}
                address={address}
                onSelect={setSelected}
              />
            ))}
          </div>
        )}
      </section>

      {selected && (
        <NFTManageModal
          id={selected.id}
          initialMeta={selected.meta}
          onClose={() => setSelected(null)}
          onUpdate={selected.refetchCard}
        />
      )}
    </>
  );
}

function MyListingCard({ id, address, onSelect }) {
  const [meta,   setMeta]   = useState(null);
  const [imgErr, setImgErr] = useState(false);

  const { data: listing, refetch: refetchListing } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'getListing',
    args:    [BigInt(id)],
    query:   { enabled: !!ADDRESSES.MARKETPLACE },
  });

  const { data: inventory } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'getInventory',
    args:    [BigInt(id)],
    query:   { enabled: !!ADDRESSES.MARKETPLACE },
  });

  const firstTokenId = inventory?.[0];
  const { data: tokenUri } = useReadContract({
    address: ADDRESSES.BEER_NFT,
    abi:     NFT_ABI,
    functionName: 'tokenURI',
    args:    [firstTokenId],
    query:   { enabled: firstTokenId != null },
  });

  useEffect(() => {
    if (!tokenUri) return;
    fetchNftMeta(tokenUri).then(m => m && setMeta(m));
  }, [tokenUri]);

  if (!listing) return null;
  const [, , , proceeds, inventoryCount, active] = listing;

  // Only show if this wallet is the proceeds recipient
  if (!proceeds || proceeds.toLowerCase() !== address?.toLowerCase()) return null;

  const inStock = inventoryCount != null && inventoryCount > 0n;

  return (
    <button
      onClick={() => onSelect({ id, meta, refetchCard: refetchListing })}
      className="bg-hub-dark border-2 border-white/10 hover:border-amber-500/50 rounded-2xl overflow-hidden text-left transition-all group"
    >
      {/* Image */}
      <div className="relative aspect-square bg-black/30 overflow-hidden">
        {meta?.image && !imgErr ? (
          <img
            src={meta.image}
            alt={meta.name ?? 'NFT'}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={32} className="text-white/10" />
          </div>
        )}
        <span className={`absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
          !active    ? 'bg-stone-700 text-stone-400' :
          inStock    ? 'bg-hub-green text-white'      :
                       'bg-amber-500/80 text-white'
        }`}>
          {!active ? 'Unlisted' : inStock ? `${inventoryCount.toString()} left` : 'Sold Out'}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-white font-black text-sm truncate leading-tight">
          {meta?.name ?? 'Loading…'}
        </p>
        {meta?.style && (
          <p className="text-hub-green text-[10px] font-black uppercase tracking-widest truncate mt-0.5">
            {meta.style}
          </p>
        )}
        <p className="text-stone-500 text-[9px] font-black uppercase tracking-widest mt-1.5">
          Listing #{id} · {inStock ? `${inventoryCount.toString()} in stock` : 'out of stock'}
        </p>
      </div>
    </button>
  );
}

function NFTManageModal({ id, initialMeta, onClose, onUpdate }) {
  const ZERO = '0x0000000000000000000000000000000000000000';
  const { address } = useAccount();
  const client = usePublicClient();

  const [imgErr, setImgErr] = useState(false);
  const [meta,   setMeta]   = useState(initialMeta ?? null);

  // Fetch live listing data so status reflects post-TX state
  const { data: listing, refetch: refetchListing } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'getListing',
    args:    [BigInt(id)],
    query:   { enabled: !!ADDRESSES.MARKETPLACE },
  });

  const { data: inventory } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'getInventory',
    args:    [BigInt(id)],
    query:   { enabled: !!ADDRESSES.MARKETPLACE },
  });

  const firstTokenId = inventory?.[0];
  const { data: tokenUri } = useReadContract({
    address: ADDRESSES.BEER_NFT,
    abi:     NFT_ABI,
    functionName: 'tokenURI',
    args:    [firstTokenId],
    query:   { enabled: firstTokenId != null && !meta },
  });

  useEffect(() => {
    if (!tokenUri || meta) return;
    fetchNftMeta(tokenUri).then(m => m && setMeta(m));
  }, [tokenUri]);

  const [withdrawCount, setWithdrawCount] = useState('');
  const [depositCount,  setDepositCount]  = useState('');
  const [depositError,  setDepositError]  = useState('');
  const [depositing,    setDepositing]    = useState(false);

  const { writeContract, data: txHash, isPending, error: writeErr } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: !!txHash } });

  const { writeContractAsync: writeDepositAsync } = useWriteContract();

  useEffect(() => {
    if (!isSuccess) return;
    setWithdrawCount('');
    refetchListing();
    onUpdate?.();
  }, [isSuccess]);

  // Derive nftContract before hooks (listing may be null; hooks guard with enabled)
  const nftContract = listing?.[0] ?? ZERO;

  const { data: walletNftBal } = useReadContract({
    address: nftContract,
    abi:     NFT_ABI,
    functionName: 'balanceOf',
    args:    [address ?? ZERO],
    query:   { enabled: !!address && !!listing && nftContract !== ZERO },
  });
  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: nftContract,
    abi:     NFT_ABI,
    functionName: 'isApprovedForAll',
    args:    [address ?? ZERO, ADDRESSES.MARKETPLACE ?? ZERO],
    query:   { enabled: !!address && !!listing && !!ADDRESSES.MARKETPLACE && nftContract !== ZERO },
  });

  const maxDeposit = Number(walletNftBal ?? 0n);
  const depositNum = parseInt(depositCount) || 0;
  const canDeposit = depositNum > 0 && depositNum <= maxDeposit;

  const handleDeposit = async () => {
    if (!canDeposit || !address || !client) return;
    setDepositError('');
    setDepositing(true);
    try {
      const tokenIds = await Promise.all(
        Array.from({ length: depositNum }, (_, i) =>
          client.readContract({
            address: nftContract,
            abi:     NFT_ABI,
            functionName: 'tokenOfOwnerByIndex',
            args:    [address, BigInt(i)],
          })
        )
      );
      if (!isApproved) {
        const approveHash = await writeDepositAsync({
          address:      nftContract,
          abi:          NFT_ABI,
          functionName: 'setApprovalForAll',
          args:         [ADDRESSES.MARKETPLACE, true],
        });
        await client.waitForTransactionReceipt({ hash: approveHash });
        refetchApproval();
      }
      await writeDepositAsync({
        address:      ADDRESSES.MARKETPLACE,
        abi:          MARKETPLACE_ABI,
        functionName: 'depositInventory',
        args:         [BigInt(id), tokenIds],
      });
      setDepositCount('');
      refetchListing();
      onUpdate?.();
    } catch (e) {
      setDepositError(e.shortMessage ?? e.message ?? 'Failed');
    } finally {
      setDepositing(false);
    }
  };

  if (!listing) return null;

  const [, , price, , inventoryCount, active] = listing;
  const inStock    = inventoryCount != null && inventoryCount > 0n;
  const maxWithdraw = Number(inventoryCount ?? 0n);
  const priceStr   = price != null ? formatUnits(price, 18) : '—';

  const withdrawNum = parseInt(withdrawCount) || 0;
  const canWithdraw = withdrawNum > 0 && withdrawNum <= maxWithdraw;

  const handleToggle = () => {
    writeContract({
      address: ADDRESSES.MARKETPLACE,
      abi:     MARKETPLACE_ABI,
      functionName: 'setActive',
      args:    [BigInt(id), !active],
    });
  };

  const handleWithdraw = () => {
    writeContract({
      address: ADDRESSES.MARKETPLACE,
      abi:     MARKETPLACE_ABI,
      functionName: 'withdrawInventory',
      args:    [BigInt(id), BigInt(withdrawNum)],
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Left — image */}
        <div className="relative md:w-2/5 aspect-square md:aspect-auto bg-gray-50 shrink-0">
          {meta?.image && !imgErr ? (
            <img
              src={meta.image}
              alt={meta?.name ?? 'NFT'}
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center min-h-[180px]">
              <ShoppingBag size={56} className="text-gray-200" />
            </div>
          )}
          <span className="absolute top-4 left-4 text-[10px] font-black uppercase bg-black/50 text-white px-2.5 py-1 rounded-lg backdrop-blur-sm">
            Listing #{id}
          </span>
          <span className={`absolute top-4 right-4 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg backdrop-blur-sm ${
            active ? 'bg-hub-green text-white' : 'bg-stone-700/80 text-stone-300'
          }`}>
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Right — details + actions */}
        <div className="flex flex-col p-7 overflow-y-auto flex-1 gap-4">

          <button onClick={onClose} className="self-end text-gray-400 hover:text-gray-700 -mt-2 -mr-2 transition-colors">
            <X size={20} />
          </button>

          {/* Name + style */}
          <div>
            <h2 className="text-gray-900 font-black text-xl leading-tight">{meta?.name ?? 'Beer NFT'}</h2>
            {meta?.style && (
              <p className="text-hub-green text-xs font-black uppercase tracking-widest mt-0.5">{meta.style}</p>
            )}
          </div>

          {/* ABV / IBU */}
          {(meta?.abv != null || meta?.ibu != null) && (
            <div className="flex flex-wrap gap-2">
              {meta.abv != null && (
                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg">
                  {meta.abv}% ABV
                </span>
              )}
              {meta.ibu != null && (
                <span className="bg-sky-50 text-sky-700 border border-sky-200 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg">
                  {meta.ibu} IBU
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {meta?.description && (
            <p className="text-gray-500 text-sm font-medium leading-relaxed">{meta.description}</p>
          )}

          {/* Listing stats */}
          <div className="flex gap-6 border-t border-b border-gray-100 py-4">
            <div>
              <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">Price</p>
              <p className="text-gray-900 font-black text-lg">{priceStr} BEER</p>
            </div>
            <div>
              <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">In Stock</p>
              <p className={`font-black text-lg ${inStock ? 'text-hub-green' : 'text-gray-300'}`}>
                {inventoryCount?.toString() ?? '—'}
              </p>
            </div>
          </div>

          {/* Partial withdraw */}
          {inStock && (
            <div className="space-y-2">
              <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                Withdraw to Wallet
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={`1 – ${maxWithdraw}`}
                  value={withdrawCount}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^\d+$/.test(v)) setWithdrawCount(v);
                  }}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 font-black text-sm outline-none focus:border-hub-green transition-colors"
                />
                <button
                  onClick={handleWithdraw}
                  disabled={!canWithdraw || isPending || confirming}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black uppercase tracking-widest text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 whitespace-nowrap"
                >
                  {isPending || confirming ? '…' : 'Withdraw'}
                </button>
              </div>
              <p className="text-gray-400 text-[10px] font-medium">
                NFTs return to your wallet; listing stays active with reduced stock.
              </p>
            </div>
          )}

          {/* Deposit from wallet */}
          {maxDeposit > 0 && (
            <div className="space-y-2">
              <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                Deposit from Wallet
                <span className="ml-2 text-gray-300 normal-case font-medium">{maxDeposit} available</span>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={`1 – ${maxDeposit}`}
                  value={depositCount}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^\d+$/.test(v)) setDepositCount(v);
                  }}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 font-black text-sm outline-none focus:border-hub-green transition-colors"
                />
                <button
                  onClick={handleDeposit}
                  disabled={!canDeposit || depositing}
                  className="px-5 py-2.5 rounded-xl bg-hub-green hover:brightness-110 text-white font-black uppercase tracking-widest text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 whitespace-nowrap"
                >
                  {depositing ? '…' : isApproved ? 'Deposit' : 'Approve & Deposit'}
                </button>
              </div>
              {depositError && <p className="text-red-400 text-xs font-medium">{depositError}</p>}
              <p className="text-gray-400 text-[10px] font-medium">
                {!isApproved ? 'Two txs: approve Marketplace, then deposit.' : 'NFTs move from your wallet into the listing.'}
              </p>
            </div>
          )}

          {writeErr && (
            <p className="text-red-400 text-xs font-medium">{writeErr.shortMessage ?? writeErr.message}</p>
          )}
          {isSuccess && (
            <p className="text-hub-green text-xs font-black uppercase tracking-widest">
              {active ? 'Listing is now active.' : 'Listing paused.'}
            </p>
          )}

          <button
            onClick={handleToggle}
            disabled={isPending || confirming}
            className={`w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 ${
              active
                ? 'border-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-white'
                : 'bg-hub-green text-white hover:brightness-110'
            }`}
          >
            {isPending || confirming ? 'Confirming…' : active ? 'Unlist All' : 'Relist'}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [stakeBottles, setStakeBottles]   = useState('');
  const [stakeEmit,    setStakeEmit]      = useState('');
  const [mintAmount,    setMintAmount]    = useState('');
  const [mintDest,      setMintDest]      = useState('self');
  const [mintRecipient, setMintRecipient] = useState('');

  const { data: isMinter } = useReadContract({
    address: ADDRESSES.BEER_TOKEN,
    abi:     BEER_TOKEN_ABI,
    functionName: 'isMinter',
    args:    [address ?? ZERO],
    query:   { enabled: !!address },
  });

  const { writeContract: writeMint, data: mintTxHash }   = useWriteContract();
  const { isLoading: minting, isSuccess: mintConfirmed } = useWaitForTransactionReceipt({ hash: mintTxHash });

  const handleMint = () => {
    if (!mintAmount || isNaN(mintAmount) || Number(mintAmount) <= 0) return;
    const amount = BigInt(Math.round(Number(mintAmount)));
    if (mintDest === 'pool') {
      writeMint({ address: ADDRESSES.BEER_TOKEN, abi: BEER_TOKEN_ABI, functionName: 'mintToPool',   args: [ADDRESSES.BEER_WETH_PAIR, amount] });
    } else {
      const to = mintDest === 'wallet' ? mintRecipient : address;
      writeMint({ address: ADDRESSES.BEER_TOKEN, abi: BEER_TOKEN_ABI, functionName: 'mintToWallet', args: [to, amount] });
    }
  };

  const mintDisabled = minting || !mintAmount || Number(mintAmount) <= 0
    || (mintDest === 'wallet' && !/^0x[0-9a-fA-F]{40}$/.test(mintRecipient));

  useEffect(() => { if (mintConfirmed) { setMintAmount(''); setMintRecipient(''); } }, [mintConfirmed]);

  const STAKE_RATIO_BPS = 1000; // 10% — placeholder until contract is live
  const stakeEmitNum    = parseInt(stakeEmit, 10) || 0;

  const ZERO = '0x0000000000000000000000000000000000000000';

  const { data: ethBal  } = useBalance({ address, query: { enabled: !!address } });
  const { data: beerBal } = useReadContract({ address: ADDRESSES.BEER_TOKEN, abi: BEER_TOKEN_ABI, functionName: 'balanceOf', args: [address ?? ZERO], query: { enabled: !!address } });

  const { data: reserves,  isLoading: reservesLoading,  isError: reservesError  } = useReadContract({ address: ADDRESSES.BEER_WETH_PAIR, abi: PAIR_ABI,       functionName: 'getReserves',  query: { enabled: !!ADDRESSES.BEER_WETH_PAIR } });
  const { data: lpBalance, isLoading: lpBalLoading,     isError: lpBalError,    refetch: refetchLp } = useReadContract({ address: ADDRESSES.BEER_WETH_PAIR, abi: ERC20_ABI, functionName: 'balanceOf',   args: [address ?? ZERO], query: { enabled: !!address && !!ADDRESSES.BEER_WETH_PAIR } });
  const { data: lpSupply,  isLoading: lpSupLoading,     isError: lpSupError     } = useReadContract({ address: ADDRESSES.BEER_WETH_PAIR, abi: ERC20_ABI, functionName: 'totalSupply',  query: { enabled: !!ADDRESSES.BEER_WETH_PAIR } });
  const { data: beerAllow, refetch: refetchBeerAllow } = useReadContract({ address: ADDRESSES.BEER_TOKEN,     abi: BEER_TOKEN_ABI, functionName: 'allowance', args: [address ?? ZERO, ADDRESSES.ROUTER], query: { enabled: !!address } });
  const { data: lpAllow,   refetch: refetchLpAllow   } = useReadContract({ address: ADDRESSES.BEER_WETH_PAIR, abi: ERC20_ABI,      functionName: 'allowance', args: [address ?? ZERO, ADDRESSES.ROUTER], query: { enabled: !!address } });

  const reservesReady = !reservesLoading && !reservesError;
  const [r0, r1]      = reserves ?? [0n, 0n];

  // Stake calculator — uses live market price so the ETH required is realistic
  const beerPriceEth  = reservesReady && r0 > 0n
    ? Number(formatUnits(r1, 18)) / Number(formatUnits(r0, 18))
    : 0;
  const stakeRequired = stakeEmitNum > 0 && beerPriceEth > 0
    ? (stakeEmitNum * beerPriceEth * STAKE_RATIO_BPS) / 10000
    : 0;
  const hasLiquidity  = reservesReady && reserves != null && r0 > 0n && r1 > 0n;
  const poolEmpty     = reservesReady && reserves != null && r0 === 0n && r1 === 0n;

  const lpReady    = !lpBalLoading && !lpBalError && !lpSupLoading && !lpSupError;
  const hasLp      = lpReady && (lpBalance ?? 0n) > 0n && (lpSupply ?? 0n) > 0n;
  const lpShare    = hasLp ? Number(lpBalance) / Number(lpSupply) : 0;
  // Only compute underlying amounts when reserves are also ready — avoids showing 0 during race
  const lpBeer     = hasLp && reservesReady && reserves != null ? (lpBalance * r0) / lpSupply : null;
  const lpEth      = hasLp && reservesReady && reserves != null ? (lpBalance * r1) / lpSupply : null;
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
      <div className="bg-hub-dark border-2 border-hub-green/30 rounded-3xl w-full max-w-[32rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-4 shrink-0">
          <h2 className="font-black uppercase tracking-tight text-white text-xl">$BEER Portfolio</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors"><X size={22} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-7 shrink-0">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors -mb-px ${
                tab === id ? 'border-hub-green text-hub-green' : 'border-transparent text-stone-500 hover:text-white'
              }`}>
              <Icon size={13} strokeWidth={3} />{label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-7 py-6 flex-1 space-y-4">

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
                <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-widest text-hub-green">LP Position — BEER/ETH</p>
                  {hasLp && (
                    <span className="text-[10px] font-black text-hub-green bg-hub-green/10 px-2 py-0.5 rounded-md">
                      {lpSharePct}% of pool
                    </span>
                  )}
                </div>
                {lpBalLoading || lpSupLoading ? (
                  <p className="px-5 pb-5 text-stone-500 text-sm font-bold">Loading…</p>
                ) : lpBalError || lpSupError ? (
                  <p className="px-5 pb-5 text-red-400 text-sm font-bold">Could not load LP data.</p>
                ) : !hasLp ? (
                  <p className="px-5 pb-5 text-stone-500 text-sm font-bold">No LP tokens in this wallet.</p>
                ) : (
                  <div className="px-5 pb-5 space-y-2 mt-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400 font-bold">LP Tokens</span>
                      <span className="text-white font-black">{parseFloat(formatUnits(lpBalance, 18)).toFixed(6)}</span>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400 font-bold">$BEER in pool</span>
                      <span className="text-amber-400 font-black">
                        {lpBeer == null ? (reservesLoading ? 'Loading…' : '—') : fmtBeer(lpBeer)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400 font-bold">ETH in pool</span>
                      <span className="text-white font-black">
                        {lpEth == null ? (reservesLoading ? 'Loading…' : '—') : parseFloat(formatUnits(lpEth, 18)).toFixed(8)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Pool reserves */}
              <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
                <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">Total Pool Reserves</p>
                {reservesLoading ? (
                  <p className="text-stone-500 text-sm font-bold">Loading…</p>
                ) : reservesError ? (
                  <p className="text-red-400 text-sm font-bold">Could not load reserves.</p>
                ) : poolEmpty ? (
                  <p className="text-amber-400 text-sm font-bold">Pool is currently empty.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400 font-bold">$BEER</span>
                      <span className="text-white font-black">{fmtBeer(r0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400 font-bold">ETH</span>
                      <span className="text-white font-black">{parseFloat(formatUnits(r1, 18)).toFixed(8)}</span>
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
                  {reservesLoading ? (
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest bg-white/5 rounded-xl px-3 py-2">Loading pool data…</p>
                  ) : reservesError ? (
                    <p className="text-red-400 text-xs font-bold uppercase tracking-widest bg-red-500/10 rounded-xl px-3 py-2">Could not load pool — check your network.</p>
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
            <div className="relative">

              {/* Coming-soon notice */}
              <div className="flex items-center gap-3 bg-hub-green/10 border border-hub-green/20 rounded-xl px-4 py-3 mb-5">
                <Lock size={13} className="text-hub-green shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                  Contract deployment pending — preview only
                </p>
              </div>

              {/* Live position cards */}
              <StakingPositionCards address={address} />

              {/* Live calculator — interactive */}
              <div className="mt-5 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">
                  $BEER to Emit (target)
                </label>
                <input
                  type="number" min="0" step="1" placeholder="e.g. 2400"
                  value={stakeEmit}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^\d+$/.test(v)) setStakeEmit(v);
                  }}
                  className="w-full bg-white/10 text-white placeholder-white/20 font-black rounded-xl px-4 py-3 border border-white/10 focus:outline-none focus:border-hub-green transition-colors"
                />
                <div className="flex gap-3">
                  <div className="flex-1 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-0.5">ETH Required</p>
                    <p className="font-black text-white text-sm">
                      {stakeRequired > 0 ? stakeRequired.toFixed(6) : '—'}
                    </p>
                  </div>
                  <div className="flex-1 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-0.5">Wallet Balance</p>
                    <p className="font-black text-white text-sm">{ethBal ? fmtEth(ethBal.value) : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Locked button */}
              <div className="mt-4 opacity-40 pointer-events-none">
                <button disabled className="w-full py-4 bg-hub-green text-white font-black uppercase tracking-widest text-sm rounded-xl">
                  Post ETH Collateral &amp; Brew Batch
                </button>
              </div>

              {/* Mint — only visible to registered minters */}
              {isMinter === true && (
                <div className="mt-5 pt-5 border-t border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame size={13} className="text-amber-400 shrink-0" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Mint $BEER</p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-500/70">
                      Admin
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Amount"
                      value={mintAmount}
                      onChange={e => setMintAmount(e.target.value)}
                      className="flex-1 bg-white/10 text-white placeholder-white/30 font-black rounded-xl px-4 py-3 border border-amber-500/20 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <div className="flex rounded-xl overflow-hidden border border-amber-500/20">
                      {['self', 'wallet', 'pool'].map(d => (
                        <button key={d} onClick={() => setMintDest(d)}
                          className={`px-3 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${mintDest === d ? 'bg-amber-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {mintDest === 'wallet' && (
                    <input
                      type="text"
                      placeholder="0x recipient address"
                      value={mintRecipient}
                      onChange={e => setMintRecipient(e.target.value)}
                      className="w-full bg-white/10 text-white placeholder-white/30 font-mono text-sm rounded-xl px-4 py-3 border border-amber-500/20 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  )}

                  <button
                    onClick={handleMint}
                    disabled={mintDisabled}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white font-black rounded-xl uppercase tracking-widest text-sm transition-all active:scale-95"
                  >
                    {minting ? 'Minting…' : mintConfirmed ? 'Minted ✓' : 'Mint'}
                  </button>

                  <p className="text-[10px] font-bold text-amber-500/30 uppercase tracking-widest">
                    {mintDest === 'pool'   ? 'Tokens go into the BEER/WETH liquidity pool.'
                   : mintDest === 'wallet' ? 'Tokens go to the address entered above.'
                   :                        'Tokens land in your connected wallet.'}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
