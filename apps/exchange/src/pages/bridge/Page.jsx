import React from 'react';
import { useAccount } from 'wagmi';
import { Info } from 'lucide-react';

export default function BridgePage() {
  const { address } = useAccount();

  const params = new URLSearchParams({
    to: 'TAIKO_MAINNET',
    lockTo: 'TAIKO_MAINNET',
    destAddress: address ?? '0x0000000000000000000000000000000000000000',
    asset: 'ETH',
    actionButtonText: 'Deposit into Homestead',
    defaultTab: 'cex',
  });

  return (
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto">

        <header className="mb-12 border-b-8 border-hub-green pb-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
            Bridge <span className="text-hub-green">$ETH</span>
          </h1>
          <p className="text-gray-600 font-bold mt-2 uppercase tracking-widest text-sm italic">
            Move funds to Taiko Mainnet
          </p>
        </header>

        <div className="max-w-3xl mx-auto">
          <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 shadow-xl">
            <iframe
              src={`https://layerswap.io/app/?${params.toString()}`}
              width="100%"
              height="650"
              frameBorder="0"
              title="Layerswap Bridge"
              className="rounded-2xl"
            />
          </div>

          <section className="mt-8 bg-white border border-gray-100 rounded-2xl p-5 flex gap-4 items-start shadow-sm">
            <div className="text-hub-green mt-1 shrink-0">
              <Info size={24} strokeWidth={3} />
            </div>
            <div>
              <h4 className="text-gray-900 font-black text-sm uppercase tracking-tight">About the Bridge</h4>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed font-medium">
                Powered by Layerswap. Move ETH from Coinbase, Binance, or any major exchange
                directly to your Taiko wallet. Settlement typically occurs within 120 seconds.
                Your connected wallet address is pre-filled as the destination.
              </p>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
