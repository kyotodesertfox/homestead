import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, BadgeCheck, Users, ShoppingBag, Repeat, ArrowLeftRight, ExternalLink, Wallet, LayoutDashboard, ArrowRight } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { ADDRESSES, MARKETPLACE_ABI, NFT_ABI } from '../../contracts';

const IPFS_GW = 'https://ipfs.io/ipfs/';
const resolveIpfs = (uri) => uri?.startsWith('ipfs://') ? uri.replace('ipfs://', IPFS_GW) : uri;

async function fetchMeta(tokenUri) {
  try {
    const m = await fetch(resolveIpfs(tokenUri)).then(r => r.json());
    return {
      name:  m?.name  ?? null,
      image: m?.image ? resolveIpfs(m.image) : null,
      style: m?.attributes?.find(a => a.trait_type === 'Style')?.value ?? null,
    };
  } catch { return null; }
}

// Lightweight listing card — teaser only, full interaction lives on /market
function FeaturedListingCard({ id }) {
  const [meta,   setMeta]   = useState(null);
  const [imgErr, setImgErr] = useState(false);

  const { data: listing } = useReadContract({
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
    fetchMeta(tokenUri).then(m => m && setMeta(m));
  }, [tokenUri]);

  if (!listing) return null;
  const [,, price,, inventoryCount, active] = listing;
  if (!active) return null;

  const inStock  = inventoryCount != null && inventoryCount > 0n;
  const priceStr = price != null ? formatUnits(price, 18) : '—';

  return (
    <Link
      to="/market"
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {meta?.image && !imgErr ? (
          <img
            src={meta.image}
            alt={meta.name ?? 'Homestead product'}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={48} className="text-gray-200" />
          </div>
        )}
        <span className={`absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg backdrop-blur-sm ${
          inStock ? 'bg-hub-green text-white' : 'bg-gray-900/70 text-white/60'
        }`}>
          {inStock ? `${inventoryCount?.toString()} available` : 'Sold Out'}
        </span>
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <h3 className="text-gray-900 font-black text-lg leading-tight">
          {meta?.name ?? 'Homestead Product'}
        </h3>
        {meta?.style && (
          <p className="text-hub-green text-xs font-black uppercase tracking-widest">{meta.style}</p>
        )}
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Token Price</p>
            <p className="text-gray-900 font-black">{priceStr} BEER</p>
          </div>
          <span className="text-hub-green text-xs font-black uppercase tracking-widest">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

function FeaturedListings() {
  const { data: nextId } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'nextListingId',
    query:   { enabled: !!ADDRESSES.MARKETPLACE },
  });

  const listingIds = nextId != null
    ? Array.from({ length: Math.min(Number(nextId), 3) }, (_, i) => i)
    : [];

  if (listingIds.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
        <ShoppingBag size={36} className="text-hub-green mx-auto mb-4 opacity-30" />
        <p className="text-gray-400 font-medium text-sm">First listings coming soon.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {listingIds.map(id => (
        <FeaturedListingCard key={id} id={id} />
      ))}
    </div>
  );
}

// ─── Static data ──────────────────────────────────────────────────────────────

const portals = [
  { name: 'Beer Exchange', token: '$BEER', description: 'Craft homebrew, tokenized. Each token redeemable for a real bottle.', href: '/beer/', color: 'border-amber-400 text-amber-500', dot: 'bg-amber-400' },
  { name: 'Egg Exchange',  token: '$EGG',  description: 'Pasture-raised eggs from a private homestead. One token, one egg.',   href: '/egg/', color: 'border-sky-400 text-sky-500', dot: 'bg-sky-400' },
  { name: 'Spa Exchange',  token: '$SPA',  description: 'Handcrafted spa goods from the homestead. Each token redeemable for a real product.', href: '/spa/', color: 'border-purple-400 text-purple-500', dot: 'bg-purple-400' },
];

const features = [
  { icon: <ShoppingBag size={28} />, title: 'Market',  text: 'Browse all open listings across the Homestead ecosystem.',            to: '/market' },
  { icon: <Repeat size={28} />,      title: 'Swap',    text: 'Trade any Homestead token directly — $BEER, $EGG, and more.',         to: '/swap'   },
  { icon: <ArrowLeftRight size={28} />, title: 'Bridge', text: 'Move ETH from any exchange into Taiko in under two minutes.',       to: '/bridge' },
];

