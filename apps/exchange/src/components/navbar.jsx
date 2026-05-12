import React, { useState } from 'react';
import { Home, Menu, X, ShoppingBag, Repeat, ArrowLeftRight, Wallet, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { open } = useAppKit();
  const { isConnected, address } = useAccount();

  const closeMenu = () => setIsOpen(false);

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-hub-dark border-b-2 border-hub-green shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          <Link to="/" onClick={closeMenu} className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-hub-green p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <Home size={22} className="text-white" />
            </div>
            <span className="text-hub-green font-black text-xl tracking-tighter uppercase">
              Homestead <span className="text-white">Exchange</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <NavLink to="/market"  icon={<ShoppingBag size={18} />} label="Market" />
            <NavLink to="/swap"    icon={<Repeat size={18} />}       label="Swap" />
            <NavLink to="/bridge"  icon={<ArrowLeftRight size={18} />} label="Bridge" />

            <div className="w-px h-6 bg-white/10" />

            <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors font-semibold text-xs uppercase tracking-widest">
              Beer <ExternalLink size={12} />
            </a>
            <a href="http://localhost:5174" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 transition-colors font-semibold text-xs uppercase tracking-widest">
              Egg <ExternalLink size={12} />
            </a>

            <button
              onClick={() => open()}
              className="bg-hub-green hover:bg-hub-light text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg active:scale-95"
            >
              <Wallet size={14} />
              {isConnected ? formatAddress(address) : 'Connect'}
            </button>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-hub-green focus:outline-none p-2">
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      <div className={`${isOpen ? 'block' : 'hidden'} md:hidden bg-hub-dark border-t border-hub-green/20`}>
        <div className="px-4 pt-2 pb-6 space-y-1">
          <MobileNavLink to="/market"  icon={<ShoppingBag size={20} />}    label="Market"  onClick={closeMenu} />
          <MobileNavLink to="/swap"    icon={<Repeat size={20} />}          label="Swap"    onClick={closeMenu} />
          <MobileNavLink to="/bridge"  icon={<ArrowLeftRight size={20} />}  label="Bridge"  onClick={closeMenu} />
          <div className="pt-4 px-3">
            <button
              onClick={() => { open(); closeMenu(); }}
              className="w-full bg-hub-green text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl"
            >
              {isConnected ? formatAddress(address) : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, icon, label }) {
  return (
    <Link to={to} className="flex items-center gap-2 text-gray-300 hover:text-hub-green transition-colors font-semibold text-sm">
      {icon}
      {label}
    </Link>
  );
}

function MobileNavLink({ to, icon, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-4 text-gray-300 hover:text-hub-green p-3 rounded-lg font-bold text-lg"
    >
      <div className="text-hub-green">{icon}</div>
      {label}
    </Link>
  );
}
