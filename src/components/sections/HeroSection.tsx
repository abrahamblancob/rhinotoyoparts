import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#000000' }}
    >
      {/* Video Background */}
      <div className="rhino-hero-video-wrapper">
        <video autoPlay muted loop playsInline>
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 z-10 pointer-events-none" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} />

      {/* Content */}
      <div className="relative z-20 text-center rhino-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <span
            className="inline-block font-bold text-xs sm:text-sm uppercase"
            style={{ color: '#ef5350', letterSpacing: '0.25em', marginBottom: '16px' }}
          >
            Repuestos Toyota en Venezuela
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-4 sm:mb-6 leading-tight"
          style={{ color: '#ffffff' }}
        >
          RHINO{' '}
          <span style={{ color: '#d32f2f' }}>TOYO</span>{' '}
          PARTS
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold"
          style={{ color: '#ffffff', textAlign: 'center', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '40px', lineHeight: '1.6' }}
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
          <ChevronDown size={28} style={{ color: 'rgba(255,255,255,0.7)' }} aria-hidden="true" />
        </motion.div>
      </motion.div>
    </section>
  );
}
