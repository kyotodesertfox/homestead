import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, Award, ChevronLeft, ChevronRight } from 'lucide-react';

export default function RecipesPage() {

    return (
        <div className="bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">

        {/* Header Section */}
        <header className="mb-12 border-b-8 border-[#FBB117] pb-6 flex flex-col md:flex-row justify-between items-end">
        <div className="w-full md:w-auto">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-900">
        Our <span className="text-[#FBB117]">Recipes</span>
        </h1>
        <p className="text-gray-600 font-bold mt-2 uppercase tracking-widest text-sm italic">
        Our Best Beers
        </p>
        </div>
        </header>

        <div className="p-0 text-center font-black"><img src={`${import.meta.env.BASE_URL}coming-soon.png`} className="w-full max-w-lg mx-auto" />
        </div>


        </div>
        </div>
    );
}
