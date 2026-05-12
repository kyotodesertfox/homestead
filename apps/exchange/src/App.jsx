import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout';

const pages = import.meta.glob('./pages/**/*Page.jsx', { eager: true });

const routes = Object.keys(pages).map((path) => {
  const name = path
    .split('/')
    .filter(part => part !== '.' && part !== 'pages')
    .shift()
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
          <Route path="*" element={
            <div className="p-20 text-center">
              <h1 className="text-6xl font-black text-hub-green">404</h1>
              <p className="text-gray-500 font-bold mt-4 uppercase tracking-widest">Page not found</p>
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
