import React from 'react';
import { ShoppingBag, Info } from 'lucide-react';

export default function MarketPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto">

        <header className="mb-12 border-b-8 border-hub-green pb-6 flex flex-col md:flex-row justify-between items-end">
          <div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
              Homestead <span className="text-hub-green">Market</span>
            </h1>
            <p className="text-gray-600 font-bold mt-2 uppercase tracking-widest text-sm italic">
              All Active Listings
            </p>
          </div>
        </header>

        {/* Placeholder — will read from Marketplace contract once deployed */}
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 max-w-lg w-full shadow-sm">
            <ShoppingBag size={48} className="text-hub-green mx-auto mb-6 opacity-40" />
            <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-3">
              No Listings Yet
            </h2>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">
              The Marketplace contract has not been deployed. Once live, all active
              listings across the ecosystem will appear here.
            </p>
          </div>
        </div>

        <section className="mt-8 bg-white border border-gray-100 rounded-2xl p-5 flex gap-4 items-start shadow-sm">
          <div className="text-hub-green mt-1 shrink-0">
            <Info size={24} strokeWidth={3} />
          </div>
          <div>
            <h4 className="text-gray-900 font-black text-sm uppercase tracking-tight">About the Market</h4>
            <p className="text-gray-500 text-xs mt-1 leading-relaxed font-medium">
              Producers purchase inventory NFTs from the Treasury, then list them here for
              $BEER or $EGG. Buyers pay with tokens; proceeds go directly to the producer wallet.
              A small platform fee (governed by the Treasury) applies to each sale.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