const TABS = ['Exchange', 'Portals'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { open }                  = useAppKit();
  const { isConnected, address }  = useAccount();
  const navigate                  = useNavigate();
  const [activeTab, setActiveTab] = useState('Exchange');

  const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="bg-white border-t-8 border-hub-green shadow-2xl rounded-b-lg p-8 md:p-14 mb-12">
          <p className="text-hub-green text-xs font-black uppercase tracking-widest mb-4">
            Direct. Local. No middlemen.
          </p>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900 mb-6 leading-none">
            Grown here.<br />Sold here.
          </h1>
          <p className="text-lg text-gray-700 font-medium leading-relaxed mb-3 max-w-2xl">
            The eggs at your grocery store sat in a truck for three weeks. These didn't.
          </p>
          <p className="text-gray-500 font-medium leading-relaxed max-w-2xl mb-8">
            Homestead is a direct market for local producers — brewers, farmers, and homesteaders
            who grow and make for themselves first, and sell what they'd put on their own table.
            No distributor. No markup. No middleman taking a cut on the way to your door.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/market"
              className="inline-flex items-center gap-2 bg-hub-green text-white font-black py-3 px-8 uppercase tracking-widest hover:bg-green-700 transition-all shadow-md rounded"
            >
              See What's for Sale
            </Link>
            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-2 border-2 border-gray-900 text-gray-900 font-black py-3 px-8 uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all rounded"
            >
              I'm a Producer
            </button>
          </div>
        </section>

        {/* ── WHY DIFFERENT ─────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="text-hub-green mb-4"><Leaf size={28} strokeWidth={2} /></div>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                Full nutrition.<br />No compromise.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                Commercial distribution forces corner-cutting — shelf life, transport, regulation.
                Homestead producers grow without that overhead. What you get is what they eat.
              </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="text-hub-green mb-4"><BadgeCheck size={28} strokeWidth={2} /></div>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                You pay the farmer.<br />Not the chain.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                Distributor. Wholesaler. Retailer. Each takes a cut. By the time it reaches the shelf
                the producer saw a fraction of what you paid. Here, you pay them directly.
              </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="text-hub-green mb-4"><Users size={28} strokeWidth={2} /></div>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                Their reputation.<br />Your confidence.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                Your neighbor trusts a producer because they know them. Homestead lets that trust
                travel — to buyers who've never met them, backed by every batch they've delivered.
              </p>
            </div>
          </div>
        </section>

        {/* ── FROM THE HOMESTEAD ────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900">
                From the Homestead
              </h2>
              <p className="text-gray-500 text-sm font-medium mt-1">Backed. Verified. Ready to claim.</p>
            </div>
            <Link to="/market" className="text-hub-green text-sm font-black uppercase tracking-widest hover:underline flex items-center gap-1">
              Browse all <ArrowRight size={14} strokeWidth={3} />
            </Link>
          </div>
          <FeaturedListings />
        </section>

        {/* ── WHY NOT JUST CASH ─────────────────────────────────────────── */}
        <section className="mb-12 bg-gray-900 rounded-2xl p-8 md:p-12 text-white">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-4">
            We take cash. It just goes to the back of the line.
          </h2>
          <p className="text-white/70 font-medium leading-relaxed mb-4 max-w-2xl">
            Token holders already committed. They bought in when demand was lower, locked their price,
            and their place in line is provable on-chain. The cash buyer pays today's market price
            and gets whatever's left. That's not a punishment — that's how real demand works.
          </p>
          <p className="text-white/70 font-medium leading-relaxed mb-4 max-w-2xl">
            For the producer, outstanding tokens are visible backlog — proof of real demand before
            the next batch even starts. No guessing. No overproducing for a distributor who might
            not take it. The market tells you exactly what to grow next.
          </p>
          <p className="text-white font-black leading-relaxed max-w-2xl text-lg">
            The token price is the floor. Cash works when it beats it.
            For the first time, the producer has leverage.
          </p>
        </section>

        {/* ── BECOME THE SUPPLY ─────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 mb-3">
              Buyers become producers.<br />That's how the market grows.
            </h2>
            <p className="text-gray-500 font-medium leading-relaxed max-w-2xl">
              The neighbor who buys your eggs today could be selling you tomatoes next season.
              Every producer who joins brings new supply. Every buyer who holds a token signals
              real demand. The more people who participate — on either side — the less anyone
              depends on a supply chain that was never built for them.
            </p>
            <p className="text-gray-500 font-medium leading-relaxed max-w-2xl mt-3">
              You don't have to grow at scale. You don't need a commercial kitchen or a distributor
              relationship. If you produce more than you consume, Homestead is your market.
            </p>
          </div>
        </section>

        {/* ── REPUTATION ────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <p className="text-hub-green text-xs font-black uppercase tracking-widest mb-3">Not just farmers</p>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                Vetted service providers.<br />Same market, same rules.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                A carpenter. An electrician. A mechanic. Anyone who produces more than they consume —
                in goods or in skills — can participate. Homestead isn't limited to what grows in the ground.
                It's for anyone the current system undervalues.
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <p className="text-hub-green text-xs font-black uppercase tracking-widest mb-3">Your stake is your reputation</p>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                Built by you.<br />Not assigned by a bank.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                Every transaction, every delivered batch, every redeemed token adds to your on-chain
                standing. No credit agency decides your tier. No institution gatekeeps your access.
                Your history is what you've actually done — verifiable, neutral, and yours.
              </p>
            </div>
          </div>
        </section>

        {/* ── HOW TO GET IN ─────────────────────────────────────────────── */}
        <section className="mb-12 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-8 py-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900">
              How do I participate?
            </h2>
            <p className="text-gray-500 text-sm font-medium mt-1">
              No application. No approval committee. No fee paid to a gatekeeper for access.
              Your trust is an investment proven by math.
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            <div className="px-8 py-6 flex gap-5">
              <span className="text-hub-green font-black text-2xl shrink-0">01</span>
              <div>
                <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">Stake ETH</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                  Deposit ETH into the protocol. You receive a credential token that reflects your
                  standing — not a receipt, not a yield instrument. Proof that you have skin in the game.
                  This is your investment in your own reputation.
                </p>
              </div>
            </div>
            <div className="px-8 py-6 flex gap-5">
              <span className="text-hub-green font-black text-2xl shrink-0">02</span>
              <div>
                <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">Back your production</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                  Open a lot against your stake. The collateral ratio is enforced by math, not a loan officer.
                  Production tokens are minted — each one a redeemable promise backed by your stake.
                  No rehypothecation. One token, one real thing.
                </p>
              </div>
            </div>
            <div className="px-8 py-6 flex gap-5">
              <span className="text-hub-green font-black text-2xl shrink-0">03</span>
              <div>
                <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">List and sell direct</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                  Put your goods on the market. The token price is what real demand says your
                  production is worth — not a distributor's offer, not a grocery store margin that
                  squeezes both sides. Cash is welcome when it beats that price. Below it is a
                  lowball. The friction of paying in crypto is worth it because what you're buying
                  is genuinely better: full nutrition, grown without compromise, from someone who
                  eats what they sell. You pay a fair price directly to the producer. They keep it.
                  Every fulfilled order builds your on-chain track record — portable, verifiable,
                  and not controlled by any platform that can revoke it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRODUCER CTA ──────────────────────────────────────────────── */}
        <section className="mb-12 bg-white border-l-8 border-hub-green rounded-r-2xl p-8 md:p-10 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-gray-900 mb-3 leading-snug">
            You grow it.<br />Demand prices it.<br />You keep it.
          </h2>
          <p className="text-gray-500 font-medium leading-relaxed mb-6 max-w-xl">
            A distributor pays you their price — fixed, negotiated down, regardless of how good your
            product is or how many people want it. On Homestead, the token price reflects real market
            demand. When demand outpaces your supply, the price rises — and that value goes to you,
            not the middleman who got there first.
          </p>
          {isConnected ? (
            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-2 bg-hub-green hover:bg-green-700 text-white font-black py-3 px-8 rounded uppercase tracking-widest transition-all shadow-md"
            >
              <LayoutDashboard size={16} />
              {formatAddress(address)}
            </button>
          ) : (
            <button
              onClick={() => open()}
              className="inline-flex items-center gap-2 bg-hub-green hover:bg-green-700 text-white font-black py-3 px-8 rounded uppercase tracking-widest transition-all shadow-md"
            >
              <Wallet size={16} />
              Get Started
            </button>
          )}
        </section>

        {/* ── EXCHANGE TOOLS ────────────────────────────────────────────── */}
        <section className="mb-4 bg-white shadow-md rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Exchange Tools</p>
          </div>
          <div className="flex border-b border-gray-100">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-all border-b-4 ${
                  activeTab === tab
                    ? 'border-hub-green text-hub-green bg-white'
                    : 'border-transparent text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeTab === 'Exchange' && (
              <div className="grid md:grid-cols-3 gap-4">
                {features.map((f) => (
                  <Link key={f.title} to={f.to}
                    className="group border border-gray-100 rounded-xl p-5 hover:shadow-md hover:border-hub-green transition-all"
                  >
                    <div className="text-hub-green mb-3 group-hover:scale-110 transition-transform inline-block">
                      {f.icon}
                    </div>
                    <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">{f.title}</h3>
                    <p className="text-gray-500 text-sm font-medium leading-relaxed">{f.text}</p>
                  </Link>
                ))}
              </div>
            )}
            {activeTab === 'Portals' && (
              <div className="grid md:grid-cols-3 gap-4">
                {portals.map((p) => (
                  <a key={p.name} href={p.href} target="_blank" rel="noopener noreferrer"
                    className={`group border-2 ${p.color.split(' ')[0]} rounded-xl p-5 hover:shadow-md transition-all`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />
                      <span className="font-black uppercase tracking-widest text-sm text-gray-900">{p.name}</span>
                      <ExternalLink size={14} className="ml-auto text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                    <p className="text-gray-500 text-sm font-medium leading-relaxed">{p.description}</p>
                    <div className={`mt-3 text-xs font-black uppercase tracking-widest ${p.color.split(' ')[1]}`}>
                      {p.token} →
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>


      </div>
    </div>
  );
}
