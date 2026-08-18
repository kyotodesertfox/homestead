import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, BadgeCheck, Users, ShoppingBag, Repeat, ArrowLeftRight, ExternalLink, ArrowRight, ChevronLeft, ChevronRight, X, ShieldCheck, Fingerprint, Lock, Gift, Sprout } from 'lucide-react';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { ADDRESSES, MARKETPLACE_ABI, NFT_ABI, ERC20_ABI, TOKEN_DEPLOYER_ABI } from '../../contracts';

const HOW_IT_WORKS_STEPS = [
  {
    number: '01',
    title:  'Buy ETH',
    image:  '/onboarding/step-1-buy-eth.png',
    body:   'Start on any major exchange - Coinbase, Kraken, or Binance. Buy a small amount of Ethereum (ETH). You don\'t need much - even $20 is enough to get started.',
    link:   null,
  },
  {
    number: '02',
    title:  'Bridge to Taiko',
    image:  '/onboarding/step-2-bridge.png',
    body:   'Bridging moves your ETH from the main Ethereum network to Taiko - a faster, cheaper layer built on top of it. Think of it like moving money between two bank accounts. It takes about 2 minutes.',
    link:   { label: 'Open Bridge', href: '/bridge', internal: true },
  },
  {
    number: '03',
    title:  'Swap for tokens',
    image:  '/onboarding/step-3-swap.png',
    body:   'Once your ETH is on Taiko, head to our Swap page and trade a little of it for tokens. Tokens are the money of the circle - what you use to buy directly from a producer.',
    link:   { label: 'Go to Swap', href: '/swap', internal: true },
  },
  {
    number: '04',
    title:  'Claim Goods',
    image:  '/onboarding/step-4-redeem.png',
    body:   'Use your tokens to buy a claim from a producer on our marketplace - an NFT that stands for the real thing. Bring it to them and redeem it for the goods. No middleman, no markup.',
    link:   null,
  },
];

