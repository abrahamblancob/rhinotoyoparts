import type { ProcessingResult, ColumnMapping } from '../types.ts';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';

interface Props {
  result: ProcessingResult;
  mappings: ColumnMapping[];
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
  onEditMappings: () => void;
}

export function SummaryView({
  result,
  mappings,
  fileName,
  onConfirm,
  onCancel,
  onEditMappings,
}: Props) {
  const errorRowCount = new Set(result.errors.map((e) => e.rowNumber)).size;
  const previewRows = result.validRows.slice(0, 10);

  return (
    <div>
      {/* File name */}
      <p style={{ fontSize: 14, color: '#8A8886', marginBottom: 16 }}>
        Archivo: <strong style={{ color: '#242321' }}>{fileName}</strong>
      </p>

      {/* Stats cards */}
      <div className="rh-stats-grid mb-6">
        <StatsCard title="Total Filas" value={result.totalRows} icon="📊" color="#6366F1" />
        <StatsCard title="Validos" value={result.validRows.length} icon="✅" color="#10B981" />
        <StatsCard title="Con Errores" value={errorRowCount} icon="❌" color="#D3010A" />
        <StatsCard title="Advertencias" value={result.warnings.length} icon="⚠️" color="#F59E0B" />
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="rh-alert rh-alert-warning mb-4">
          <strong>Advertencias:</strong>
          <ul style={{ marginTop: 4, paddingLeft: 20 }}>
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Column mapping summary */}
      <div className="rh-card mb-6">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 className="rh-card-title" style={{ marginBottom: 0 }}>
            Mapeo de Columnas
          </h3>
          <button
            onClick={onEditMappings}
            className="rh-btn rh-btn-ghost rh-btn-sm"
          >
            Editar mapeo
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {mappings
            .filter((m) => m.productField)
            .map((m) => (
              <span
                key={m.fileHeader}
                className="rh-badge"
                style={{
                  backgroundColor: m.autoDetected ? '#10B98115' : '#6366F115',
                  color: m.autoDetected ? '#10B981' : '#6366F1',
                }}
              >
                {m.fileHeader} → {m.productField}
              </span>
            ))}
          {mappings.filter((m) => !m.productField).length > 0 && (
            <span
              className="rh-badge"
              style={{ backgroundColor: '#8A888615', color: '#8A8886' }}
            >
              {mappings.filter((m) => !m.productField).length} columna(s) sin mapear
            </span>
          )}
        </div>
      </div>

      {/* Errors table */}
      {result.errors.length > 0 && (
        <div className="rh-card mb-6">
          <h3 className="rh-card-title">Errores ({result.errors.length})</h3>
          <div
            className="rh-table-wrapper"
            style={{ maxHeight: 300, overflowY: 'auto' }}
          >
            <table className="rh-table">
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Campo</th>
                  <th>Valor</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.slice(0, 50).map((err, i) => (
                  <tr key={i}>
                    <td className="cell-mono">{err.rowNumber}</td>
                    <td className="cell-muted">{err.field}</td>
                    <td className="cell-mono">{err.value || '(vacio)'}</td>
                    <td style={{ color: '#D3010A' }}>{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.errors.length > 50 && (
            <p style={{ fontSize: 13, color: '#8A8886', padding: '8px 16px' }}>
              Mostrando 50 de {result.errors.length} errores
            </p>
          )}
        </div>
      )}

      {/* Preview table */}
      {previewRows.length > 0 && (
        <div className="rh-card mb-6">
          <h3 className="rh-card-title">
            Vista Previa (primeros {previewRows.length} productos validos)
          </h3>
          <div className="rh-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="rh-table">
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>SKU</th>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th className="text-right">Precio</th>
                  <th className="text-right">Stock</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((p) => (
                  <tr key={p.rowNumber}>
                    <td className="cell-mono cell-muted">{p.rowNumber}</td>
                    <td className="cell-mono">{p.sku}</td>
                    <td className="cell-primary">{p.name}</td>
                    <td className="cell-muted">{p.brand ?? '—'}</td>
                    <td className="text-right cell-bold">${p.price.toFixed(2)}</td>
                    <td className="text-right">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button onClick={onCancel} className="rh-btn rh-btn-ghost">
          Cancelar
        </button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {result.validRows.length === 0 ? (
            <p style={{ color: '#D3010A', fontSize: 14, fontWeight: 500 }}>
              No hay productos validos para cargar
            </p>
          ) : (
            <button onClick={onConfirm} className="rh-btn rh-btn-primary">
              Cargar {result.validRows.length} Productos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
