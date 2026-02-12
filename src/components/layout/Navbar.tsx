import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { NAV_ITEMS } from '../../config/navigation';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { trackNavClick } from '../../utils/analytics';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { scrolled } = useScrollDirection();

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  return (
    <motion.nav
      aria-label="Navegacion principal"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-rhino-dark/95 backdrop-blur-md shadow-lg shadow-black/5'
          : 'bg-transparent'
      }`}
    >
      <div className="rhino-container">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="#inicio" className="shrink-0">
            <img src="/logo.jpg" alt="Rhino Toyo Parts - Inicio" width="120" height="56" className="h-14 w-auto" />
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => trackNavClick(item.label)}
                className="text-rhino-silver hover:text-rhino-white transition-colors duration-200 text-sm font-medium uppercase tracking-wider relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-rhino-red group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={toggleMenu}
            className="md:hidden text-rhino-silver hover:text-rhino-white p-2"
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
            className="md:hidden bg-rhino-darker/98 backdrop-blur-lg border-t border-rhino-light-gray"
          >
            <div className="rhino-container py-6 space-y-4">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => { trackNavClick(item.label); closeMenu(); }}
                  className="block text-rhino-silver hover:text-rhino-white hover:pl-2 transition-all duration-200 text-base font-medium uppercase tracking-wider py-2"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