function HowItWorksModal({ onClose }) {
  const [step, setStep] = useState(0);
  const s = HOW_IT_WORKS_STEPS[step];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl overflow-hidden max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <div>
            <p className="text-hub-green text-[10px] font-black uppercase tracking-widest">How it works</p>
            <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900">{s.title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={20} /></button>
        </div>

        {/* Step counter */}
        <div className="flex gap-1.5 px-6 mb-4">
          {HOW_IT_WORKS_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1 flex-1 rounded-full transition-all ${i === step ? 'bg-hub-green' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {/* Image */}
        <div className="w-full h-52 bg-gray-50 overflow-hidden">
          {s.image && (
            <img
              src={s.image}
              alt={s.title}
              className="w-full h-full object-cover"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-gray-600 text-sm font-medium leading-relaxed mb-5">{s.body}</p>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setStep(i => Math.max(0, i - 1))}
              className={`text-sm font-black uppercase tracking-widest text-gray-400 hover:text-gray-700 transition-colors ${step === 0 ? 'invisible' : ''}`}
            >
              ← Back
            </button>

            <div className="flex items-center gap-3 ml-auto">
              {s.link && (
                s.link.internal
                  ? <Link to={s.link.href} onClick={onClose} className="text-hub-green text-sm font-black uppercase tracking-widest hover:underline underline-offset-2">{s.link.label} →</Link>
                  : <a href={s.link.href} target="_blank" rel="noopener noreferrer" className="text-hub-green text-sm font-black uppercase tracking-widest hover:underline underline-offset-2">{s.link.label} →</a>
              )}
              {step < HOW_IT_WORKS_STEPS.length - 1
                ? <button onClick={() => setStep(i => i + 1)} className="bg-hub-green text-white font-black py-2 px-6 uppercase tracking-widest hover:bg-green-700 transition-all rounded text-sm">Next</button>
                : <button onClick={onClose} className="bg-hub-green text-white font-black py-2 px-6 uppercase tracking-widest hover:bg-green-700 transition-all rounded text-sm">Done</button>
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const IPFS_GW = 'https://ipfs.io/ipfs/';
const resolveIpfs = (uri) => uri?.startsWith('ipfs://') ? uri.replace('ipfs://', IPFS_GW) : uri;
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

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


// Lightweight listing card - teaser only, full interaction lives on /market
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

  const paymentToken = listing?.[1];
  const { data: rawSymbol } = useReadContract({
    address: paymentToken,
    abi:     ERC20_ABI,
    functionName: 'symbol',
    query:   { enabled: !!paymentToken },
  });

  const firstTokenId = inventory?.[0];
  const { data: tokenUri } = useReadContract({
    address: ADDRESSES.BEERNFT,
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

  const inStock     = inventoryCount != null && inventoryCount > 0n;
  const priceStr    = price != null ? formatUnits(price, 18) : '-';
  const tokenSymbol = rawSymbol ? `$${rawSymbol}` : null;

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
            <p className="text-gray-900 font-black">{priceStr}{tokenSymbol ? ` ${tokenSymbol}` : ''}</p>
          </div>
          <span className="text-hub-green text-xs font-black uppercase tracking-widest">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

function EggSvg() {
  return (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28 drop-shadow-sm">
      <defs>
        <radialGradient id="eggSheenHome" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#e8c99a" />
          <stop offset="60%" stopColor="#c8a070" />
          <stop offset="100%" stopColor="#a07040" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="78" rx="42" ry="52" fill="#c8a882" stroke="#b08050" strokeWidth="1.5" />
      <ellipse cx="60" cy="78" rx="38" ry="48" fill="url(#eggSheenHome)" />
      <ellipse cx="48" cy="62" rx="7" ry="11" fill="white" opacity="0.18" transform="rotate(-15 48 62)" />
    </svg>
  );
}

function SixEggsSvg() {
  const eggs = [
    { cx: 44,  cy: 72,  rot: -6 },
    { cx: 110, cy: 68,  rot:  2 },
    { cx: 176, cy: 73,  rot:  7 },
    { cx: 44,  cy: 158, rot:  5 },
    { cx: 110, cy: 155, rot: -4 },
    { cx: 176, cy: 160, rot:  8 },
  ];
  return (
    <svg viewBox="0 0 220 230" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-3 drop-shadow-sm">
      <defs>
        <radialGradient id="eggSheenSix" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#e8c99a" />
          <stop offset="60%" stopColor="#c8a070" />
          <stop offset="100%" stopColor="#a07040" />
        </radialGradient>
      </defs>
      {eggs.map((e, i) => (
        <g key={i} transform={`rotate(${e.rot} ${e.cx} ${e.cy})`}>
          <ellipse cx={e.cx} cy={e.cy} rx="24" ry="30" fill="#c8a882" stroke="#b08050" strokeWidth="1" />
          <ellipse cx={e.cx} cy={e.cy} rx="21" ry="27" fill="url(#eggSheenSix)" />
          <ellipse cx={e.cx - 6} cy={e.cy - 10} rx="5" ry="7" fill="white" opacity="0.18" transform={`rotate(-15 ${e.cx - 6} ${e.cy - 10})`} />
        </g>
      ))}
    </svg>
  );
}

function HoneyJarSvg() {
  return (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28 drop-shadow-sm">
      <defs>
        <linearGradient id="honeyBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#d99a2b" />
          <stop offset="35%"  stopColor="#f5c451" />
          <stop offset="70%"  stopColor="#e0a72f" />
          <stop offset="100%" stopColor="#b8801f" />
        </linearGradient>
        <linearGradient id="honeyLid" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#8a5a1e" />
          <stop offset="40%"  stopColor="#b8823a" />
          <stop offset="100%" stopColor="#7a4d18" />
        </linearGradient>
      </defs>
      <rect x="34" y="20" width="52" height="15" rx="4" fill="url(#honeyLid)" />
      <rect x="43" y="35" width="34" height="9" fill="#e8b757" />
      <path
        d="M34,44 h52 a6,6 0 0 1 6,6 v56 a10,10 0 0 1 -10,10 h-44 a10,10 0 0 1 -10,-10 v-56 a6,6 0 0 1 6,-6 z"
        fill="url(#honeyBody)" stroke="#a8721c" strokeWidth="1.5"
      />
      <rect x="44" y="55" width="8" height="44" rx="4" fill="white" opacity="0.22" />
    </svg>
  );
}

function FeaturedPlaceholder({ name, tag, priceAmount, tokenSymbol, image }) {
  // No symbol means the token is not deployed yet. Price shows a dash rather
  // than a hardcoded string - the symbol is always read from the contract.
  const priceLabel = tokenSymbol ? `${priceAmount} ${tokenSymbol}` : null;
  return (
    <Link
      to="/market"
      className="group h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-square bg-gradient-to-br from-amber-50 to-yellow-100 overflow-hidden flex items-center justify-center">
        {image ?? <EggSvg />}
        <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-gray-900/70 text-white/60">
          Coming Soon
        </span>
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <h3 className="text-gray-900 font-black text-lg leading-tight">{name}</h3>
        <p className="text-hub-green text-xs font-black uppercase tracking-widest">{tag}</p>
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Token Price</p>
            <p className="text-gray-900 font-black">{priceLabel ?? '-'}</p>
          </div>
          <span className="text-hub-green text-xs font-black uppercase tracking-widest">View →</span>
        </div>
      </div>
    </Link>
  );
}

// Horizontal card rail. Uses native scroll-snap so touch and trackpad work for
// free; the arrows only drive the same scroll for mouse users, and hide at the
// ends so they never suggest more cards than exist.
function CardCarousel({ children }) {
  const track = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd,   setAtEnd]   = useState(true);

  const items = React.Children.toArray(children);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, items.length]);

  const page = (dir) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  const arrow =
    'absolute top-1/2 -translate-y-1/2 z-10 grid place-items-center w-10 h-10 rounded-full ' +
    'bg-white shadow-md border border-gray-100 text-gray-700 hover:text-hub-green hover:border-hub-green transition-colors';

  return (
    <div className="relative">
      <div
        ref={track}
        onScroll={measure}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <div
            key={i}
            className="snap-start shrink-0 w-full sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
          >
            {child}
          </div>
        ))}
      </div>

      {!atStart && (
        <button onClick={() => page(-1)} aria-label="Previous" className={`${arrow} -left-3`}>
          <ChevronLeft size={20} strokeWidth={3} />
        </button>
      )}
      {!atEnd && (
        <button onClick={() => page(1)} aria-label="Next" className={`${arrow} -right-3`}>
          <ChevronRight size={20} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

function FeaturedListings() {
  const { data: nextId } = useReadContract({
    address: ADDRESSES.MARKETPLACE,
    abi:     MARKETPLACE_ABI,
    functionName: 'nextListingId',
    query:   { enabled: !!ADDRESSES.MARKETPLACE },
  });

  const { data: eggRawSymbol } = useReadContract({
    address: ADDRESSES.EGG_TOKEN,
    abi:     ERC20_ABI,
    functionName: 'symbol',
    query:   { enabled: !!ADDRESSES.EGG_TOKEN },
  });
  const eggSymbol = eggRawSymbol ? `$${eggRawSymbol}` : null;

  // HONEY has no contract yet, so there is nothing to read. The literal is a
  // stand-in for the Coming Soon card only - the moment VITE_HONEY_TOKEN is
  // set, the real symbol takes over and this stops being used.
  const { data: honeyRawSymbol } = useReadContract({
    address: ADDRESSES.HONEY_TOKEN,
    abi:     ERC20_ABI,
    functionName: 'symbol',
    query:   { enabled: !!ADDRESSES.HONEY_TOKEN },
  });
  const honeySymbol = honeyRawSymbol ? `$${honeyRawSymbol}` : '$HONEY';

  const listingIds = nextId != null
    ? Array.from({ length: Math.min(Number(nextId), 3) }, (_, i) => i)
    : [];

  return (
    <CardCarousel>
      {listingIds.map(id => (
        <FeaturedListingCard key={id} id={id} />
      ))}
      <FeaturedPlaceholder
        name="One Pound of Raw Honey" tag="Raw · Unfiltered · 1 lb"
        priceAmount={1} tokenSymbol={honeySymbol} image={<HoneyJarSvg />}
      />
      <FeaturedPlaceholder
        name="Single Egg" tag="Grade AA · Free-Range"
        priceAmount={1} tokenSymbol={eggSymbol}
      />
      <FeaturedPlaceholder
        name="Half Dozen Eggs" tag="Grade AA · Free-Range"
        priceAmount={6} tokenSymbol={eggSymbol} image={<SixEggsSvg />}
      />
    </CardCarousel>
  );
}

// ─── Static data ──────────────────────────────────────────────────────────────

// Deterministic color from token address - stable for everyone, no config needed
function addressColor(address) {
  const hex = address.slice(2);
  let n = 0;
  for (let i = 0; i < hex.length; i++) n = (n * 31 + parseInt(hex[i], 16)) & 0xfffff;
  return `hsl(${n % 360}, 65%, 52%)`;
}

function TokenPortalCard({ address }) {
  const { data: symbol } = useReadContract({ address, abi: ERC20_ABI, functionName: 'symbol', query: { enabled: !!address } });
  const { data: name }   = useReadContract({ address, abi: ERC20_ABI, functionName: 'name',   query: { enabled: !!address } });

  if (!symbol || !name) return null;

  const color = addressColor(address);
  const href  = `/${symbol.toLowerCase()}/`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="group border-2 rounded-xl p-5 hover:shadow-md transition-all"
      style={{ borderColor: color }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="font-black uppercase tracking-widest text-sm text-gray-900">{name}</span>
        <ExternalLink size={14} className="ml-auto text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
      <p className="text-gray-500 text-sm font-medium leading-relaxed">
        Physical goods backed 1:1. Each ${symbol} token redeemable for the real thing.
      </p>
      <div className="mt-3 text-xs font-black uppercase tracking-widest" style={{ color }}>
        ${symbol} →
      </div>
    </a>
  );
}

function DynamicPortals() {
  const { data: tokens } = useReadContract({
    address: ADDRESSES.TOKEN_DEPLOYER,
    abi:     TOKEN_DEPLOYER_ABI,
    functionName: 'getAllTokens',
    query:   { enabled: !!ADDRESSES.TOKEN_DEPLOYER },
  });

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {(tokens ?? [])
        .filter(addr => addr.toLowerCase() !== ADDRESSES.STK_HOMESTEAD?.toLowerCase())
        .map(addr => (
          <TokenPortalCard key={addr} address={addr} />
        ))}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col opacity-50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-300 shrink-0" />
          <span className="font-black uppercase tracking-widest text-sm text-gray-400">More Coming</span>
        </div>
        <p className="text-gray-400 text-sm font-medium leading-relaxed">
          New producers joining the ecosystem.
        </p>
        <div className="mt-3 text-xs font-black uppercase tracking-widest text-gray-300">
          Soon →
        </div>
      </div>
    </div>
  );
}

const features = [
  { icon: <ShoppingBag size={28} />, title: 'Market',  text: 'Browse all open listings across the Homestead ecosystem.',            to: '/market' },
  { icon: <Repeat size={28} />,      title: 'Swap',    text: 'Trade any Homestead token directly - $BEER, $EGG, and more.',         to: '/swap'   },
  { icon: <ArrowLeftRight size={28} />, title: 'Bridge', text: 'Move ETH from any exchange into Taiko in under two minutes.',       to: '/bridge' },
];

// The conviction principles - the core of why this is different
const PRINCIPLES = [
  {
    icon:  <Lock size={24} strokeWidth={2} />,
    title: 'You back your word',
    body:  'Every producer puts up a pledge before they sell a thing, held and never spent. It stays behind their promise until they deliver. Skin in the game that is actually on the line - not a terms-of-service page nobody reads.',
  },
  {
    icon:  <Fingerprint size={24} strokeWidth={2} />,
    title: 'A record that remembers',
    body:  'Every batch, every delivery, every hand-off is written down for good. Your standing here is not self-reported and not handed out by an agency. It is the sum of what you have actually done.',
  },
  {
    icon:  <ShieldCheck size={24} strokeWidth={2} />,
    title: 'It cannot be bought',
    body:  'No one can buy standing here, and no one can take yours away. You earn it by delivering, again and again - and it stays with you.',
  },
];

const TABS = ['Exchange', 'Portals'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  useEffect(() => { document.title = 'Homestead - Grown here. Sold here.'; }, []);
  const navigate                  = useNavigate();
  const [activeTab, setActiveTab]           = useState('Exchange');
  const [dealTab, setDealTab]               = useState('producer');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* ── HERO (dark banner box) ──────────────────────────────────────── */}
      <section className="bg-hub-dark relative overflow-hidden rounded-2xl border-t-8 border-hub-green shadow-2xl mb-12">
        {/* subtle accent glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-hub-green/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-20 w-96 h-96 rounded-full bg-hub-light/10 blur-3xl pointer-events-none" />

        <div className="px-8 py-16 md:px-14 md:py-20 relative">
          <p className="text-hub-light text-xs font-black uppercase tracking-[0.25em] mb-6">
            For the people who make things
          </p>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-[0.9] mb-8">
            Grown here.<br />Sold here.
          </h1>
          <p className="text-xl text-white/90 font-semibold leading-relaxed max-w-2xl mb-4">
            Sell what you make without a stall to rent, a distributor to feed, or a gatekeeper to ask.
          </p>
          <p className="text-base text-white/60 font-medium leading-relaxed max-w-2xl mb-10">
            Your goods, your price, your customers - direct. A storefront that stays open all week,
            costs nothing to hold, and builds you a name that stays with you. No middleman. No markup.
            No one deciding whether you get to sell.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-2 bg-hub-green text-white font-black py-3.5 px-8 uppercase tracking-widest hover:bg-hub-light hover:text-hub-dark transition-all shadow-lg rounded"
            >
              Start selling <ArrowRight size={16} strokeWidth={3} />
            </button>
            <Link
              to="/market"
              className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-black py-3.5 px-8 uppercase tracking-widest hover:bg-white hover:text-hub-dark transition-all rounded"
            >
              See what's for sale
            </Link>
          </div>
        </div>
      </section>

      {/* ── THE FARMERS MARKET HOOK ─────────────────────────────────────── */}
      <section className="mb-16">
        <div className="bg-white border-2 border-hub-green/20 rounded-2xl p-8 md:p-12">
          <p className="text-hub-green text-xs font-black uppercase tracking-widest mb-3">Why producers use it</p>
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-gray-900 mb-5 leading-tight max-w-3xl">
            A stall charges you whether<br />the crowd shows or not.
          </h2>
          <p className="text-gray-500 text-base font-medium leading-relaxed max-w-2xl mb-4">
            At the market you pay for the table, haul everything out, and sit all day hoping for foot
            traffic. Whatever does not sell, you carry home.
          </p>
          <p className="text-gray-600 text-base font-medium leading-relaxed max-w-2xl">
            Homestead is a storefront that costs nothing to keep open. You list what you have. It sells
            when someone wants it - this week, next week, whenever. Keep your Saturday stall. This runs
            alongside it: open all week, reaching the people who never made it to the market.
          </p>
        </div>
      </section>

      {/* ── WHY THE MONEY HOLDS ─────────────────────────────────────────── */}
      <section className="mb-16">
        <div className="bg-hub-green/5 border-2 border-hub-green/20 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-gray-900 mb-4 leading-tight max-w-3xl mx-auto">
            Loyalty point value holds until a business folds; cash is just loyalty points from a bigger card.
          </h2>
          <p className="text-gray-600 text-base font-medium leading-relaxed max-w-2xl mx-auto">
            Homestead money does not. Every token is backed by real goods a producer already made -
            eggs, beer, a repair - and that backing is recorded on a public ledger anyone can check.
            Not a promise you take on trust. A claim you can verify, then collect.
          </p>
        </div>
      </section>

      {/* ── CONVICTION (the essence) ──────────────────────────────────── */}
      <section className="mb-16">
        <div className="bg-hub-dark rounded-2xl shadow-2xl p-8 md:p-12 border border-white/5">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <p className="text-hub-light text-xs font-black uppercase tracking-[0.25em]">Why it works</p>
              <a href="/whitepaper" className="text-[11px] font-black uppercase tracking-widest text-hub-light hover:text-white border border-hub-light/30 hover:border-hub-light px-4 py-2 rounded-full transition-all">
                📄 Whitepaper →
              </a>
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white leading-[0.95] mb-5 max-w-3xl">
              Why a stranger trusts you<br />before they have met you.
            </h2>
            <p className="text-white/60 font-medium leading-relaxed max-w-2xl mb-10">
              At the market, people trust you because they can see your face and your goods. At a distance
              they cannot. Your pledge stands in for that handshake. It is what lets someone who has never
              met you take your word, because you have put something of your own behind it - held, never
              spent, and returned the moment you deliver.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {PRINCIPLES.map(p => (
                <div key={p.title} className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="text-hub-light mb-4">{p.icon}</div>
                  <h3 className="text-white font-black uppercase tracking-tight mb-2 text-sm">{p.title}</h3>
                  <p className="text-white/50 text-sm font-medium leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>

            {/* The gifting insight - the thing nobody else can say */}
            <div className="flex items-start gap-4 bg-hub-green/10 border border-hub-green/30 rounded-xl p-6">
              <div className="text-hub-light shrink-0 mt-0.5"><Gift size={22} strokeWidth={2} /></div>
              <p className="text-white/80 text-sm font-medium leading-relaxed">
                <span className="text-white font-black">Even a gift means something here.</span>{' '}
                When you hand someone a token, your pledge stays behind it until they redeem it. So a
                gift is a real act of belief - you only give to someone you trust to follow through,
                because if they never do, it costs you. You cannot fake that, and you cannot buy it.
                It is the truest signal there is.
              </p>
            </div>
          </div>
        </section>

        {/* ── THE PROOF (live market pricing / The Deal) ────────────────── */}
        <section className="mb-16">
          <div className="bg-white border-2 border-hub-green/20 rounded-2xl p-8 md:p-12">
            <p className="text-hub-green text-xs font-black uppercase tracking-widest mb-3">Barter, brought forward</p>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-gray-900 mb-4 leading-tight">
              What you make<br />is what you spend.
            </h2>
            <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-2xl mb-8">
              Trade used to be simple - your eggs for my beer, my welding for your bread. It broke down when the
              beer maker did not want eggs. Homestead fixes that. What you make becomes tokens anyone in the
              circle will take, and every token is still backed by something real. Barter that finally scales,
              with no dollar needed to close the deal.
            </p>

            {/* Tab pills */}
            <div className="flex gap-2 mb-8 flex-wrap">
              {[
                { id: 'producer', label: 'As a Producer' },
                { id: 'buyer',    label: 'As a Buyer' },
              ].map(t => (
                <button key={t.id} onClick={() => setDealTab(t.id)}
                  className={`text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-full border-2 transition-all ${
                    dealTab === t.id
                      ? 'bg-hub-green border-hub-green text-white'
                      : 'border-hub-green/30 text-hub-green hover:border-hub-green bg-transparent'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {dealTab === 'buyer' && (
              <>
                <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-2xl mb-8">
                  You do not have to make something to join. Buy in, and you hold the money of the circle -
                  tokens backed by real goods from real people, not a brand, not a supply chain.
                </p>
                <div className="divide-y divide-hub-green/10">
                  <div className="pb-6 flex gap-5">
                    <span className="text-hub-green font-black text-2xl shrink-0">01</span>
                    <div>
                      <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">Get your tokens</h3>
                      <p className="text-gray-500 text-sm font-medium leading-relaxed">
                        Trade a little ETH for tokens on the Swap page. Tokens are the money here - what everyone
                        in the circle takes.
                      </p>
                    </div>
                  </div>
                  <div className="py-6 flex gap-5">
                    <span className="text-hub-green font-black text-2xl shrink-0">02</span>
                    <div>
                      <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">Pick your maker</h3>
                      <p className="text-gray-500 text-sm font-medium leading-relaxed">
                        Browse real goods from real producers. You are buying from the person who made it, their
                        standing right there for you to see. Here quality is the point, not a claim you have to
                        take on faith.
                      </p>
                    </div>
                  </div>
                  <div className="py-6 flex gap-5">
                    <span className="text-hub-green font-black text-2xl shrink-0">03</span>
                    <div>
                      <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">Claim the real thing</h3>
                      <p className="text-gray-500 text-sm font-medium leading-relaxed">
                        Spend your tokens with a maker and you receive a claim - an NFT they honor when you come to
                        collect. One claim, one real item. No markup, no middleman.
                      </p>
                    </div>
                  </div>
                  <div className="pt-6 flex gap-5">
                    <span className="text-hub-green font-black text-2xl shrink-0">04</span>
                    <div>
                      <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">Redeem or hold</h3>
                      <p className="text-gray-500 text-sm font-medium leading-relaxed">
                        Bring your claim to the maker and walk away with the goods. Or hold your tokens and spend
                        them on anyone else in the circle - they keep their worth because real production stands
                        behind them.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 border-t border-hub-green/10 pt-8">
                  <div className="flex flex-wrap gap-3">
                    <Link to="/swap" className="inline-flex items-center gap-2 bg-hub-green text-white font-black py-3 px-8 uppercase tracking-widest hover:bg-green-700 transition-all shadow-md rounded">
                      Get your tokens <ArrowRight size={16} strokeWidth={3} />
                    </Link>
                    <button
                      onClick={() => setShowHowItWorks(true)}
                      className="inline-flex items-center gap-2 border-2 border-hub-green text-hub-green font-black py-3 px-8 uppercase tracking-widest hover:bg-hub-green/5 transition-all rounded"
                    >
                      How it works
                    </button>
                  </div>
                  {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}
                </div>
              </>
            )}

            {dealTab === 'producer' && (
              <>
                <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-2xl mb-8">
                  No application. No approval committee. No fee paid to a gatekeeper for the privilege of
                  selling your own work. Your access is earned by putting something real behind your word -
                  and proven by the record, not by permission.
                </p>
                <div className="divide-y divide-hub-green/10">
                  <div className="pb-6 flex gap-5">
                    <span className="text-hub-green font-black text-2xl shrink-0">01</span>
                    <div>
                      <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">Make your pledge</h3>
                      <p className="text-gray-500 text-sm font-medium leading-relaxed">
                        Put up a small amount of your own, held and never spent. Nobody takes a cut. It is what
                        lets someone who has never met you trust your word - the same way showing your face does
                        at the market. The moment you deliver, it is yours again.
                      </p>
                    </div>
                  </div>
                  <div className="py-6 flex gap-5">
                    <span className="text-hub-green font-black text-2xl shrink-0">02</span>
                    <div>
                      <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">Back your goods</h3>
                      <p className="text-gray-500 text-sm font-medium leading-relaxed">
                        List a batch against your pledge. For every real thing you promise, one token is made
                        that a buyer can redeem for it. One token, one real thing. You can never promise more
                        than you can deliver.
                      </p>
                    </div>
                  </div>
                  <div className="py-6 flex gap-5">
                    <span className="text-hub-green font-black text-2xl shrink-0">03</span>
                    <div>
                      <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">List and sell direct</h3>
                      <p className="text-gray-500 text-sm font-medium leading-relaxed">
                        Put your goods on the market. The price is what real demand says your work is worth - not
                        a distributor's offer, not a grocery margin that squeezes both sides. The price is yours to
                        set. Every order you fill adds to a track record that is provable and yours to keep.
                      </p>
                    </div>
                  </div>
                  <div className="pt-6 flex gap-5">
                    <span className="text-hub-green font-black text-2xl shrink-0">04</span>
                    <div>
                      <h3 className="text-gray-900 font-black uppercase tracking-tight mb-1">Spend it forward</h3>
                      <p className="text-gray-500 text-sm font-medium leading-relaxed">
                        What you earn does not leave. It becomes what you spend - on your neighbors' goods, in the
                        same money. You earned your way in by making something real. Now it circulates.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 border-t border-hub-green/10 pt-8">
                  <p className="text-gray-400 text-xs font-medium leading-relaxed max-w-2xl mb-6">
                    Your pledge is held in ETH, the currency the exchange runs on. You never spend it. It stays
                    set aside while a promise is open and comes back to you the moment you deliver.
                  </p>
                  <Link to="/profile" className="inline-flex items-center gap-2 bg-hub-green text-white font-black py-3 px-8 uppercase tracking-widest hover:bg-green-700 transition-all shadow-md rounded">
                    Start selling <ArrowRight size={16} strokeWidth={3} />
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── FROM THE HOMESTEAD (market listings) ──────────────────────── */}
        <section className="mb-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900">
                From the Homestead
              </h2>
              <p className="text-gray-500 text-sm font-medium mt-1">Backed by stake. Verified on-chain. Ready to claim.</p>
            </div>
            <Link to="/market" className="text-hub-green text-sm font-black uppercase tracking-widest hover:underline flex items-center gap-1">
              Browse all <ArrowRight size={14} strokeWidth={3} />
            </Link>
          </div>
          <FeaturedListings />
        </section>

        {/* ── CIRCULATION (the mesh: producers trade with each other) ────── */}
        <section className="mb-16">
          <div className="mb-8">
            <p className="text-hub-green text-xs font-black uppercase tracking-widest mb-3">An economy, not a storefront</p>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-gray-900 leading-tight max-w-3xl">
              Every buyer here is a producer waiting to happen.
            </h2>
            <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-2xl mt-4">
              Most markets move value one direction - you pay, it leaves, it never comes back. Here it circulates.
              The person who buys your eggs this week could sell you a weld the next, in the same money, with none
              of it leaking to a middleman or touching a dollar.
            </p>
          </div>

          {/* The loop - value circulating between producers */}
          <div className="bg-hub-green/5 border-2 border-hub-green/20 rounded-2xl p-6 md:p-8 mb-6">
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center">
                <span className="text-hub-green text-[10px] font-black uppercase tracking-widest mb-1">The welder's hour</span>
                <span className="text-gray-900 font-black text-sm">buys the farmer's dozen</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-hub-green text-[10px] font-black uppercase tracking-widest mb-1">The farmer's eggs</span>
                <span className="text-gray-900 font-black text-sm">buy the brewer's case</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-hub-green text-[10px] font-black uppercase tracking-widest mb-1">The brewer's beer</span>
                <span className="text-gray-900 font-black text-sm">buys the welder's next repair</span>
              </div>
            </div>
            <p className="text-center text-gray-500 text-xs font-medium mt-5 pt-5 border-t border-hub-green/10">
              Same money. Same people. A circle that never needs a dollar to close.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="text-hub-green mb-4"><Users size={28} strokeWidth={2} /></div>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                You earn<br />what you spend.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                The spending power you use here is the spending power you created by making something. You do not
                buy in with dollars - you earn in by producing. Sell what you make, and what you earn becomes what
                you spend on your neighbors.
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="text-hub-green mb-4"><Sprout size={28} strokeWidth={2} /></div>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                Not just<br />farmers.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                A carpenter. An electrician. A baker. A mechanic. Every new kind of producer is another good in
                the loop - and the more makers who join, the richer the circle gets. You do not need scale, a
                commercial kitchen, or a distributor. Homestead is for anyone the current system undervalues.
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="text-hub-green mb-4"><BadgeCheck size={28} strokeWidth={2} /></div>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                Reputation is<br />the thread.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                Every trade you complete builds the on-chain standing that makes the next person trade with you.
                No credit agency decides your tier; no institution gatekeeps your access. It is the connective
                tissue that lets strangers circulate value - and it lives on the chain, not on a platform that
                can suspend you.
              </p>
            </div>
          </div>
        </section>

        {/* ── WHAT YOU GET ──────────────────────────────────────────────── */}
        <section className="mb-16">
          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="text-hub-green mb-4"><Leaf size={28} strokeWidth={2} /></div>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                Full nutrition.<br />No compromise.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                Commercial distribution forces corner-cutting - shelf life, transport, regulation. Homestead
                producers grow without that overhead. What you get is what they put on their own table.
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="text-hub-green mb-4"><BadgeCheck size={28} strokeWidth={2} /></div>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                You pay the maker.<br />Not the chain.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                Distributor, wholesaler, retailer - each takes a cut. By the time goods reach the shelf the
                producer saw a fraction of what you paid. Here, your payment goes to them directly.
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="text-hub-green mb-4"><Users size={28} strokeWidth={2} /></div>
              <h3 className="text-gray-900 font-black uppercase tracking-tight mb-2 leading-snug">
                Their reputation.<br />Your confidence.
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                Your neighbor trusts a producer because they know them. Homestead lets that trust travel - to
                buyers who have never met them, backed by every batch they have ever delivered.
              </p>
            </div>
          </div>
        </section>

        {/* ── EXCHANGE TOOLS ────────────────────────────────────────────── */}
        <section className="mb-16 bg-white shadow-md rounded-2xl overflow-hidden">
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
            {activeTab === 'Portals' && <DynamicPortals />}
          </div>
        </section>

    </div>
  );
}
