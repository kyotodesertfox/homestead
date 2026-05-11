import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout';

// This looks for any file ending in 'Page.jsx' inside the pages directory
const pages = import.meta.glob('./pages/**/*Page.jsx', { eager: true });

const routes = Object.keys(pages).map((path) => {
  // Logic to turn "./pages/Events/EventsPage.jsx" into "/events"
  const name = path
  .split('/')
  .filter(part => part !== '.' && part !== 'pages')
  .shift() // Get the folder name (e.g., 'Events')
.toLowerCase();

return {
  path: name === 'home' ? '/' : `/${name}`,
  component: pages[path].default,
};
});

export default function App() {
  return (
    <BrowserRouter>
    <Routes>
    <Route path="/" element={<MainLayout />}>
    {routes.map(({ path, component: Component }) => (
      <Route key={path} path={path} element={<Component />} />
    ))}
    {/* The 404 "Kicked Keg" Safety Net */}
    <Route path="*" element={<div className="p-20 text-center font-black"><img src={`${import.meta.env.BASE_URL}404.png`} className="w-full max-w-lg mx-auto" /></div>} />
    </Route>
    </Routes>
    </BrowserRouter>
  );
}
