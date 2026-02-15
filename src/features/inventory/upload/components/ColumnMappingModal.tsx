import { useState } from 'react';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import type { ColumnMapping } from '../types.ts';
import { PRODUCT_FIELDS } from '../constants.ts';

interface Props {
  open: boolean;
  onClose: () => void;
  mappings: ColumnMapping[];
  onSave: (mappings: ColumnMapping[]) => void;
}

export function ColumnMappingModal({ open, onClose, mappings, onSave }: Props) {
  const [local, setLocal] = useState<ColumnMapping[]>(mappings);

  const handleChange = (index: number, field: string | null) => {
    setLocal((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, productField: field, autoDetected: false } : m,
      ),
    );
  };

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  // Sync local state when mappings prop changes
  const handleOpen = () => {
    setLocal(mappings);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        handleOpen();
        onClose();
      }}
      title="Mapeo de Columnas"
      width="600px"
      footer={
        <>
          <button onClick={onClose} className="rh-btn rh-btn-ghost">
            Cancelar
          </button>
          <button onClick={handleSave} className="rh-btn rh-btn-primary">
            Guardar Mapeo
          </button>
        </>
      }
    >
      <p style={{ fontSize: 14, color: '#8A8886', marginBottom: 16 }}>
        Asigna cada columna de tu archivo a un campo del producto. Los campos
        marcados con * son requeridos.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {local.map((m, i) => (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <span
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'monospace',
                color: '#242321',
              }}
            >
              {m.fileHeader}
            </span>
            <span style={{ color: '#8A8886' }}>\u2192</span>
            <select
              className="rh-select"
              value={m.productField ?? ''}
              onChange={(e) => handleChange(i, e.target.value || null)}
              style={{ flex: 1 }}
            >
              <option value="">— Omitir —</option>
              {PRODUCT_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label} {f.required ? '*' : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </Modal>
  );
}
