import React, { useState, useEffect } from 'react';
import './App.css';
import OurProcess from './assets/our_process/App';
import HowItWorks from './assets/how_it_works/App';
import Trade from './assets/trade/App';
import Bridge from './assets/bridge/App';

// 1. REOWN APPKIT IMPORTS
import { createAppKit, useAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { taiko } from '@reown/appkit/networks'
import { WagmiProvider, useAccount } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 2. Configuration
const projectId = import.meta.env.VITE_WALLET_CONNECT;

const metadata = {
  name: 'The Egg Exchange',
  description: 'The Egg Exchange',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://jacksonville-homestead.netlify.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const taikoMainnet = {
  id: 167000,
  name: 'Taiko Mainnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.taiko.xyz'] },
      public: { http: ['https://rpc.mainnet.taiko.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Taikoscan', url: 'https://taikoscan.io' },
  },
  testnet: false
}

const hoodi = {
  id: 167013,
  name: 'Taiko Hoodi',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.hoodi.taiko.xyz'] },
      public: { http: ['https://rpc.hoodi.taiko.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Taikoscan', url: 'https://hoodi.taikoscan.io' },
  },
  testnet: true
}

//const networks = [taiko]
const networks = [ taikoMainnet, hoodi ]

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks, // Added here
  ssr: true
})

const queryClient = new QueryClient()

// 4. INITIALIZE REOWN APPKIT
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  defaultNetwork: taiko,
  allowUnsupportedChain: false,
  features: {
    analytics: false,
    email: false,
    socials: false,
    swaps: false,
  },
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#fcd34d',
    '--w3m-border-radius-master': '20px',
  }
})

