import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Coins, Users, CheckCircle } from 'lucide-react';

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
            List your services on-chain. Set your own prices in $SPA.
            No platform fees, no booking percentage, no permission required.
          </p>
        </div>

        {/* Why join */}
        <div className="grid sm:grid-cols-3 gap-6 mb-14">
          <BenefitCard
            icon={<Coins size={22} className="text-spa-purple" />}
            title="You Set the Price"
            desc="List each service at whatever $SPA amount works for you. Adjust anytime."
          />
          <BenefitCard
            icon={<ShieldCheck size={22} className="text-spa-purple" />}
            title="Trustless Settlement"
            desc="Vouchers are locked on Taiko L2. You claim your $SPA when the service is redeemed."
          />
          <BenefitCard
            icon={<Sparkles size={22} className="text-spa-purple" />}
            title="No Middleman"
            desc="The protocol connects you to clients directly. A small on-chain fee funds the ecosystem — no silent percentage going to a platform."
          />
        </div>

        {/* Requirements */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 mb-10">
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
            Provider Requirements
          </h2>
          <div className="space-y-4">
            <Requirement text="Licensed esthetician — active state licensure required" />
            <Requirement text="Stake $SPA tokens to register as a verified provider" />
            <Requirement text="List individual services with descriptions and $SPA pricing" />
            <Requirement text="Fulfill booked sessions and redeem vouchers on-chain" />
          </div>
          <p className="text-gray-400 text-xs mt-6">
            Provider registration is handled through the Homestead Treasury on Taiko L2.
            Your stake is your commitment to your clients — redeemable when you're in good standing.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-spa-deep to-spa-purple rounded-2xl p-8 text-white text-center shadow-xl">
          <Sparkles size={28} className="text-spa-accent mx-auto mb-4" />
          <h3 className="font-display text-2xl font-bold mb-3">Ready to List?</h3>
          <p className="text-gray-300 text-sm leading-relaxed max-w-md mx-auto mb-6">
            Connect your wallet and stake $SPA to register as a provider.
            Your first listing can be live in minutes.
          </p>
          <button
            className="bg-white text-spa-purple font-black py-3 px-10 rounded-full uppercase tracking-widest hover:bg-spa-accent transition-all shadow-lg text-sm active:scale-95">
            Connect Wallet to Register
          </button>
          <p className="text-spa-accent text-xs font-bold uppercase tracking-widest mt-5">
            $SPA · Homestead Treasury · Taiko L2
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

function Requirement({ text }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle size={18} className="text-spa-purple mt-0.5 shrink-0" />
      <p className="text-gray-700 text-sm font-medium">{text}</p>
    </div>
  );
}
