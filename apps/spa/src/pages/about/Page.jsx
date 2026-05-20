import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Users, Zap } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-spa-soft border border-spa-accent/40 rounded-full px-4 py-1.5 text-sm font-semibold text-spa-purple mb-4 tracking-widest uppercase">
            <Sparkles size={13} />
            The Platform
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-gray-900 mb-4">
            What Is <span className="text-spa-purple">SPA Exchange?</span>
          </h1>
        </div>

        <div className="bg-white border-l-4 border-spa-purple shadow-xl rounded-r-2xl p-8 md:p-12 mb-10">
          <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
            <p>
              SPA Exchange is a curated network of skilled estheticians — built on trust, backed on-chain.
              It exists to remove the layers between a talented professional and the clients who need them:
              no booking platforms taking a cut, no opaque review systems, no middleman deciding who gets seen.
            </p>
            <p>
              Every provider on the platform earned their place through peer referral.
              Every service voucher is issued on blockchain — verifiable, yours until you're ready to use it,
              and redeemable directly with the person who performed your service.
            </p>
            <p>
              This isn't a directory. It's a network. The difference is accountability —
              everyone here is known by someone who already is.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-10">
          <PrincipleCard
            icon={<Users size={22} className="text-spa-purple" />}
            title="Referral-Based"
            desc="Providers join because someone in the community vouched for their work. Quality is maintained by the people in it."
          />
          <PrincipleCard
            icon={<ShieldCheck size={22} className="text-spa-purple" />}
            title="On-Chain Vouchers"
            desc="Service vouchers are issued on blockchain — verifiable, transferable, and redeemable directly with your provider."
          />
          <PrincipleCard
            icon={<Zap size={22} className="text-spa-purple" />}
            title="No Gatekeepers"
            desc="Competence is the only credential. The network decides who belongs — not a board, not a form, not a fee."
          />
        </div>

        <div className="bg-spa-soft rounded-2xl p-8 border border-spa-accent/30">
          <h3 className="font-display text-xl font-bold text-spa-deep mb-3">Part of Homestead</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            SPA Exchange is part of the Homestead ecosystem — a suite of producer marketplaces
            connecting real-world skills and goods to verifiable on-chain vouchers.
            Same infrastructure. Different craft.
          </p>
          <Link to="/providers"
            className="inline-block bg-spa-purple text-white font-black py-2.5 px-7 rounded-full uppercase tracking-widest hover:bg-spa-deep transition-all shadow-md text-xs active:scale-95">
            Join as a Provider
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
