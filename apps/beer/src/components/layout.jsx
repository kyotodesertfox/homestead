import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './navbar';
import Footer from './footer';

export default function Layout() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Using the Navbar we actually created */}
        <Navbar />

        <main className="flex-grow">
        {/* This allows index/page.jsx or events/page.jsx to show up */}
        <Outlet />
        </main>

        <Footer className="w-full" />

        {/* No Header or Footer tags here until we build the files */}
        </div>
    );
}
