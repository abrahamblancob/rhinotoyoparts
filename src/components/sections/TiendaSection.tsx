import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionTitle } from '../ui/SectionTitle';
import { trackMercadoLibreClick } from '../../utils/analytics';

const MERCADOLIBRE_URL = 'https://listado.mercadolibre.com.ve/tienda-rhino-toyo-parts';

const storeImages = [
  { id: 1, src: '/tienda/mostrador-toyota.jpg', alt: 'Rhino Toyo Parts - Mostrador principal con logo Toyota' },
  { id: 2, src: '/tienda/estanteria-repuestos.jpg', alt: 'Rhino Toyo Parts - Estantería de repuestos y aceites' },
  { id: 3, src: '/tienda/equipos-diagnostico.jpg', alt: 'Rhino Toyo Parts - Equipos de diagnóstico y piezas de motor' },
  { id: 4, src: '/tienda/suspension-direccion.jpg', alt: 'Rhino Toyo Parts - Suspensión y sistemas de dirección' },
  { id: 5, src: '/tienda/direccion-baterias.jpg', alt: 'Rhino Toyo Parts - Cajas de dirección y baterías' },
  { id: 6, src: '/tienda/puerta-toyota.jpg', alt: 'Rhino Toyo Parts - Puerta Toyota y repuestos' },
];

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
            }}
          >
            <img
              src={img.src}
              alt={img.alt}
              loading={index === 0 ? 'eager' : 'lazy'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
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
          onClick={trackMercadoLibreClick}
        >
          <div className="rhino-ml-logo-container">
            <img
              src="/mercadolibre-logo.jpg"
              alt="Mercado Libre - Tienda Rhino Toyo Parts"
              width="160"
              height="160"
              loading="lazy"
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
