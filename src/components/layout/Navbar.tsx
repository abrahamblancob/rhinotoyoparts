import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { NAV_ITEMS } from '../../config/navigation';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { trackNavClick } from '../../utils/analytics';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { scrolled } = useScrollDirection();
  const location = useLocation();

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  const handleNavClick = (label: string, href: string) => {
    trackNavClick(label);

    // If it's a hash link and we're on the home page, scroll to section
    if (href.startsWith('/#') && location.pathname === '/') {
      const sectionId = href.substring(2);
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <motion.nav
      aria-label="Navegacion principal"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? 'bg-gradient-to-r from-rhino-red to-red-700 shadow-lg shadow-black/20'
        : 'bg-gradient-to-r from-rhino-red to-red-700'
        }`}
    >
      <div className="rhino-container">
        <div className="flex items-center justify-between h-10">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <img src="/logo.jpg" alt="Rhino Toyo Parts - Inicio" width="60" height="28" className="h-7 w-auto" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => {
              const isExternal = item.href.startsWith('/#');
              const isActive = location.pathname === item.href ||
                (item.href === '/' && location.pathname === '/');

              return isExternal ? (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNavClick(item.label, item.href)}
                  className={`text-white hover:text-gray-200 transition-colors duration-200 text-sm font-medium uppercase tracking-wider relative group ${isActive ? 'text-white font-bold' : ''
                    }`}
                >
                  {item.label}
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-white transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'
                    }`} />
                </a>
              ) : (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => handleNavClick(item.label, item.href)}
                  className={`text-white hover:text-gray-200 transition-colors duration-200 text-sm font-medium uppercase tracking-wider relative group ${isActive ? 'text-white font-bold' : ''
                    }`}
                >
                  {item.label}
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-white transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'
                    }`} />
                </Link>
              );
            })}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={toggleMenu}
            className="md:hidden text-white hover:text-gray-200 p-2"
            aria-label={isOpen ? 'Cerrar menu' : 'Abrir menu'}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-red-800/98 backdrop-blur-lg border-t border-red-900"
          >
            <div className="rhino-container py-6 space-y-4">
              {NAV_ITEMS.map((item) => {
                const isExternal = item.href.startsWith('/#');
                const isActive = location.pathname === item.href ||
                  (item.href === '/' && location.pathname === '/');

                return isExternal ? (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => { handleNavClick(item.label, item.href); closeMenu(); }}
                    className={`block text-white hover:text-gray-200 hover:pl-2 transition-all duration-200 text-base font-medium uppercase tracking-wider py-2 ${isActive ? 'text-white pl-2 font-bold' : ''
                      }`}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => { handleNavClick(item.label, item.href); closeMenu(); }}
                    className={`block text-white hover:text-gray-200 hover:pl-2 transition-all duration-200 text-base font-medium uppercase tracking-wider py-2 ${isActive ? 'text-white pl-2 font-bold' : ''
                      }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
