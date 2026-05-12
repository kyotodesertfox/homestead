import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-homestead-header text-white py-6 mt-auto">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <div>
          <h3 className="text-egg-yolk font-black uppercase tracking-widest mb-2">
            Egg Exchange
          </h3>
          <p className="text-gray-400 font-medium">
            Private homesteads. High standards, real eggs, on-chain.
          </p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 mt-4 pt-4 border-t border-gray-800 text-center text-gray-500 text-sm font-bold uppercase">
        © {new Date().getFullYear()} Egg Exchange • Grown on a Homestead
      </div>
    </footer>
  );
}
