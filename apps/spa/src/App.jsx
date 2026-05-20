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
    <BrowserRouter basename="/spa">
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {routes.map(({ path, component: Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
          <Route path="*" element={
            <div className="py-32 text-center">
              <p className="font-display text-4xl font-bold text-spa-purple">Page not found.</p>
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
