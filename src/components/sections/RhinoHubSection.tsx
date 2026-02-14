import { motion } from 'framer-motion';
import { Globe, Truck, ShieldCheck, BarChart3, Camera, Settings } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionTitle } from '../ui/SectionTitle';
import { trackEvent } from '../../utils/analytics';

const BENEFITS = [
  {
    icon: Globe,
    title: 'Mayor Alcance',
    description: 'Llega a miles de compradores en toda Venezuela. Tu inventario visible 24/7 en nuestra plataforma digital.',
  },
  {
    icon: Camera,
    title: 'Rhino Vision',
    description: 'Ofrecemos a tus clientes la posibilidad de buscar repuestos solo con una foto gracias a nuestra inteligencia artificial. Una funcionalidad gratuita que impulsa tus ventas al conectar compradores con tu inventario de forma inmediata.',
  },
  {
    icon: Truck,
    title: 'Logística Gestionada',
    description: 'Nos encargamos del envío y la distribución. Tú vendes, nosotros entregamos en todo el país.',
  },
  {
    icon: ShieldCheck,
    title: 'Pagos Seguros',
    description: 'Recibe tus pagos de forma segura y puntual. Múltiples métodos: transferencia, pago móvil y divisas.',
  },
  {
    icon: BarChart3,
    title: 'Auditoría en Tiempo Real',
    description: 'Monitorea tu inventario en todo momento. Visualiza stock disponible, productos vendidos y movimientos en tiempo real desde tu panel de proveedor.',
  },
  {
    icon: Settings,
    title: 'Integración con tu ERP',
    description: 'Conectamos nuestra plataforma directamente con tu sistema de gestión ERP. Sincroniza inventario, precios y pedidos de forma automática sin duplicar trabajo.',
  },
];

export function RhinoHubSection() {
  return (
    <div>
      {/* Hero — dark with image */}
      <section id="rhino-hub" style={{ backgroundColor: '#0f0f0f' }}>
        <div className="rhino-hub-hero">
          <div className="rhino-hub-hero-bg">
            <img
              src="/rhino-hub/rhino-hub-hero.png"
              alt="Rhino Hub - Plataforma B2B de repuestos Toyota"
              loading="eager"
            />
            <div className="rhino-hub-hero-overlay" />
          </div>
          <div className="rhino-container" style={{ position: 'relative', zIndex: 2 }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rhino-hub-hero-content"
            >
              <span className="rhino-hub-badge-lg">NUEVA PLATAFORMA B2B</span>
              <h2 className="rhino-hub-hero-title">
                Rhino <span style={{ color: '#d32f2f' }}>Hub</span>
              </h2>
              <p className="rhino-hub-hero-subtitle">
                Conecta tu tienda de repuestos con miles de compradores en toda Venezuela.
                Lista tu inventario, nosotros nos encargamos del resto.
              </p>
              <a
                href="#rhino-hub-benefits"
                className="rhino-hero-btn-primary"
                style={{ marginTop: '8px' }}
                onClick={() => trackEvent({ action: 'rhinohub_cta_click', category: 'rhinohub', label: 'hero_cta' })}
              >
                Únete como Proveedor
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits — light theme like landing */}
      <SectionWrapper id="rhino-hub-benefits">
        <SectionTitle
          title="¿Por qué unirte a Rhino Hub?"
          subtitle="La plataforma que potencia tu negocio de repuestos Toyota"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {BENEFITS.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rhino-hub-benefit-card-light"
            >
              <div className="rhino-hub-benefit-icon">
                <benefit.icon size={28} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-rhino-white" style={{ marginBottom: '12px' }}>
                {benefit.title}
              </h3>
              <p className="text-rhino-steel" style={{ fontSize: '14px', lineHeight: '1.7' }}>
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </SectionWrapper>
    </div>
  );
}
