import { Link } from 'react-router-dom';
import { Sparkles, Star, Shield, Heart } from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-spa-dark via-spa-deep to-spa-purple py-24 px-4 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-semibold text-spa-accent mb-6 tracking-widest uppercase">
            <Sparkles size={13} />
            $SPA · Powered by Homestead
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-black mb-4 leading-tight">
            Your Skin. <span className="text-spa-accent">Your Terms.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 font-medium leading-relaxed mb-10 max-w-xl mx-auto">
            A curated network of skilled estheticians.
            Book with confidence. Every provider is vouched for by someone already in the community.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/services"
              className="bg-white text-spa-purple font-black py-3 px-8 rounded-full uppercase tracking-widest hover:bg-spa-accent transition-all shadow-lg active:scale-95 text-sm">
              Browse Services
            </Link>
            <Link to="/providers"
              className="border-2 border-white/40 text-white font-black py-3 px-8 rounded-full uppercase tracking-widest hover:border-white hover:bg-white/10 transition-all text-sm">
              Join as a Provider
            </Link>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="py-16 px-4 bg-spa-soft">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
          <ValueCard
            icon={<Star size={22} className="text-spa-purple" />}
            title="Curated Providers"
            desc="Every esthetician on this platform earned their spot through peer referral — not a form or a fee."
          />
          <ValueCard
            icon={<Shield size={22} className="text-spa-purple" />}
            title="Backed On-Chain"
            desc="Service vouchers are verifiable and yours until you're ready to use them. No expiration games."
          />
          <ValueCard
            icon={<Heart size={22} className="text-spa-purple" />}
            title="Personalized Care"
            desc="Direct relationship between you and your provider. No platform in the middle of your experience."
          />
        </div>
      </section>

      {/* Platform pitch */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border-l-4 border-spa-purple shadow-xl rounded-r-2xl p-8 md:p-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              A Network Built on <span className="text-spa-purple">Trust</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-4">
              SPA Exchange is a referral-based network of estheticians who know their craft.
              No middleman deciding who gets visibility. No reviews that can be gamed.
              Providers are here because someone already in the community trusted them enough to bring them in.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Service vouchers are issued on blockchain — verifiable, transferable, and redeemable directly
              with your provider. The relationship is between you and them.
            </p>
            <Link to="/about"
              className="inline-block bg-spa-purple text-white font-black py-3 px-8 rounded-full uppercase tracking-widest hover:bg-spa-deep transition-all shadow-md text-sm active:scale-95">
              About the Platform
            </Link>
          </div>
        </div>
      </section>

      {/* CTA — providers */}
      <section className="bg-gradient-to-br from-spa-deep to-spa-purple py-16 px-4 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <Sparkles size={32} className="text-spa-accent mx-auto mb-4" />
          <h2 className="font-display text-3xl font-bold mb-3">Know Your Craft?</h2>
          <p className="text-gray-300 text-lg mb-8">
            If someone in the network believes in your work, there's a place for you here.
            Competence is the only credential this platform recognizes.
          </p>
          <Link to="/providers"
            className="inline-block bg-white text-spa-purple font-black py-3 px-10 rounded-full uppercase tracking-widest hover:bg-spa-accent transition-all shadow-lg text-sm active:scale-95">
            Become a Provider
          </Link>
        </div>
      </section>
    </div>
  );
}

function ValueCard({ icon, title, desc }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-spa-accent/20 hover:border-spa-purple/40 hover:shadow-md transition-all text-center">
      <div className="bg-spa-soft rounded-xl p-3 w-fit mx-auto mb-3">{icon}</div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
