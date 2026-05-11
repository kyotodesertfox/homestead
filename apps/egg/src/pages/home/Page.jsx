import React from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="py-12 px-4">
      <section className="max-w-4xl mx-auto">
        <div className="relative bg-white border-t-8 border-egg-yolk shadow-2xl rounded-b-lg p-8 md:p-12">

          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-gray-900 mb-6">
            Jacksonville, FL <span className="text-egg-yolk">Homestead</span>
          </h2>

          <div className="prose prose-lg text-gray-700 font-medium leading-relaxed">
            <p className="mb-4 text-xl">
              Word of mouth brought you here. Private homestead. High standards.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-10">
            <Link to="/our-process" className="group block">
              <span className="text-egg-yolk font-black text-xl md:text-2xl hover:underline">
                Learn about our process →
              </span>
              <img
                src="images/couple_eggs.png"
                className="w-full max-w-md aspect-video rounded-[2rem] overflow-hidden border-4 border-egg-yolk shadow-2xl bg-stone-100 mt-6 object-cover"
                alt="Our process"
              />
            </Link>

            <Link to="/how-it-works" className="group block">
              <span className="text-egg-yolk font-black text-xl md:text-2xl hover:underline">
                Learn how it works →
              </span>
              <img
                src="images/couple_crypto.png"
                className="w-full max-w-md aspect-video rounded-[2rem] overflow-hidden border-4 border-egg-yolk shadow-2xl bg-stone-100 mt-6 object-cover"
                alt="How it works"
              />
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/our-process"
              className="bg-egg-yolk text-black font-black py-3 px-8 uppercase tracking-widest hover:bg-black hover:text-egg-yolk transition-all duration-300 shadow-md"
            >
              Our Process
            </Link>
            <Link
              to="/trade"
              className="border-2 border-gray-900 text-gray-900 font-black py-3 px-8 uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all duration-300"
            >
              Trade $EGG
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
