import { Sparkles, ShieldCheck, Coins, Users } from 'lucide-react';

export default function ProvidersPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-spa-soft border border-spa-accent/40 rounded-full px-4 py-1.5 text-sm font-semibold text-spa-purple mb-4 tracking-widest uppercase">
            <Users size={13} />
            For Estheticians
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Become a <span className="text-spa-purple">Provider</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            SPA Exchange is a referral-based network. If someone already in the community
            believes in your work, there's a place for you here.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-14">
          <BenefitCard
            icon={<Coins size={22} className="text-spa-purple" />}
            title="Your Prices"
            desc="Set your own rates in $SPA. Adjust anytime. No platform dictating your value."
          />
          <BenefitCard
            icon={<ShieldCheck size={22} className="text-spa-purple" />}
            title="Your Clients"
            desc="Direct relationship between you and the people you serve. No middleman in the middle."
          />
          <BenefitCard
            icon={<Sparkles size={22} className="text-spa-purple" />}
            title="Your Reputation"
            desc="Built by your clients and the peers who vouched for you — not by a review system that can be gamed."
          />
        </div>

        {/* Entry */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 mb-10">
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">
            How Entry Works
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Providers join through referral — someone already on the platform who has seen your work
            and is willing to put their name behind it. There is no application process and no committee
            deciding your eligibility.
          </p>
          <p className="text-gray-600 leading-relaxed">
            If you know someone in the network, reach out to them. If you don't yet,
            connect your wallet and introduce yourself — we'll take it from there.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-spa-deep to-spa-purple rounded-2xl p-8 text-white text-center shadow-xl">
          <Sparkles size={28} className="text-spa-accent mx-auto mb-4" />
          <h3 className="font-display text-2xl font-bold mb-3">Ready to Join?</h3>
          <p className="text-gray-300 text-sm leading-relaxed max-w-md mx-auto mb-6">
            Connect your wallet and reach out. If your work speaks for itself, the network will speak for you.
          </p>
          <button className="bg-white text-spa-purple font-black py-3 px-10 rounded-full uppercase tracking-widest hover:bg-spa-accent transition-all shadow-lg text-sm active:scale-95">
            Connect Wallet
          </button>
          <p className="text-spa-accent text-xs font-bold uppercase tracking-widest mt-5">
            $SPA · Powered by Homestead
          </p>
        </div>

      </div>
    </div>
  );
}

function BenefitCard({ icon, title, desc }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center hover:border-spa-accent/40 hover:shadow-md transition-all">
      <div className="bg-spa-soft rounded-xl p-3 w-fit mx-auto mb-3">{icon}</div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
