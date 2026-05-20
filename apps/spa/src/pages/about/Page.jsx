import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Coins, Zap } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-spa-soft border border-spa-accent/40 rounded-full px-4 py-1.5 text-sm font-semibold text-spa-purple mb-4 tracking-widest uppercase">
            <Sparkles size={13} />
            The Protocol
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-gray-900 mb-4">
            What Is <span className="text-spa-purple">SPA Exchange?</span>
          </h1>
        </div>

        <div className="bg-white border-l-4 border-spa-purple shadow-xl rounded-r-2xl p-8 md:p-12 mb-10">
          <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
            <p>
              SPA Exchange is an on-chain marketplace for professional estheticians — built on Taiko L2
              and powered by the $SPA token. It removes every layer between a skilled provider and their clients:
              no booking platforms, no payment processors, no percentage skimmed on every session.
            </p>
            <p>
              Providers stake $SPA to register their services. Clients purchase session vouchers as NFTs.
              When the service is performed, the voucher is redeemed on-chain and the provider claims their tokens.
              The entire flow is trustless, transparent, and settled on Ethereum.
            </p>
            <p>
              This isn't a startup. It's infrastructure — open, ownerless, and built to last.
              Any licensed esthetician can list. Any client with a wallet can book. No intermediary required.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-10">
          <PrincipleCard
            icon={<Zap size={22} className="text-spa-purple" />}
            title="Permissionless"
            desc="No application. No approval process. Stake $SPA, list your service, start taking bookings."
          />
          <PrincipleCard
            icon={<ShieldCheck size={22} className="text-spa-purple" />}
            title="Trustless"
            desc="Every voucher is locked on Taiko L2. Clients are protected. Providers are paid automatically on redemption."
          />
          <PrincipleCard
            icon={<Coins size={22} className="text-spa-purple" />}
            title="Zero Rent"
            desc="The protocol takes nothing. No platform fee, no subscription, no percentage of your earnings."
          />
        </div>

        <div className="bg-spa-soft rounded-2xl p-8 border border-spa-accent/30">
          <h3 className="font-display text-xl font-bold text-spa-deep mb-3">Built on Homestead</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            SPA Exchange is part of the Homestead ecosystem — a suite of on-chain producer marketplaces
            connecting real-world goods and services to verifiable on-chain vouchers.
            The same infrastructure that backs physical products powers service-based economies.
          </p>
          <Link to="/providers"
            className="inline-block bg-spa-purple text-white font-black py-2.5 px-7 rounded-full uppercase tracking-widest hover:bg-spa-deep transition-all shadow-md text-xs active:scale-95">
            Become a Provider
          </Link>
        </div>

      </div>
    </div>
  );
}

function PrincipleCard({ icon, title, desc }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center hover:border-spa-accent/40 hover:shadow-md transition-all">
      <div className="bg-spa-soft rounded-xl p-3 w-fit mx-auto mb-3">{icon}</div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
