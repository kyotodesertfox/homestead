import { Sparkles, ShoppingBag } from 'lucide-react';

const SERVICES = [
  {
    category: 'Facials',
    items: [
      { name: 'Classic Facial', desc: 'Deep cleanse, exfoliation, extractions, and moisturizing mask.', price: null },
      { name: 'Hydrating Facial', desc: 'Intensive moisture treatment for dry or dehydrated skin.', price: null },
      { name: 'Anti-Aging Facial', desc: 'Targeted treatment to firm, brighten, and reduce fine lines.', price: null },
      { name: 'Teen Facial', desc: 'Gentle acne-fighting facial designed for younger skin.', price: null },
    ]
  },
  {
    category: 'Waxing — Face',
    items: [
      { name: 'Brow Wax & Shape', desc: 'Precision shaping for clean, defined brows.', price: null },
      { name: 'Lip Wax', desc: 'Clean upper lip — quick and precise.', price: null },
      { name: 'Chin Wax', desc: 'Smooth results, no irritation.', price: null },
      { name: 'Full Face Wax', desc: 'Brows, lip, chin, and cheeks — full coverage.', price: null },
    ]
  },
  {
    category: 'Waxing — Body',
    items: [
      { name: 'Underarm Wax', desc: 'Smooth, long-lasting results.', price: null },
      { name: 'Half Leg Wax', desc: 'From ankle to knee or knee to thigh — your choice.', price: null },
      { name: 'Full Leg Wax', desc: 'Complete leg waxing, ankle to upper thigh.', price: null },
      { name: 'Bikini Wax', desc: 'Clean, comfortable bikini line.', price: null },
      { name: 'Brazilian Wax', desc: 'Full removal — thorough, professional, comfortable.', price: null },
    ]
  },
  {
    category: 'Skincare Add-Ons',
    items: [
      { name: 'Brow Tint', desc: 'Define and darken brows for a fuller look.', price: null },
      { name: 'Lash Tint', desc: 'Darker lashes without mascara.', price: null },
      { name: 'Enzyme Peel', desc: 'Gentle exfoliation to brighten and smooth skin tone.', price: null },
    ]
  },
];

export default function ServicesPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-katie-soft border border-katie-accent/40 rounded-full px-4 py-1.5 text-sm font-semibold text-katie-purple mb-4 tracking-widest uppercase">
            <Sparkles size={13} />
            Service Menu
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-gray-900 mb-4">
            What I <span className="text-katie-purple">Offer</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Every service is tailored to you. Pricing is set by consultation — reach out to build your session.
          </p>
        </div>

        {/* Service categories */}
        <div className="space-y-10">
          {SERVICES.map((cat) => (
            <div key={cat.category}>
              <h2 className="font-display text-xl font-bold text-katie-deep mb-4 border-b-2 border-katie-soft pb-2">
                {cat.category}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {cat.items.map((item) => (
                  <ServiceItem key={item.name} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* NFT purchase hook — placeholder until Treasury integration */}
        <div className="mt-16 bg-gradient-to-br from-katie-deep to-katie-purple rounded-2xl p-8 text-white text-center shadow-xl">
          <ShoppingBag size={32} className="text-katie-accent mx-auto mb-4" />
          <h3 className="font-display text-2xl font-bold mb-3">Purchase a Service Voucher</h3>
          <p className="text-gray-300 mb-2 max-w-md mx-auto text-sm leading-relaxed">
            Service NFTs are coming soon — purchase a session on-chain, redeem in person.
            Your voucher is yours until you're ready to use it.
          </p>
          <p className="text-katie-accent text-xs font-bold uppercase tracking-widest mt-4">
            Powered by Homestead Treasury · Taiko L2
          </p>
        </div>

      </div>
    </div>
  );
}

function ServiceItem({ name, desc }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:border-katie-accent/50 hover:shadow-md transition-all p-5">
      <div className="flex items-start gap-3">
        <div className="bg-katie-soft rounded-lg p-1.5 mt-0.5 shrink-0">
          <Sparkles size={14} className="text-katie-purple" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-1">{name}</h3>
          <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}
