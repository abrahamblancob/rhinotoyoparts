import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionTitle } from '../ui/SectionTitle';

const MERCADOLIBRE_URL = 'https://listado.mercadolibre.com.ve/tienda-rhino-toyo-parts';

// Placeholder images - se reemplazarán con fotos reales de la tienda
const storeImages = [
  { id: 1, alt: 'Tienda Rhino Toyo Parts - Fachada' },
  { id: 2, alt: 'Tienda Rhino Toyo Parts - Interior' },
  { id: 3, alt: 'Tienda Rhino Toyo Parts - Estantería' },
  { id: 4, alt: 'Tienda Rhino Toyo Parts - Mostrador' },
  { id: 5, alt: 'Tienda Rhino Toyo Parts - Almacén' },
];

const placeholderColors = ['#d32f2f', '#b71c1c', '#ef5350', '#c62828', '#e53935'];

function ImageSlider() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? storeImages.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === storeImages.length - 1 ? 0 : c + 1));

  return (
    <div className="rhino-slider-container">
      {/* Image area */}
      <div className="rhino-slider-viewport">
        {storeImages.map((img, index) => (
          <div
            key={img.id}
            className="rhino-slider-slide"
            style={{
              transform: `translateX(${(index - current) * 100}%)`,
              backgroundColor: placeholderColors[index],
            }}
          >
            <div className="rhino-slider-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <p style={{ color: 'white', fontSize: '14px', marginTop: '12px', fontWeight: 600 }}>
                {img.alt}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <button onClick={prev} className="rhino-slider-btn rhino-slider-btn-left" aria-label="Anterior">
        <ChevronLeft size={24} />
      </button>
      <button onClick={next} className="rhino-slider-btn rhino-slider-btn-right" aria-label="Siguiente">
        <ChevronRight size={24} />
      </button>

      {/* Dots */}
      <div className="rhino-slider-dots">
        {storeImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`rhino-slider-dot ${index === current ? 'active' : ''}`}
            aria-label={`Ir a imagen ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export function TiendaSection() {
  return (
    <SectionWrapper id="tienda">
      <SectionTitle
        title="Tienda"
        subtitle="Visita nuestra tienda fisica o compra en linea a traves de Mercado Libre."
      />

      <div className="rhino-tienda-grid">
        {/* MercadoLibre Card */}
        <motion.a
          href={MERCADOLIBRE_URL}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rhino-ml-card"
        >
          <div className="rhino-ml-logo-container">
            <img
              src="/mercadolibre-logo.jpg"
              alt="Mercado Libre"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <h3 className="rhino-ml-title">Mercado Libre</h3>
          <p className="rhino-ml-desc">
            Compra repuestos Toyota con envio a toda Venezuela. Pago seguro y garantizado.
          </p>
          <span className="rhino-ml-btn">
            Visitar Tienda
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17l9.2-9.2M17 17V7H7"/>
            </svg>
          </span>
        </motion.a>

        {/* Image Slider */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <ImageSlider />
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
