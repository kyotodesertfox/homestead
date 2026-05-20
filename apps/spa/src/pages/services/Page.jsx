import { Sparkles, ShoppingBag } from 'lucide-react';

const CATEGORIES = [
  {
    label: 'Facials',
    items: [
      { name: 'Classic Facial',    desc: 'Deep cleanse, exfoliation, extractions, and a moisturizing mask.' },
      { name: 'Hydrating Facial',  desc: 'Intensive moisture treatment for dry or dehydrated skin.' },
      { name: 'Anti-Aging Facial', desc: 'Targeted treatment to firm, brighten, and reduce fine lines.' },
      { name: 'Teen Facial',       desc: 'Gentle acne-fighting facial designed for younger skin.' },
    ]
  },
  {
    label: 'Waxing — Face',
    items: [
      { name: 'Brow Wax & Shape', desc: 'Precision shaping for clean, defined brows.' },
      { name: 'Lip Wax',          desc: 'Clean upper lip — quick and precise.' },
      { name: 'Chin Wax',         desc: 'Smooth results, no irritation.' },
      { name: 'Full Face Wax',    desc: 'Brows, lip, chin, and cheeks — full coverage.' },
    ]
  },
  {
    label: 'Waxing — Body',
    items: [
      { name: 'Underarm Wax',  desc: 'Smooth, long-lasting results.' },
      { name: 'Half Leg Wax',  desc: 'Ankle to knee, or knee to thigh — your choice.' },
      { name: 'Full Leg Wax',  desc: 'Complete leg waxing, ankle to upper thigh.' },
      { name: 'Bikini Wax',    desc: 'Clean, comfortable bikini line.' },
      { name: 'Brazilian Wax', desc: 'Full removal — thorough, professional, comfortable.' },
    ]
  },
  {
    label: 'Add-Ons',
    items: [
      { name: 'Brow Tint',   desc: 'Define and darken brows for a fuller, natural look.' },
      { name: 'Lash Tint',   desc: 'Darker lashes without mascara.' },
      { name: 'Enzyme Peel', desc: 'Gentle exfoliation to brighten and smooth skin tone.' },
    ]
  },
];

export default function ServicesPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-spa-soft border border-spa-accent/40 rounded-full px-4 py-1.5 text-sm font-semibold text-spa-purple mb-4 tracking-widest uppercase">
            <Sparkles size={13} />
            Service Catalog
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Available <span className="text-spa-purple">Services</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Every service is priced in <span className="font-bold text-spa-purple">$SPA</span> tokens by the provider.
            Purchase a voucher on-chain and redeem directly with your esthetician.
          </p>
        </div>

        <div className="space-y-10">
          {CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <h2 className="font-display text-xl font-bold text-spa-deep mb-4 border-b-2 border-spa-soft pb-2">
                {cat.label}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {cat.items.map((item) => (
                  <ServiceItem key={item.name} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-br from-spa-deep to-spa-purple rounded-2xl p-8 text-white text-center shadow-xl">
          <ShoppingBag size={30} className="text-spa-accent mx-auto mb-4" />
          <h3 className="font-display text-2xl font-bold mb-3">Purchase a Service Voucher</h3>
          <p className="text-gray-300 text-sm leading-relaxed max-w-md mx-auto mb-4">
            Service NFT vouchers are live on Taiko L2. Connect your wallet to browse available listings
            from verified providers and purchase a session on-chain.
          </p>
          <p className="text-spa-accent text-xs font-bold uppercase tracking-widest">
            $SPA Token · Homestead Treasury · Taiko L2
          </p>
        </div>

      </div>
    </div>
  );
}

function ServiceItem({ name, desc }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:border-spa-accent/50 hover:shadow-md transition-all p-5">
      <div className="flex items-start gap-3">
        <div className="bg-spa-soft rounded-lg p-1.5 mt-0.5 shrink-0">
          <Sparkles size={14} className="text-spa-purple" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-1">{name}</h3>
          <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}
