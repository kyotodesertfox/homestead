import { Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-spa-dark text-white py-8 mt-auto">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles size={14} className="text-spa-accent" />
          <h3 className="font-display font-bold text-lg text-spa-accent tracking-wide">SPA Exchange</h3>
          <Sparkles size={14} className="text-spa-accent" />
        </div>
        <p className="text-gray-400 text-sm font-medium">
          Licensed estheticians. Verified services. On-chain vouchers.
        </p>
      </div>
      <div className="max-w-5xl mx-auto px-4 mt-6 pt-4 border-t border-spa-purple/20 text-center text-gray-500 text-xs font-semibold uppercase tracking-widest">
        © {new Date().getFullYear()} SPA Exchange · Powered by Homestead · Taiko L2
      </div>
    </footer>
  );
}
