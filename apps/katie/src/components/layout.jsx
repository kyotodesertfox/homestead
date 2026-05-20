import { Outlet } from 'react-router-dom';
import Navbar from './navbar';
import Footer from './footer';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
