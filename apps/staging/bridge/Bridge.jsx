import React from 'react';

export default function Bridge({ setActiveTab, userAddress = '0x0000000000000000000000000000000000000000' }) {

    // Layerswap Parameters optimized for Taiko
    const params = new URLSearchParams({
        to: 'TAIKO_MAINNET',
        lockTo: '0x0000000000000000000000000000000000000001',
        destAddress: '0x1234567890abcdef1234567890abcdef12345678',
        asset: 'ETH',
        actionButtonText: 'Deposit into Homestead',
        sourceExchangeName: 'Coinbase',
        defaultTab: 'cex',
        // Optional: you can add 'sourceExchangeName' if you want to default to Coinbase/Binance
    });

    return (
        <section className="w-full max-w-5xl px-8 py-16 animate-in fade-in duration-700">
        <div className="bg-white border-b-8 border-r-8 border-stone-200 rounded-[3rem] p-12 shadow-2xl">

        <header className="mb-12 border-b border-stone-100 pb-8 text-center md:text-left">
        <h2 className="text-5xl font-serif font-black text-homestead-header mb-4 italic">
        Bridge <span className="text-egg-yolk underline decoration-stone-200">$ETH</span>
        </h2>
        <p className="text-xl text-stone-500 font-medium leading-relaxed max-w-2xl">
        Move crypto assets directly from your exchange platform into my Homestead ecosystem
        </p>
        </header>

        {/* The Layerswap Inset Container */}

        <iframe
        src={`https://layerswap.io/app/?${params.toString()}`}
        width="100%"
        height="650"
        frameBorder="0"
        title="Layerswap"
        className="rounded-[2rem]"
        />


        <footer className="mt-12 text-center">
        <p className="text-stone-800 text-xs font-bold uppercase tracking-widest">
        Settlement usually occurs within 120 seconds
        </p>
        </footer>

        </div>
        </section>
    );
}
