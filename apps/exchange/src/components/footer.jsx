import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-hub-dark text-white py-6 mt-auto">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <h3 className="text-hub-green font-black uppercase tracking-widest mb-2">
          Homestead Exchange
        </h3>
        <p className="text-gray-400 font-medium">
          Physical goods, on-chain. Built on Taiko.
        </p>
      </div>
      <div className="max-w-5xl mx-auto px-4 mt-4 pt-4 border-t border-gray-800 text-center text-gray-500 text-sm font-bold uppercase">
        © {new Date().getFullYear()} Homestead Exchange
      </div>
    </footer>
  );
}
