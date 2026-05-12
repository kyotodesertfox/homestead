import React, { useState } from 'react';
import { Beer, Menu, X, FlaskConical, Wallet, Repeat, Store, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    // Reown Hooks
    const { open } = useAppKit();
    const { isConnected, address } = useAccount();

    const closeMenu = () => setIsOpen(false);

    // Helper to format address
    const formatAddress = (addr) => {
        if (!addr) return "";
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <nav className="sticky top-0 z-50 bg-beer-dark border-b-2 border-beer-amber shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

        {/* LOGO */}
        <Link to="/" onClick={closeMenu} className="flex items-center gap-2 group cursor-pointer">
        <div className="bg-beer-gold p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
        <Beer size={24} className="text-beer-dark" />
        </div>
        <span className="text-beer-gold font-black text-xl tracking-tighter uppercase">
        BEER <span className="text-white">EXCHANGE</span>
        </span>
        </Link>

        {/* NAV LINKS (DESKTOP) */}
        <div className="hidden md:flex items-center gap-8">
        <NavLink to="/recipes" icon={<FlaskConical size={18}/>} label="Recipes" />
        <NavLink to="/marketplace" icon={<Store size={18}/>} label="Market" />
        <a href="http://localhost:5175/swap" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-300 hover:text-beer-gold transition-colors font-semibold text-sm">
          <Repeat size={18} /> Swap <ExternalLink size={12} className="opacity-50" />
        </a>

        <button
        onClick={() => open()}
        className="bg-beer-gold hover:bg-white text-beer-dark px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg active:scale-95"
        >
        <Wallet size={14} />
        {isConnected ? formatAddress(address) : "Connect"}
        </button>
        </div>

        {/* HAMBURGER (MOBILE ONLY) */}
        <div className="md:hidden flex items-center">
        <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-beer-gold focus:outline-none p-2"
        >
        {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
        </div>
        </div>
        </div>

        {/* MOBILE MENU DROPDOWN */}
        <div className={`${isOpen ? 'block' : 'hidden'} md:hidden bg-beer-dark border-t border-beer-amber/20`}>
        <div className="px-4 pt-2 pb-6 space-y-1">
        <MobileNavLink to="/recipes" icon={<FlaskConical size={20} />} label="Recipes" onClick={closeMenu} />
        <MobileNavLink to="/marketplace" icon={<Store size={20} />} label="Market" onClick={closeMenu} />
        <a href="http://localhost:5175/swap" target="_blank" rel="noopener noreferrer" onClick={closeMenu}
          className="flex items-center gap-4 text-gray-300 hover:text-beer-gold p-3 rounded-lg font-bold text-lg">
          <div className="text-beer-gold"><Repeat size={20} /></div>
          Swap <ExternalLink size={14} className="ml-1 opacity-50" />
        </a>

        <div className="pt-4 px-3">
        <button
        onClick={() => { open(); closeMenu(); }}
        className="w-full bg-beer-gold text-beer-dark py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl"
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
        <Link to={to} className="flex items-center gap-2 text-gray-300 hover:text-beer-gold transition-colors font-semibold text-sm">
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
        className="flex items-center gap-4 text-gray-300 hover:text-beer-gold p-3 rounded-lg font-bold text-lg"
        >
        <div className="text-beer-gold">{icon}</div>
        {label}
        </Link>
    );
}
