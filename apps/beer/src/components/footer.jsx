import React from 'react';

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-white py-6 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center">
        <div>
        <h3 className="text-[#FBB117] font-black uppercase tracking-widest mb-2">
        Beer Exchange
        </h3>
        <p className="text-gray-400 font-medium">
        A homebrewers spot for fermentation, craft knowledge, and the love of good beer.
        </p>
        </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 mt-4 pt-4 border-t border-gray-800 text-center text-gray-500 text-sm font-bold uppercase">
        © {new Date().getFullYear()} Beer Exchange • Brewed on a Raspberry Pi
        </div>
        </footer>
    );
}
