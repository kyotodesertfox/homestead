import { Award, Heart, Sparkles, Star } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-katie-soft border border-katie-accent/40 rounded-full px-4 py-1.5 text-sm font-semibold text-katie-purple mb-4 tracking-widest uppercase">
            <Heart size={13} />
            About Me
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-gray-900">
            The Person <span className="text-katie-purple">Behind the Work</span>
          </h1>
        </div>

        {/* Main bio card */}
        <div className="bg-white border-l-4 border-katie-purple shadow-xl rounded-r-2xl p-8 md:p-12 mb-10">
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">
            Katie Williams · Licensed Esthetician
          </h2>
          <div className="space-y-4 text-gray-600 text-lg leading-relaxed">
            <p>
              I've been in the skincare industry for over ten years — and I chose this work because I genuinely believe
              that how you feel about your skin affects how you move through the world. This isn't a job to me.
              It's a craft.
            </p>
            <p>
              My approach is simple: listen first, treat second. Every client comes in with different skin, different goals,
              and different comfort levels. I take the time to understand what you actually need — not what a menu says
              you should want.
            </p>
            <p>
              Whether you're dealing with problem skin, looking for relaxation, or just want clean, smooth results from
              a wax — I'm here to make sure you leave feeling better than when you arrived.
            </p>
          </div>
        </div>

        {/* Values grid */}
        <div className="grid sm:grid-cols-3 gap-6 mb-10">
          <ValueCard
            icon={<Award size={24} className="text-katie-purple" />}
            title="Licensed & Certified"
            desc="10+ years of professional practice with ongoing education in skincare science and technique."
          />
          <ValueCard
            icon={<Heart size={24} className="text-katie-purple" />}
            title="Client-First"
            desc="Every session is built around you. Your comfort, your skin, your goals — always the priority."
          />
          <ValueCard
            icon={<Star size={24} className="text-katie-purple" />}
            title="Consistent Results"
            desc="Clients return because the work speaks for itself. Clean, careful, and genuinely effective."
          />
        </div>

        {/* Homestead connection */}
        <div className="bg-katie-soft rounded-2xl p-8 border border-katie-accent/30 text-center">
          <Sparkles size={28} className="text-katie-purple mx-auto mb-3" />
          <h3 className="font-display text-xl font-bold text-katie-deep mb-2">
            Verified on Homestead
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed max-w-lg mx-auto">
            My services are listed through the Homestead platform — a trustless producer registry on Taiko L2.
            When you purchase a service NFT, your voucher is verifiable on-chain and redeemable directly with me.
            No middleman. No expiration games.
          </p>
        </div>

      </div>
    </div>
  );
}

function ValueCard({ icon, title, desc }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center hover:border-katie-accent/40 hover:shadow-md transition-all">
      <div className="bg-katie-soft rounded-xl p-3 w-fit mx-auto mb-3">
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
