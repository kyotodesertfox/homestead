import { Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-katie-dark text-white py-8 mt-auto">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles size={16} className="text-katie-accent" />
          <h3 className="text-katie-accent font-display font-bold text-lg tracking-wide">
            Katie Williams
          </h3>
          <Sparkles size={16} className="text-katie-accent" />
        </div>
        <p className="text-gray-400 text-sm font-medium">
          Licensed Esthetician · Skincare & Waxing · 10 Years Experience
        </p>
      </div>
      <div className="max-w-5xl mx-auto px-4 mt-6 pt-4 border-t border-katie-purple/20 text-center text-gray-500 text-xs font-semibold uppercase tracking-widest">
        © {new Date().getFullYear()} Katie Williams Esthetics · Powered by Homestead
      </div>
    </footer>
  );
}
