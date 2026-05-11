import React from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
    return (
        <div className="py-12 px-4">
        {/* The Brewery Manifest Container */}
        <section className="max-w-4xl mx-auto">
        <div className="relative bg-white border-t-8 border-[#FBB117] shadow-2xl rounded-b-lg p-8 md:p-12">

        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-gray-900 mb-6">
        The <span className="text-[#FBB117]">Craft</span> & The Beer
        </h2>

        <div className="prose prose-lg text-gray-700 font-medium leading-relaxed">
        <p className="mb-4 text-xl">
        Built on one simple idea: have fun and brew better beer. Beer Exchange is a personal brewing space where homebrewers can bring their craft out of the garage and into the open — showcasing batches, sharing recipes, and listing brews available for tasting or trade.</p>

        <p className="mb-4 text-xl">
        Every beer here started with creativity, a little science, and a genuine love for the process. Browse the tap list, dig into the recipes behind real batches, and see what’s available to share. Whether it’s an experimental saison, a classic stout, or a hop-forward IPA — each entry tells the story of a brew worth talking about.</p>

        <p className="mb-6">
        This is a place for the beer, not the brand. A digital taproom — powered by a Raspberry Pi — where the craft speaks for itself. If you make it and want to share it, you’re in the right place.</p>
        </div>

        {/* Call to Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4">
        <Link to="/recipes" className="bg-[#FBB117] text-black font-black py-3 px-8 uppercase tracking-widest hover:bg-black hover:text-[#FBB117] transition-all duration-300 shadow-md">
        Browse Recipes</Link>
        <Link to="/swap" className="border-2 border-gray-900 text-gray-900 font-black py-3 px-8 uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all duration-300">
        Beer Exchange</Link>
        </div>
        </div>
        </section>
        </div>
    );
}
