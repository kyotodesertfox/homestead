import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Coins, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-spa-dark via-spa-deep to-spa-purple py-24 px-4 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-semibold text-spa-accent mb-6 tracking-widest uppercase">
            <Sparkles size={13} />
            Powered by $SPA · Taiko L2
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-black mb-4 leading-tight">
            Your Skin. <span className="text-spa-accent">Your Terms.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 font-medium leading-relaxed mb-10 max-w-xl mx-auto">
            The first on-chain marketplace for licensed estheticians.
            Purchase service vouchers backed by $SPA tokens — redeemable directly with your provider.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/services"
              className="bg-white text-spa-purple font-black py-3 px-8 rounded-full uppercase tracking-widest hover:bg-spa-accent transition-all shadow-lg active:scale-95 text-sm">
              Browse Services
            </Link>
            <Link to="/providers"
              className="border-2 border-white/40 text-white font-black py-3 px-8 rounded-full uppercase tracking-widest hover:border-white hover:bg-white/10 transition-all text-sm">
              Find a Provider
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-spa-soft">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900">
            How <span className="text-spa-purple">It Works</span>
          </h2>
        </div>
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
          <StepCard
            step="01"
            icon={<Users size={22} className="text-spa-purple" />}
            title="Providers Register"
            desc="Licensed estheticians stake $SPA to register their services on-chain. No platform fees, no gatekeeping."
          />
          <StepCard
            step="02"
            icon={<Coins size={22} className="text-spa-purple" />}
            title="Clients Purchase"
            desc="Buy a service NFT voucher directly from the provider's listing. Your session is locked on Taiko L2."
          />
          <StepCard
            step="03"
            icon={<ShieldCheck size={22} className="text-spa-purple" />}
            title="Redeem In Person"
            desc="Show up, receive your service, burn the voucher. The provider claims their $SPA. Simple."
          />
        </div>
      </section>

      {/* Platform pitch */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border-l-4 border-spa-purple shadow-xl rounded-r-2xl p-8 md:p-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              A Platform Built for <span className="text-spa-purple">Estheticians</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-4">
              SPA Exchange removes the middleman between skilled professionals and their clients.
              No booking platforms taking a cut. No chargebacks. No algorithm controlling your visibility.
              Your services, your prices, your clients — settled on-chain.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Powered by the $SPA token on Taiko L2, every listing is trustless, every redemption is verifiable,
              and every provider is their own business — no permission required.
            </p>
            <Link to="/about"
              className="inline-block bg-spa-purple text-white font-black py-3 px-8 rounded-full uppercase tracking-widest hover:bg-spa-deep transition-all shadow-md text-sm active:scale-95">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* CTA — providers */}
      <section className="bg-gradient-to-br from-spa-deep to-spa-purple py-16 px-4 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <Sparkles size={32} className="text-spa-accent mx-auto mb-4" />
          <h2 className="font-display text-3xl font-bold mb-3">Are You a Licensed Esthetician?</h2>
          <p className="text-gray-300 text-lg mb-8">
            List your services. Set your prices in $SPA. Build a client base without giving up a percentage of every booking.
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

function StepCard({ step, icon, title, desc }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-spa-accent/20 hover:border-spa-purple/40 hover:shadow-md transition-all text-center">
      <div className="text-xs font-black uppercase tracking-widest text-spa-accent mb-3">{step}</div>
      <div className="bg-spa-soft rounded-xl p-3 w-fit mx-auto mb-3">{icon}</div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
