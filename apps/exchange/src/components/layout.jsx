import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './navbar';
import Footer from './footer';
import HomesteadChat from './HomesteadChat';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      <HomesteadChat />
    </div>
  );
}
