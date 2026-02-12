import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, Globe, Truck, ShieldCheck, BarChart3, Camera, Settings, CheckCircle, AlertCircle, X } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionTitle } from '../ui/SectionTitle';
import { trackEvent } from '../../utils/analytics';

// Sample CSV data for demo preview
const SAMPLE_DATA = [
  { codigo: 'TOY-04111-60122', descripcion: 'Bomba de agua Toyota 4Runner', marca: 'Toyota OEM', cantidad: 12, precio: 45.00 },
  { codigo: 'TOY-90919-01198', descripcion: 'Bujía Iridium Hilux 2.7', marca: 'Denso', cantidad: 48, precio: 8.50 },
  { codigo: 'TOY-23300-75100', descripcion: 'Filtro de combustible Land Cruiser', marca: 'Toyota OEM', cantidad: 20, precio: 22.00 },
  { codigo: 'TOY-04465-35290', descripcion: 'Pastillas de freno Prado delanteras', marca: 'Akebono', cantidad: 8, precio: 38.00 },
  { codigo: 'TOY-48609-60040', descripcion: 'Base amortiguador Fortuner', marca: 'KYB', cantidad: 15, precio: 29.50 },
];

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

function InventoryUploadDemo() {
  const [showPreview, setShowPreview] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDemoUpload = (name: string) => {
    setFileName(name);
    setShowPreview(true);
    trackEvent({
      action: 'rhinohub_csv_upload_demo',
      category: 'rhinohub',
      label: name,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleDemoUpload(file.name);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleDemoUpload(file.name);
    }
  };

  return (
    <div className="rhino-hub-upload-section-light">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet size={24} className="text-rhino-red" />
          <h3 className="text-xl sm:text-2xl font-bold text-rhino-white">
            Módulo de Carga de Inventario
          </h3>
          <span className="rhino-hub-badge">DEMO</span>
        </div>
        <p className="text-rhino-steel text-sm" style={{ marginBottom: '24px' }}>
          Sube tu catálogo en formato CSV o Excel y previsualiza los datos antes de publicarlos en la plataforma.
        </p>
      </motion.div>

      {/* Upload zone */}
      {!showPreview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`rhino-hub-dropzone-light ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <Upload size={40} className="text-rhino-light-gray" style={{ marginBottom: '16px' }} />
          <p className="text-rhino-white" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
            Arrastra tu archivo aquí
          </p>
          <p className="text-rhino-steel" style={{ fontSize: '13px', marginBottom: '16px' }}>
            o haz clic para seleccionar
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="rhino-hub-file-tag-light">.CSV</span>
            <span className="rhino-hub-file-tag-light">.XLSX</span>
            <span className="rhino-hub-file-tag-light">.XLS</span>
          </div>
          <button
            type="button"
            className="rhino-hub-demo-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleDemoUpload('inventario_demo.csv');
            }}
          >
            Probar con datos de ejemplo
          </button>
        </motion.div>
      )}

      {/* Preview table */}
      {showPreview && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* File info bar */}
          <div className="rhino-hub-file-bar-light">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} style={{ color: '#16a34a' }} />
              <span className="text-rhino-white text-sm">{fileName}</span>
              <span className="text-rhino-steel text-xs">— {SAMPLE_DATA.length} productos</span>
            </div>
            <button
              onClick={() => { setShowPreview(false); setFileName(''); }}
              className="rhino-hub-close-btn-light"
              aria-label="Cerrar previsualización"
            >
              <X size={16} />
            </button>
          </div>

          {/* Table */}
          <div className="rhino-hub-table-wrapper-light">
            <table className="rhino-hub-table-light">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th className="hidden sm:table-cell">Marca</th>
                  <th>Cant.</th>
                  <th>Precio USD</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_DATA.map((row, i) => (
                  <tr key={i}>
                    <td className="font-mono text-xs">{row.codigo}</td>
                    <td>{row.descripcion}</td>
                    <td className="hidden sm:table-cell">{row.marca}</td>
                    <td style={{ textAlign: 'center' }}>{row.cantidad}</td>
                    <td style={{ textAlign: 'right' }}>${row.precio.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Validation summary */}
          <div className="rhino-hub-validation">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} style={{ color: '#16a34a' }} />
              <span className="text-rhino-steel text-xs sm:text-sm">{SAMPLE_DATA.length} productos validados correctamente</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle size={14} style={{ color: '#f59e0b' }} />
              <span className="text-rhino-steel text-xs sm:text-sm">0 errores encontrados</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              type="button"
              className="rhino-hub-submit-btn"
              onClick={() => {
                trackEvent({
                  action: 'rhinohub_submit_inventory_demo',
                  category: 'rhinohub',
                  label: 'demo_submit',
                });
                alert('¡Demo! En la versión final, tu inventario se publicará en Rhino Hub.');
              }}
            >
              Publicar Inventario
            </button>
            <button
              type="button"
              className="rhino-hub-secondary-btn-light"
              onClick={() => { setShowPreview(false); setFileName(''); }}
            >
              Cargar otro archivo
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

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

      {/* Inventory Upload Demo — light theme */}
      <SectionWrapper id="rhino-hub-demo">
        <InventoryUploadDemo />
      </SectionWrapper>
    </div>
  );
}
