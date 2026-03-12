import { useState } from 'react';
import {
  ClipboardEdit,
  Package,
  MapPin,
  Hash,
  FileText,
  AlertCircle,
} from 'lucide-react';

type AdjustmentType = 'count' | 'correction' | 'damage';

const ADJUSTMENT_LABELS: Record<AdjustmentType, string> = {
  count: 'Conteo Fisico',
  correction: 'Correccion',
  damage: 'Dano / Merma',
};

export function StockAdjustment() {
  const [productSearch, setProductSearch] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('count');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  return (
    <div>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Ajustes de Inventario</h1>
          <p style={{ color: '#8A8886', fontSize: 14, marginTop: 4 }}>
            Realiza ajustes manuales para conteos fisicos, correcciones y mermas
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div
        style={{
          backgroundColor: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <AlertCircle size={20} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 2 }} />
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>
            Ajustes Manuales de Inventario
          </h3>
          <p style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5 }}>
            Los ajustes permiten corregir discrepancias entre el stock del sistema y el stock fisico.
            Cada ajuste queda registrado con motivo y usuario responsable para mantener la trazabilidad.
            Usa esta herramienta para conteos fisicos, correcciones de errores y registro de danos o mermas.
          </p>
        </div>
      </div>

      {/* Adjustment form */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 24,
          border: '1px solid #E1DFDD',
          maxWidth: 600,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#323130', marginBottom: 20 }}>
          <ClipboardEdit size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Nuevo Ajuste
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Product search */}
          <div>
            <label className="rh-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Package size={14} /> Producto
            </label>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="rh-input"
              placeholder="Buscar producto por nombre o SKU..."
            />
            <p style={{ fontSize: 11, color: '#8A8886', marginTop: 4 }}>
              Busqueda conectada al catalogo de productos (proximo a implementar)
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="rh-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={14} /> Ubicacion
            </label>
            <input
              type="text"
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
              className="rh-input"
              placeholder="Codigo de ubicacion (ej: A-01-03-02)"
            />
          </div>

          {/* Adjustment type */}
          <div>
            <label className="rh-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ClipboardEdit size={14} /> Tipo de Ajuste
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
              className="rh-input"
            >
              {(Object.entries(ADJUSTMENT_LABELS) as [AdjustmentType, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="rh-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Hash size={14} /> Cantidad
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rh-input"
              placeholder="Cantidad real contada o ajuste"
              min={0}
              style={{ maxWidth: 200 }}
            />
            <p style={{ fontSize: 11, color: '#8A8886', marginTop: 4 }}>
              Para conteo fisico: ingresa la cantidad real. Para correccion/dano: ingresa la diferencia.
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="rh-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText size={14} /> Motivo
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rh-input"
              placeholder="Describe el motivo del ajuste..."
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
            <button
              className="rh-btn rh-btn-primary"
              disabled
              title="Funcionalidad en desarrollo"
            >
              <ClipboardEdit size={16} style={{ marginRight: 4 }} />
              Registrar Ajuste
            </button>
            <button
              className="rh-btn"
              onClick={() => {
                setProductSearch('');
                setLocationCode('');
                setAdjustmentType('count');
                setQuantity('');
                setReason('');
              }}
            >
              Limpiar
            </button>
          </div>

          <p style={{ fontSize: 12, color: '#8A8886', fontStyle: 'italic' }}>
            El registro de ajustes se conectaraa con el servicio de inventario. Funcionalidad en desarrollo.
          </p>
        </div>
      </div>

      {/* Recent adjustments placeholder */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 24,
          border: '1px solid #E1DFDD',
          marginTop: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#323130', marginBottom: 16 }}>
          Ajustes Recientes
        </h2>

        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Ubicacion</th>
                <th>Tipo</th>
                <th className="text-right">Cantidad</th>
                <th>Motivo</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#8A8886' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <ClipboardEdit size={32} style={{ color: '#C8C6C4' }} />
                    <p style={{ fontSize: 15, fontWeight: 500 }}>Sin ajustes registrados</p>
                    <p style={{ fontSize: 13 }}>
                      Los ajustes de inventario apareceran aqui una vez que se registren.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
