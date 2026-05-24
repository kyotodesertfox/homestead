import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Repeat, ArrowLeftRight, ExternalLink, Wallet, LayoutDashboard } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import TreasuryHealth from '../../components/TreasuryHealth';

const portals = [
  {
    name: 'Beer Exchange',
    token: '$BEER',
    description: 'Craft homebrew, tokenized. Each token redeemable for a real bottle.',
    href: '/beer/',
    color: 'border-amber-400 text-amber-500',
    dot: 'bg-amber-400',
  },
  {
    name: 'Egg Exchange',
    token: '$EGG',
    description: 'Pasture-raised eggs from a private homestead. One token, one egg.',
    href: '/egg/',
    color: 'border-yellow-400 text-yellow-500',
    dot: 'bg-yellow-400',
  },
];

const features = [
  {
    icon: <ShoppingBag size={28} />,
    title: 'Market',
    text: 'Browse all open listings across the Homestead ecosystem.',
    to: '/market',
  },
  {
    icon: <Repeat size={28} />,
    title: 'Swap',
    text: 'Trade any Homestead token directly — $BEER, $EGG, and more.',
    to: '/swap',
  },
  {
    icon: <ArrowLeftRight size={28} />,
    title: 'Bridge',
    text: 'Move ETH from any exchange into Taiko in under two minutes.',
    to: '/bridge',
  },
];

const TABS = ['Exchange', 'Portals'];

export default function HomePage() {
  const { open }                  = useAppKit();
  const { isConnected, address }  = useAccount();
  const navigate                  = useNavigate();
  const [activeTab, setActiveTab] = useState('Exchange');

  const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* HERO */}
        <section className="bg-white border-t-8 border-hub-green shadow-2xl rounded-b-lg p-8 md:p-12 mb-12">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900 mb-4">
            Homestead <span className="text-hub-green">Market</span>
          </h1>
          <p className="text-xl text-gray-700 font-medium leading-relaxed mb-2">
            Real goods. On-chain provenance. Taiko blockchain.
          </p>
          <p className="text-gray-500 font-medium leading-relaxed max-w-2xl">
            The Homestead Exchange is the root of a physical-goods economy built on tokenized trust.
            Connect your wallet once here — it carries across every product portal in the ecosystem.
          </p>
          {isConnected ? (
            <button
              onClick={() => navigate('/profile')}
              className="mt-6 inline-flex items-center gap-2 bg-hub-green hover:bg-green-700 text-white font-black py-3 px-8 rounded uppercase tracking-widest transition-all shadow-md active:scale-95"
            >
              <LayoutDashboard size={16} />
              {formatAddress(address)}
            </button>
          ) : (
            <button
              onClick={() => open()}
              className="mt-6 inline-flex items-center gap-2 bg-hub-green hover:bg-green-700 text-white font-black py-3 px-8 rounded uppercase tracking-widest transition-all shadow-md active:scale-95"
            >
              <Wallet size={16} />
              Connect Wallet
            </button>
          )}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/market" className="bg-hub-green text-white font-black py-3 px-8 uppercase tracking-widest hover:bg-green-700 transition-all duration-300 shadow-md rounded">
              Browse Market
            </Link>
            <Link to="/swap" className="border-2 border-gray-900 text-gray-900 font-black py-3 px-8 uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all duration-300 rounded">
              Swap Tokens
            </Link>
          </div>
        </section>

        {/* TABBED CARD */}
        <section className="mb-4 bg-white shadow-md rounded-2xl overflow-hidden">
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
              <div className="grid md:grid-cols-2 gap-4">
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

        {/* TREASURY HEALTH */}
        <TreasuryHealth />

      </div>
    </div>
  );
}
