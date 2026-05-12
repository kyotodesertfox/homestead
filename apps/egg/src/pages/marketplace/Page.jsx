import React, { useState } from 'react';
import { Egg, Wallet, X, Info } from 'lucide-react';

const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

const PLACEHOLDER_LISTINGS = [
  {
    id: 1,
    seller: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    quantity: 24,
    pricePerUnit: '1',
    isActive: true,
    description: 'Pasture-raised, Omega-3 supplemented feed. Small flock, consistent quality year-round.',
  },
  {
    id: 2,
    seller: '0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6',
    quantity: 12,
    pricePerUnit: '1',
    isActive: true,
    description: 'Free-range hens on a private homestead. Seasonal availability — no commercial inputs.',
  },
  {
    id: 3,
    seller: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    quantity: 0,
    pricePerUnit: '1',
    isActive: false,
    description: 'Heritage breed flock. Eggs available in limited batches when in season.',
  },
];

export default function MarketplacePage() {
  const [selected, setSelected] = useState(null);

  const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">

        <header className="mb-12 border-b-8 border-egg-yolk pb-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
            Egg <span className="text-egg-yolk">Market</span>
          </h1>
          <p className="text-gray-600 font-bold mt-2 uppercase tracking-widest text-sm italic">
            Active Sellers
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLACEHOLDER_LISTINGS.map((listing) => (
            <div
              key={listing.id}
              onClick={() => setSelected(listing)}
              className={`bg-white border-2 rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer ${listing.isActive ? 'border-egg-yolk' : 'border-gray-200 opacity-60'}`}
            >
              <div className="flex justify-center mb-5">
                <div className="w-20 h-20 rounded-full border-4 border-egg-yolk bg-amber-50 flex items-center justify-center">
                  <Egg size={36} className="text-egg-yolk" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5">
                  <Wallet size={12} className="text-egg-yolk" />
                  <span className="text-xs font-black text-gray-700 uppercase tracking-widest">{formatAddress(listing.seller)}</span>
                </div>

                <p className="text-gray-500 text-xs font-medium leading-relaxed">
                  {listing.description}
                </p>

                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                  <div className="text-center">
                    <div className="text-lg font-black text-gray-900">{listing.quantity}</div>
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-gray-900">{listing.pricePerUnit} $EGG</div>
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Per Egg</div>
                  </div>
                  <div className={`text-[9px] font-black uppercase tracking-widest ${listing.isActive ? 'text-emerald-500' : 'text-red-400'}`}>
                    {listing.isActive ? '● Available' : '● Unavailable'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-10 bg-white border border-gray-100 rounded-2xl p-5 flex gap-4 items-start shadow-sm">
          <div className="text-egg-yolk mt-1 shrink-0">
            <Info size={24} strokeWidth={3} />
          </div>
          <div>
            <h4 className="text-gray-900 font-black text-sm uppercase tracking-tight">About the Egg Market</h4>
            <p className="text-gray-500 text-xs mt-1 leading-relaxed font-medium">
              Each listing represents a seller offering physical eggs redeemable via $EGG token.
              One $EGG = one egg. Redemption is coordinated directly with the seller upon purchase.
            </p>
          </div>
        </section>

      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>

            <div className="relative bg-amber-50 h-40 flex items-center justify-center">
              <Egg size={72} className="text-egg-yolk opacity-30" />
              <button onClick={() => setSelected(null)} className="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow-md hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-700" />
              </button>
            </div>

            <div className="border-t-8 border-egg-yolk p-6">
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={14} className="text-egg-yolk" />
                <span className="font-black text-gray-900 uppercase tracking-tight">{formatAddress(selected.seller)}</span>
                <span className={`ml-auto text-[10px] font-black uppercase tracking-widest ${selected.isActive ? 'text-emerald-500' : 'text-red-400'}`}>
                  {selected.isActive ? '● Available' : '● Unavailable'}
                </span>
              </div>

              <p className="text-gray-600 text-sm font-medium leading-relaxed mt-3 mb-6">
                {selected.description}
              </p>

              <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-black text-gray-900">{selected.quantity}</div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Eggs Available</div>
                </div>
                <div className="text-center border-l border-gray-100">
                  <div className="text-2xl font-black text-gray-900">{selected.pricePerUnit} $EGG</div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Per Egg</div>
                </div>
              </div>

              <button
                disabled={!selected.isActive}
                className="w-full bg-homestead-header hover:bg-egg-yolk text-egg-yolk hover:text-homestead-header font-black py-4 rounded-xl transition-all uppercase tracking-tighter text-sm disabled:opacity-30 disabled:cursor-not-allowed border-2 border-egg-yolk"
              >
                Acquire Egg
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
