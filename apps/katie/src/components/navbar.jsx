import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Sparkles, Wallet, LayoutDashboard } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { open } = useAppKit();
  const { isConnected, address } = useAccount();

  const close = () => setIsOpen(false);
  const fmt = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  return (
    <nav className="sticky top-0 z-50 bg-katie-dark border-b border-katie-purple/30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/" onClick={close} className="flex items-center gap-2 group">
            <div className="bg-katie-purple p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <Sparkles size={20} className="text-white" />
            </div>
            <span className="font-display text-white font-bold text-lg tracking-wide">
              Katie <span className="text-katie-accent">Williams</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink to="/services" label="Services" />
            <NavLink to="/about" label="About" />
            <NavLink to="/contact" label="Contact" />

            {isConnected ? (
              <Link to="/profile"
                className="bg-katie-purple hover:bg-katie-accent text-white hover:text-katie-dark px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-md active:scale-95">
                <LayoutDashboard size={13} />
                {fmt(address)}
              </Link>
            ) : (
              <button onClick={() => open()}
                className="bg-katie-purple hover:bg-katie-accent text-white hover:text-katie-dark px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-md active:scale-95">
                <Wallet size={13} />
                Connect
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-katie-accent p-2">
            {isOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-katie-dark border-t border-katie-purple/20">
          <div className="px-4 pt-2 pb-6 space-y-1">
            <MobileNavLink to="/services" label="Services" onClick={close} />
            <MobileNavLink to="/about" label="About" onClick={close} />
            <MobileNavLink to="/contact" label="Contact" onClick={close} />
            <div className="pt-4 px-3">
              {isConnected ? (
                <Link to="/profile" onClick={close}
                  className="w-full bg-katie-purple text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl flex items-center justify-center gap-2">
                  <LayoutDashboard size={15} />
                  {fmt(address)}
                </Link>
              ) : (
                <button onClick={() => { open(); close(); }}
                  className="w-full bg-katie-purple text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl flex items-center justify-center gap-2">
                  <Wallet size={15} />
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({ to, label }) {
  return (
    <Link to={to} className="text-gray-300 hover:text-katie-accent transition-colors font-semibold text-sm">
      {label}
    </Link>
  );
}

function MobileNavLink({ to, label, onClick }) {
  return (
    <Link to={to} onClick={onClick}
      className="flex items-center text-gray-300 hover:text-katie-accent p-3 rounded-lg font-bold text-lg transition-colors">
      {label}
    </Link>
  );
}