function AppContent() {
  const [activeTab, setActiveTab] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hook from Reown
  const { open } = useAppKit();
  // Hook from Wagmi
  const { address, isConnected } = useAccount();

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
  }, [activeTab]);

  const navigate = (tab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  // Guard against SSR hydration mismatch
  if (!mounted) return null;

  const formatAddress = (addr) => {
    if (!addr) return "Connected";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
    <nav className="flex items-center justify-between px-6 md:px-10 py-5 bg-homestead-header shadow-2xl sticky top-0 z-[60]">

    {/* Left Flank: Logo */}
    <div className="flex-1 flex items-center gap-4 cursor-pointer" onClick={() => navigate('home')}>
    <div className="bg-egg-yolk p-2.5 rounded-2xl shadow-inner flex items-center justify-center relative overflow-hidden">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_2px_1px_rgba(0,0,0,0.15)]">
    <defs>
    <linearGradient id="eggGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
    <stop stopColor="white" />
    <stop offset="1" stopColor="#FEF3C7" />
    </linearGradient>
    </defs>
    <path d="M12 2C8.5 2 5.5 7.5 5.5 12.5C5.5 17.5 8.4 22 12 22C15.6 22 18.5 17.5 18.5 12.5C18.5 7.5 15.5 2 12 2Z" fill="url(#eggGradient)" />
    <path d="M9 10C9 8 10 6 11 5" stroke="#fcd34d" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
    </div>
    <span className="text-xl md:text-2xl font-black tracking-tighter uppercase text-white whitespace-nowrap">
    The Egg Exchange
    </span>
    </div>

    {/* Center: Desktop Menu */}
    <div className="hidden md:flex items-center justify-center gap-10 text-sm font-black uppercase tracking-[0.2em]">
    {['home', 'our-process', 'how-it-works', 'trade', 'bridge'].map((tab) => (
      <button
      key={tab}
      onClick={() => navigate(tab)}
      className={`transition-colors py-1 border-b-2 ${activeTab === tab ? 'text-egg-yolk border-egg-yolk' : 'text-stone-400 border-transparent hover:text-white'}`}
      >
      {tab.replace('-', ' ')}
      </button>
    ))}
    </div>

    {/* Right Flank: Custom Connect Button */}
    <div className="flex-1 flex justify-end items-center gap-4">
    <button
    onClick={() => open()}
    className="hidden sm:block bg-egg-yolk hover:bg-amber-400 text-homestead-header font-black py-2.5 px-8 rounded-full text-xs uppercase tracking-tighter transition-all shadow-lg active:scale-95"
    >
    {isConnected ? formatAddress(address) : "Connect Wallet"}
    </button>

    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-white p-2">
    <div className="space-y-1.5">
    <span className={`block w-6 h-0.5 bg-white transition-transform ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
    <span className={`block w-6 h-0.5 bg-white transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`}></span>
    <span className={`block w-6 h-0.5 bg-white transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
    </div>
    </button>
    </div>
    </nav>

    {/* Mobile Menu Overlay */}
    <div className={`md:hidden fixed inset-0 z-50 transform ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out`}>
    <div className="absolute inset-0 bg-homestead-header opacity-95" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }}></div>
    <div className="relative flex flex-col items-center justify-center h-full gap-8 text-2xl font-black uppercase tracking-widest text-white">
    <button onClick={() => navigate('home')} className={activeTab === 'home' ? 'text-egg-yolk' : ''}>Home</button>
    <button onClick={() => navigate('our-process')} className={activeTab === 'our-process' ? 'text-egg-yolk' : ''}>Process</button>
    <button onClick={() => navigate('how-it-works')} className={activeTab === 'how-it-works' ? 'text-egg-yolk' : ''}>How It Works</button>
    <button onClick={() => navigate('bridge')} className={activeTab === 'bridge' ? 'text-egg-yolk' : ''}>Bridge</button>
    <button onClick={() => { open(); setIsMenuOpen(false); }} className="mt-4 bg-egg-yolk text-homestead-header px-10 py-4 rounded-full text-sm shadow-xl active:scale-95">
    {isConnected ? formatAddress(address) : "Connect Wallet"}
    </button>
    </div>
    </div>

    <main className="flex-grow flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/cardboard-flat.png')]">
    {activeTab === 'home' && (
      <section className="w-full max-w-4xl px-8 py-20 text-center">
      <h1 className="text-5xl md:text-7xl font-serif font-black text-homestead-header mb-6 tracking-tight">
      Jacksonville, FL <span className="text-egg-yolk">Homestead</span>
      </h1>
      <div className="bg-white border-b-8 border-r-8 border-stone-200 rounded-[3rem] p-8 md:p-12 shadow-2xl text-lg md:text-xl text-stone-700">
      <p>Word of mouth brought you here. Private homestead. High standards.</p>

      <button onClick={() => navigate('our-process')} className="mt-10 text-egg-yolk font-black text-xl md:text-2xl block mx-auto hover:underline">
      Learn about our process →
      <img src="images/couple_eggs.png" className="w-full max-w-md aspect-video rounded-[2rem] overflow-hidden border-4 border-egg-yolk shadow-2xl bg-stone-100 my-8 mx-auto object-cover" alt="Process" />
      </button>

      <button onClick={() => navigate('how-it-works')} className="mt-10 text-egg-yolk font-black text-xl md:text-2xl block mx-auto hover:underline">
      Learn how it works →
      <img src="images/couple_crypto.png" className="w-full max-w-md aspect-video rounded-[2rem] overflow-hidden border-4 border-egg-yolk shadow-2xl bg-stone-100 my-8 mx-auto object-cover" alt="Crypto" />
      </button>
      </div>
      </section>
    )}

    {activeTab === 'our-process' && <OurProcess setActiveTab={navigate} />}
    {activeTab === 'how-it-works' && <HowItWorks setActiveTab={navigate} />}
    {activeTab === 'trade' && <Trade setActiveTab={navigate} />}
    {activeTab === 'bridge' && <Bridge setActiveTab={navigate} />}
    </main>

    <footer className="py-12 text-center text-stone-800 text-[10px] font-black uppercase tracking-[0.4em]">
    &copy; 2026 The Egg Exchange
    </footer>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
    <QueryClientProvider client={queryClient}>
    <AppContent />
    </QueryClientProvider>
    </WagmiProvider>
  );
}
