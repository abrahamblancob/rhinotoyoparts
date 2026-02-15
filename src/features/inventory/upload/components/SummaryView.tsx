import { useState, useMemo } from 'react';
import type { ProcessingResult, ColumnMapping } from '../types.ts';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { Pagination } from './Pagination.tsx';

interface Props {
  result: ProcessingResult;
  mappings: ColumnMapping[];
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
  onEditMappings: () => void;
  onBack?: () => void;
}

const PAGE_SIZE = 10;

/** Format a number as currency */
function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SummaryView({
  result,
  mappings,
  fileName,
  onConfirm,
  onCancel,
  onEditMappings,
  onBack,
}: Props) {
  const errorRowCount = new Set(result.errors.map((e) => e.rowNumber)).size;

  // Pagination state
  const [errorPage, setErrorPage] = useState(1);
  const [previewPage, setPreviewPage] = useState(1);

  // Inventory value calculations
  const inventoryStats = useMemo(() => {
    let totalStock = 0;
    let totalValue = 0;
    let totalCost = 0;
    let hasCost = false;

    for (const row of result.validRows) {
      totalStock += row.stock;
      totalValue += row.stock * row.price;
      if (row.cost != null && row.cost > 0) {
        totalCost += row.stock * row.cost;
        hasCost = true;
      }
    }

    return {
      totalStock,
      totalValue,
      totalCost,
      hasCost,
      estimatedProfit: hasCost ? totalValue - totalCost : 0,
    };
  }, [result.validRows]);

  // Error pagination
  const errorTotalPages = Math.ceil(result.errors.length / PAGE_SIZE);
  const errorPageData = result.errors.slice(
    (errorPage - 1) * PAGE_SIZE,
    errorPage * PAGE_SIZE,
  );

  // Preview pagination
  const previewTotalPages = Math.ceil(result.validRows.length / PAGE_SIZE);
  const previewPageData = result.validRows.slice(
    (previewPage - 1) * PAGE_SIZE,
    previewPage * PAGE_SIZE,
  );

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

      {/* Inventory value cards */}
      {result.validRows.length > 0 && (
        <div className="rh-stats-grid mb-6">
          <StatsCard
            title="Stock Total (uds)"
            value={inventoryStats.totalStock.toLocaleString()}
            icon="📦"
            color="#0EA5E9"
          />
          <StatsCard
            title="Valor Inventario (USD)"
            value={`$${fmtCurrency(inventoryStats.totalValue)}`}
            icon="💰"
            color="#10B981"
          />
          {inventoryStats.hasCost && (
            <StatsCard
              title="Costo Total (USD)"
              value={`$${fmtCurrency(inventoryStats.totalCost)}`}
              icon="🏷️"
              color="#F59E0B"
            />
          )}
          {inventoryStats.hasCost && (
            <StatsCard
              title="Ganancia Estimada (USD)"
              value={`$${fmtCurrency(inventoryStats.estimatedProfit)}`}
              icon="📈"
              color="#8B5CF6"
            />
          )}
        </div>
      )}

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

      {/* Errors table with pagination */}
      {result.errors.length > 0 && (
        <div className="rh-card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 0' }}>
            <h3 className="rh-card-title">
              Errores ({result.errors.length})
            </h3>
          </div>
          <div className="rh-table-wrapper">
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
                {errorPageData.map((err, i) => (
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
          <Pagination
            currentPage={errorPage}
            totalPages={errorTotalPages}
            totalItems={result.errors.length}
            pageSize={PAGE_SIZE}
            onPageChange={setErrorPage}
          />
        </div>
      )}

      {/* Preview table with pagination */}
      {result.validRows.length > 0 && (
        <div className="rh-card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 0' }}>
            <h3 className="rh-card-title">
              Vista Previa — Productos Validos ({result.validRows.length})
            </h3>
          </div>
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
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {previewPageData.map((p) => (
                  <tr key={p.rowNumber}>
                    <td className="cell-mono cell-muted">{p.rowNumber}</td>
                    <td className="cell-mono">{p.sku}</td>
                    <td className="cell-primary">{p.name}</td>
                    <td className="cell-muted">{p.brand ?? '—'}</td>
                    <td className="text-right cell-bold">${p.price.toFixed(2)}</td>
                    <td className="text-right">{p.stock}</td>
                    <td className="text-right cell-bold" style={{ color: '#10B981' }}>
                      ${fmtCurrency(p.stock * p.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={previewPage}
            totalPages={previewTotalPages}
            totalItems={result.validRows.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPreviewPage}
          />
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
        <div style={{ display: 'flex', gap: 8 }}>
          {onBack && (
            <button onClick={onBack} className="rh-btn rh-btn-ghost">
              ← Volver al Mapeo
            </button>
          )}
          <button onClick={onCancel} className="rh-btn rh-btn-ghost">
            Cancelar
          </button>
        </div>
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
