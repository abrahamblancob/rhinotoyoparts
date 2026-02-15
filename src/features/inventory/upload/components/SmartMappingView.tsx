import { useState } from 'react';
import type { SmartMappingResult } from '../smartMapping.ts';
import type { ColumnMapping } from '../types.ts';
import { PRODUCT_FIELDS } from '../constants.ts';

interface Props {
  result: SmartMappingResult;
  onAccept: (mappings: ColumnMapping[]) => void;
  onCancel: () => void;
}

export function SmartMappingView({
  result,
  onAccept,
  onCancel,
}: Props) {
  const [mappings, setMappings] = useState<ColumnMapping[]>(result.mappings);

  const handleChange = (index: number, field: string | null) => {
    setMappings((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, productField: field, autoDetected: false } : m,
      ),
    );
  };

  // Check required fields
  const mappedFields = new Set(
    mappings.filter((m) => m.productField).map((m) => m.productField!),
  );
  const requiredKeys = PRODUCT_FIELDS.filter((f) => f.required).map((f) => f.key);
  const missingRequired = requiredKeys.filter((f) => !mappedFields.has(f));
  const canContinue = missingRequired.length === 0;

  return (
    <div className="rh-card" style={{ padding: '32px 28px', maxWidth: 700, margin: '0 auto' }}>
      {/* Friendly header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#242321',
            marginBottom: 10,
            lineHeight: 1.3,
          }}
        >
          Necesitamos tu ayuda para entender tu archivo
        </h3>
        <p
          style={{
            fontSize: 14,
            color: '#8A8886',
            lineHeight: 1.7,
            maxWidth: 520,
            margin: '0 auto',
          }}
        >
          Hemos analizado tu archivo y las columnas no coinciden del todo con los
          datos que necesitamos, pero <strong style={{ color: '#242321' }}>podemos ayudarte a procesarlo</strong> si
          eliges el significado de cada campo.
        </p>
        <p
          style={{
            fontSize: 13,
            color: '#10B981',
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          🔒 Hasta este momento es un proceso local y nada se ha subido. Tranquilo, estamos aqui para ayudarte.
        </p>
      </div>

      {/* Mapping table */}
      <div
        style={{
          border: '1px solid #E8E6E4',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'flex',
            padding: '12px 16px',
            backgroundColor: '#F9F8F7',
            borderBottom: '1px solid #E8E6E4',
            fontSize: 12,
            fontWeight: 600,
            color: '#8A8886',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          <div style={{ flex: 1 }}>Columna de tu archivo</div>
          <div style={{ width: 32 }} />
          <div style={{ flex: 1 }}>Corresponde a...</div>
        </div>

        {/* Mapping rows */}
        {mappings.map((m, i) => {
          const isAssigned = !!m.productField;
          const wasAutoDetected = result.mappings[i]?.productField === m.productField && m.productField !== null;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: i < mappings.length - 1 ? '1px solid #F1F0EF' : 'none',
                backgroundColor: isAssigned ? '#FAFFFE' : '#FFFFFF',
                transition: 'background-color 0.2s',
              }}
            >
              {/* File column name */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#242321',
                  }}
                >
                  {m.fileHeader}
                </span>
                {wasAutoDetected && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: result.usedAI ? '#EDE9FE' : '#E0F2FE',
                      color: result.usedAI ? '#7C3AED' : '#0284C7',
                      fontWeight: 600,
                    }}
                  >
                    {result.usedAI ? 'IA' : 'auto'}
                  </span>
                )}
              </div>

              {/* Arrow */}
              <div
                style={{
                  width: 32,
                  textAlign: 'center',
                  color: isAssigned ? '#10B981' : '#D1D0CE',
                  fontSize: 16,
                }}
              >
                →
              </div>

              {/* Select dropdown */}
              <div style={{ flex: 1 }}>
                <select
                  className="rh-select"
                  value={m.productField ?? ''}
                  onChange={(e) => handleChange(i, e.target.value || null)}
                  style={{
                    width: '100%',
                    borderColor: isAssigned ? '#BBF7D0' : '#E8E6E4',
                    backgroundColor: isAssigned ? '#F0FDF4' : '#FFFFFF',
                    fontSize: 13,
                  }}
                >
                  <option value="">— No usar esta columna —</option>
                  {PRODUCT_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label} {f.required ? '(requerido)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Required fields indicator */}
      {missingRequired.length > 0 && (
        <div
          className="rh-alert rh-alert-warning"
          style={{ marginBottom: 20, fontSize: 14 }}
        >
          <strong>Aun faltan campos requeridos:</strong>{' '}
          {missingRequired
            .map((f) => PRODUCT_FIELDS.find((p) => p.key === f)?.label ?? f)
            .join(', ')}
          . Asignalos en la lista de arriba para continuar.
        </div>
      )}

      {canContinue && (
        <div
          className="rh-alert rh-alert-success"
          style={{ marginBottom: 20, fontSize: 14 }}
        >
          ✅ Todos los campos requeridos estan asignados. Puedes continuar.
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 8,
        }}
      >
        <button onClick={onCancel} className="rh-btn rh-btn-ghost">
          Cancelar
        </button>
        <button
          onClick={() => onAccept(mappings)}
          className="rh-btn rh-btn-primary"
          disabled={!canContinue}
          style={{ padding: '12px 32px' }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
