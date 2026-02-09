import { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const RhinoScene = lazy(() =>
  import('../three/RhinoScene').then((m) => ({ default: m.RhinoScene })),
);

function HeroLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-rhino-red border-t-transparent rounded-full animate-spin" />
        <p className="text-rhino-steel text-sm">Cargando experiencia 3D...</p>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-rhino-dark"
    >
      {/* 3D Background */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<HeroLoader />}>
          <RhinoScene />
        </Suspense>
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-white/80 via-white/30 to-white/95 pointer-events-none" />
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-white/50 via-transparent to-white/50 pointer-events-none" />

      {/* Content */}
      <div className="relative z-20 text-center rhino-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <span className="inline-block text-rhino-red font-bold text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-3 sm:mb-4">
            Repuestos Toyota en Venezuela
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-rhino-white mb-4 sm:mb-6 leading-tight"
        >
          RHINO{' '}
          <span className="text-rhino-red">TOYO</span>{' '}
          PARTS
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold"
          style={{ color: '#1a1a1a', textAlign: 'center', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '40px', lineHeight: '1.6' }}
        >
          La fuerza del rinoceronte en cada repuesto.
          <br className="hidden sm:block" />
          Calidad y confianza para tu Toyota.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center items-center"
        >
          <a href="#nosotros" className="rhino-hero-btn-primary">
            Conócenos
          </a>
          <a href="#tienda" className="rhino-hero-btn-outline">
            Tienda
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <ChevronDown size={28} className="text-rhino-steel" aria-hidden="true" />
        </motion.div>
      </motion.div>
    </section>
  );
}
