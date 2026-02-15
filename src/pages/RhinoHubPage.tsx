import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, LogIn } from 'lucide-react';
import { RhinoHubSection } from '../components/sections/RhinoHubSection';
import { Footer } from '../components/layout/Footer';
import { trackEvent } from '../utils/analytics';

function RhinoHubNavbar() {
  return (
    <motion.nav
      aria-label="Navegacion Rhino Hub"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 bg-rhino-dark/95 backdrop-blur-md border-b border-white/5"
    >
      <div className="rhino-container">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link to="/" className="shrink-0">
              <img src="/logo.jpg" alt="Rhino Toyo Parts - Inicio" width="60" height="28" className="h-7 w-auto" />
            </Link>
            <span className="hidden sm:inline-block text-sm font-semibold uppercase tracking-wider text-rhino-white">
              Rhino <span className="text-rhino-red">Hub</span>
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <Link
              to="/"
              onClick={() => trackEvent({ action: 'rhinohub_back_to_home', category: 'rhinohub', label: 'navbar' })}
              className="inline-flex items-center gap-1.5 text-rhino-silver hover:text-rhino-white transition-colors text-sm"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Volver al inicio</span>
              <span className="sm:hidden">Inicio</span>
            </Link>
            <Link
              to="/hub/login"
              onClick={() => trackEvent({ action: 'rhinohub_login_click', category: 'rhinohub', label: 'navbar' })}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md transition-all hover:opacity-90"
              style={{ backgroundColor: '#D3010A', color: '#fff' }}
            >
              <LogIn size={15} />
              <span>Iniciar sesión</span>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

export function RhinoHubPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    trackEvent({ action: 'rhinohub_page_view', category: 'rhinohub', label: 'page_load' });
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <RhinoHubNavbar />
      <main style={{ paddingTop: '56px' }}>
        <RhinoHubSection />
      </main>
      <Footer />
    </div>
  );
}
