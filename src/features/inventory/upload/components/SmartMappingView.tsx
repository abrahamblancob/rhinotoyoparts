import { useState, useMemo } from 'react';
import type { SmartMappingResult } from '../smartMapping.ts';
import type { ColumnMapping, RawRow } from '../types.ts';
import { PRODUCT_FIELDS } from '../constants.ts';
import { Pagination } from './Pagination.tsx';

interface Props {
  result: SmartMappingResult;
  rawRows: RawRow[];
  onAccept: (mappings: ColumnMapping[]) => void;
  onCancel: () => void;
  onBack?: () => void;
}

const PAGE_SIZE = 10;

export function SmartMappingView({
  result,
  rawRows,
  onAccept,
  onCancel,
  onBack,
}: Props) {
  const [mappings, setMappings] = useState<ColumnMapping[]>(result.mappings);
  const [page, setPage] = useState(1);

  const handleChange = (index: number, field: string | null) => {
    setMappings((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, productField: field, autoDetected: false } : m,
      ),
    );
  };

  // Track which product fields are already assigned (for blocking duplicates)
  const usedFields = useMemo(() => {
    const map = new Map<string, number>();
    mappings.forEach((m, i) => {
      if (m.productField) {
        map.set(m.productField, i);
      }
    });
    return map;
  }, [mappings]);

  // Check required fields
  const mappedFields = new Set(
    mappings.filter((m) => m.productField).map((m) => m.productField!),
  );
  const requiredKeys = PRODUCT_FIELDS.filter((f) => f.required).map((f) => f.key);
  const missingRequired = requiredKeys.filter((f) => !mappedFields.has(f));
  const canContinue = missingRequired.length === 0;

  // Pagination
  const totalPages = Math.ceil(rawRows.length / PAGE_SIZE);
  const pageData = rawRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const headers = mappings.map((m) => m.fileHeader);

  return (
    <div>
      {/* Friendly header */}
      <div className="rh-card" style={{ padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>📋</div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#242321',
                marginBottom: 6,
              }}
            >
              Necesitamos tu ayuda para entender tu archivo
            </h3>
            <p
              style={{
                fontSize: 14,
                color: '#8A8886',
                lineHeight: 1.6,
                marginBottom: 8,
              }}
            >
              Abajo puedes ver tus datos tal como los leimos. En la primera fila, elige que
              significa cada columna usando los selectores.{' '}
              <strong style={{ color: '#242321' }}>Los campos con * son obligatorios.</strong>
            </p>
            <p
              style={{
                fontSize: 13,
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              🔒 Hasta este momento es un proceso local y nada se ha subido. Tranquilo, estamos aqui para ayudarte.
            </p>
          </div>
        </div>
      </div>

      {/* Required fields indicator */}
      {missingRequired.length > 0 && (
        <div
          className="rh-alert rh-alert-warning"
          style={{ marginBottom: 16, fontSize: 14 }}
        >
          <strong>Campos requeridos sin asignar:</strong>{' '}
          {missingRequired
            .map((f) => PRODUCT_FIELDS.find((p) => p.key === f)?.label ?? f)
            .join(', ')}
        </div>
      )}

      {canContinue && (
        <div
          className="rh-alert rh-alert-success"
          style={{ marginBottom: 16, fontSize: 14 }}
        >
          ✅ Todos los campos requeridos estan asignados. Puedes continuar.
        </div>
      )}

      {/* Spreadsheet-style table */}
      <div
        className="rh-card"
        style={{
          padding: 0,
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            overflowX: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: headers.length * 160,
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          >
            {/* Header row with select dropdowns */}
            <thead>
              <tr>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    zIndex: 4,
                    backgroundColor: '#F3F2F1',
                    padding: '8px 6px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#8A8886',
                    textAlign: 'center',
                    borderBottom: '1px solid #E8E6E4',
                    borderRight: '1px solid #E8E6E4',
                    width: 44,
                    minWidth: 44,
                  }}
                >
                  #
                </th>
                {headers.map((h, i) => {
                  const m = mappings[i];
                  const isAssigned = !!m.productField;
                  const wasAI =
                    result.mappings[i]?.productField === m.productField &&
                    m.productField !== null &&
                    result.usedAI;

                  return (
                    <th
                      key={i}
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        backgroundColor: isAssigned ? '#F0FDF4' : '#F9F8F7',
                        borderBottom: '1px solid #E8E6E4',
                        borderRight:
                          i < headers.length - 1 ? '1px solid #E8E6E4' : 'none',
                        padding: '6px 8px',
                        minWidth: 150,
                        verticalAlign: 'top',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      {/* Original column name */}
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#8A8886',
                          marginBottom: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </span>
                        {wasAI && (
                          <span
                            style={{
                              fontSize: 9,
                              padding: '1px 4px',
                              borderRadius: 3,
                              backgroundColor: '#EDE9FE',
                              color: '#7C3AED',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            IA
                          </span>
                        )}
                      </div>
                      {/* Select dropdown — only shows available (unselected) fields */}
                      <select
                        value={m.productField ?? ''}
                        onChange={(e) => handleChange(i, e.target.value || null)}
                        style={{
                          width: '100%',
                          padding: '5px 6px',
                          fontSize: 12,
                          fontWeight: 500,
                          border: `1.5px solid ${isAssigned ? '#86EFAC' : '#D1D0CE'}`,
                          borderRadius: 6,
                          backgroundColor: '#FFFFFF',
                          color: isAssigned ? '#166534' : '#6B7280',
                          outline: 'none',
                          cursor: 'pointer',
                          appearance: 'auto',
                        }}
                      >
                        <option value="">— Ignorar —</option>
                        {PRODUCT_FIELDS.map((f) => {
                          // Show if: this field is currently selected for this column, or not used by another column
                          const usedByOther = usedFields.has(f.key) && usedFields.get(f.key) !== i;
                          if (usedByOther) return null;
                          return (
                            <option key={f.key} value={f.key}>
                              {f.label} {f.required ? '*' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Data rows */}
            <tbody>
              {pageData.map((row, ri) => (
                <tr
                  key={row.rowNumber}
                  style={{
                    backgroundColor: ri % 2 === 0 ? '#FFFFFF' : '#FAFAF9',
                  }}
                >
                  {/* Row number */}
                  <td
                    style={{
                      padding: '7px 6px',
                      fontSize: 11,
                      color: '#A1A09E',
                      textAlign: 'center',
                      borderRight: '1px solid #E8E6E4',
                      borderBottom: '1px solid #F1F0EF',
                      fontWeight: 500,
                      backgroundColor: ri % 2 === 0 ? '#F9F8F7' : '#F3F2F1',
                    }}
                  >
                    {row.rowNumber}
                  </td>
                  {headers.map((h, ci) => {
                    const val = row.data[h] ?? '';
                    const isAssigned = !!mappings[ci].productField;

                    return (
                      <td
                        key={ci}
                        style={{
                          padding: '7px 10px',
                          fontSize: 13,
                          color: isAssigned ? '#242321' : '#A1A09E',
                          borderBottom: '1px solid #F1F0EF',
                          borderRight:
                            ci < headers.length - 1 ? '1px solid #F1F0EF' : 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 220,
                          fontWeight: isAssigned ? 400 : 300,
                          transition: 'color 0.2s, font-weight 0.2s',
                        }}
                        title={val}
                      >
                        {val || <span style={{ color: '#D1D0CE' }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={rawRows.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          {onBack && (
            <button onClick={onBack} className="rh-btn rh-btn-ghost">
              ← Volver
            </button>
          )}
          <button onClick={onCancel} className="rh-btn rh-btn-ghost">
            Cancelar
          </button>
        </div>
        <button
          onClick={() => onAccept(mappings)}
          className="rh-btn rh-btn-primary"
          disabled={!canContinue}
          style={{ padding: '12px 32px' }}
        >
          Continuar con {rawRows.length} filas →
        </button>
      </div>
    </div>
  );
}
