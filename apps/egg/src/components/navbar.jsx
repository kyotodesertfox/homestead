import React, { useState } from 'react';
import { Egg, Menu, X, Sprout, BookOpen, ArrowLeftRight, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { open } = useAppKit();
  const { isConnected, address } = useAccount();

  const closeMenu = () => setIsOpen(false);

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-homestead-header border-b-2 border-egg-yolk shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* LOGO */}
          <Link to="/" onClick={closeMenu} className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-egg-yolk p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
              <Egg size={24} className="text-homestead-header" />
            </div>
            <span className="text-egg-yolk font-black text-xl tracking-tighter uppercase">
              EGG <span className="text-white">EXCHANGE</span>
            </span>
          </Link>

          {/* NAV LINKS (DESKTOP) */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink to="/our-process"   icon={<Sprout size={18} />}        label="Our Process"  />
            <NavLink to="/how-it-works"  icon={<BookOpen size={18} />}       label="How It Works" />
            <NavLink to="/trade"         icon={<ArrowLeftRight size={18} />} label="Trade"        />

            <button
              onClick={() => open()}
              className="bg-egg-yolk hover:bg-white text-homestead-header px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg active:scale-95"
            >
              <Wallet size={14} />
              {isConnected ? formatAddress(address) : "Connect"}
            </button>
          </div>

          {/* HAMBURGER (MOBILE ONLY) */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-egg-yolk focus:outline-none p-2"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:hidden bg-homestead-header border-t border-egg-yolk/20`}>
        <div className="px-4 pt-2 pb-6 space-y-1">
          <MobileNavLink to="/our-process"  icon={<Sprout size={20} />}        label="Our Process"  onClick={closeMenu} />
          <MobileNavLink to="/how-it-works" icon={<BookOpen size={20} />}       label="How It Works" onClick={closeMenu} />
          <MobileNavLink to="/trade"        icon={<ArrowLeftRight size={20} />} label="Trade"        onClick={closeMenu} />

          <div className="pt-4 px-3">
            <button
              onClick={() => { open(); closeMenu(); }}
              className="w-full bg-egg-yolk text-homestead-header py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl"
            >
              {isConnected ? formatAddress(address) : "Connect"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, icon, label }) {
  return (
    <Link to={to} className="flex items-center gap-2 text-gray-300 hover:text-egg-yolk transition-colors font-semibold text-sm">
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
      className="flex items-center gap-4 text-gray-300 hover:text-egg-yolk p-3 rounded-lg font-bold text-lg"
    >
      <div className="text-egg-yolk">{icon}</div>
      {label}
    </Link>
  );
}
