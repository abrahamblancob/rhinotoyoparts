import type { SmartMappingResult } from '../smartMapping.ts';
import type { ColumnMapping } from '../types.ts';
import { PRODUCT_FIELDS } from '../constants.ts';

interface Props {
  result: SmartMappingResult;
  onAccept: (mappings: ColumnMapping[]) => void;
  onCancel: () => void;
  onEditMappings: () => void;
}

export function SmartMappingView({
  result,
  onAccept,
  onCancel,
  onEditMappings,
}: Props) {
  const mappedCount = result.mappings.filter((m) => m.productField).length;
  const requiredFields = PRODUCT_FIELDS.filter((f) => f.required).map((f) => f.key);
  const mappedFields = new Set(
    result.mappings.filter((m) => m.productField).map((m) => m.productField!),
  );
  const missingRequired = requiredFields.filter((f) => !mappedFields.has(f));

  return (
    <div className="rh-card" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>
          {result.usedAI ? '🤖' : '🔍'}
        </div>
        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#242321',
            marginBottom: 4,
          }}
        >
          {result.usedAI
            ? 'Mapeo Inteligente (IA)'
            : 'Mapeo Automatico'}
        </h3>
        <p style={{ fontSize: 14, color: '#8A8886' }}>
          {result.usedAI
            ? 'La IA analizo las columnas de tu archivo y sugirio el siguiente mapeo'
            : 'Se analizaron los nombres y contenidos de las columnas'}
        </p>
      </div>

      {/* Mapped columns */}
      {result.explanations.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#242321',
              marginBottom: 12,
            }}
          >
            Columnas mapeadas ({mappedCount})
          </h4>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {result.explanations.map((exp) => {
              const fieldLabel =
                PRODUCT_FIELDS.find((f) => f.key === exp.productField)?.label ??
                exp.productField;
              return (
                <div
                  key={exp.fileHeader}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 16px',
                    backgroundColor: '#F0FDF4',
                    borderRadius: 8,
                    border: '1px solid #BBF7D0',
                  }}
                >
                  <span style={{ color: '#10B981', fontSize: 16 }}>✓</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#242321',
                          backgroundColor: '#E8E6E4',
                          padding: '2px 8px',
                          borderRadius: 4,
                        }}
                      >
                        {exp.fileHeader}
                      </code>
                      <span style={{ color: '#8A8886' }}>→</span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#10B981',
                        }}
                      >
                        {fieldLabel}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#8A8886',
                        marginTop: 2,
                      }}
                    >
                      {exp.reason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unmapped columns */}
      {result.unmappedHeaders.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#8A8886',
              marginBottom: 12,
            }}
          >
            Columnas ignoradas ({result.unmappedHeaders.length})
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {result.unmappedHeaders.map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 13,
                  padding: '4px 12px',
                  backgroundColor: '#F1F0EF',
                  borderRadius: 6,
                  color: '#8A8886',
                }}
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing required fields warning */}
      {missingRequired.length > 0 && (
        <div className="rh-alert rh-alert-warning mb-4">
          <strong>Campos requeridos sin mapear:</strong>{' '}
          {missingRequired
            .map((f) => PRODUCT_FIELDS.find((p) => p.key === f)?.label ?? f)
            .join(', ')}
          . Usa "Editar mapeo" para asignarlos manualmente.
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 24,
          paddingTop: 16,
          borderTop: '1px solid #E8E6E4',
        }}
      >
        <button onClick={onCancel} className="rh-btn rh-btn-ghost">
          Cancelar
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onEditMappings} className="rh-btn rh-btn-outline">
            Editar mapeo
          </button>
          <button
            onClick={() => onAccept(result.mappings)}
            className="rh-btn rh-btn-primary"
            disabled={missingRequired.length > 0}
          >
            Continuar con este mapeo
          </button>
        </div>
      </div>
    </div>
  );
}
