import type { Organization } from '@/lib/database.types.ts';
import type { WarehouseForm } from './types.ts';

interface WarehouseStepProps {
  warehouse: WarehouseForm;
  setWarehouse: React.Dispatch<React.SetStateAction<WarehouseForm>>;
  isPlatform: boolean;
  aggregators: Organization[];
  selectedAggregatorId: string;
  setSelectedAggregatorId: (id: string) => void;
}

export function WarehouseStep({
  warehouse,
  setWarehouse,
  isPlatform,
  aggregators,
  selectedAggregatorId,
  setSelectedAggregatorId,
}: WarehouseStepProps) {
  const area = (warehouse.width_m ?? 0) * (warehouse.length_m ?? 0);

  return (
    <div>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#1E293B',
          marginBottom: 20,
        }}
      >
        Datos del Almacen
      </h3>
      <div className="rh-form-grid">
        {/* Platform: Select aggregator */}
        {isPlatform && (
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Agregador propietario *</label>
              <select
                value={selectedAggregatorId}
                onChange={(e) => setSelectedAggregatorId(e.target.value)}
                className="rh-select"
              >
                <option value="">Selecciona un agregador...</option>
                {aggregators.map((agg) => (
                  <option key={agg.id} value={agg.id}>
                    {agg.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="col-span-2">
          <div className="rh-field">
            <label className="rh-label">Nombre del almacen *</label>
            <input
              type="text"
              value={warehouse.name}
              onChange={(e) =>
                setWarehouse((p) => ({ ...p, name: e.target.value }))
              }
              className="rh-input"
              placeholder="Almacen Principal"
            />
          </div>
        </div>

        <div className="rh-field">
          <label className="rh-label">Codigo (auto)</label>
          <input
            type="text"
            value={warehouse.code}
            readOnly
            className="rh-input"
            style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}
          />
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
            Generado automaticamente
          </p>
        </div>

        <div className="rh-field">
          <label className="rh-label">Direccion</label>
          <input
            type="text"
            value={warehouse.address}
            onChange={(e) =>
              setWarehouse((p) => ({ ...p, address: e.target.value }))
            }
            className="rh-input"
            placeholder="Av. Principal, Zona Industrial"
          />
        </div>

        {/* Dimensions */}
        <div className="rh-field">
          <label className="rh-label">Ancho (metros) *</label>
          <input
            type="number"
            min={1}
            max={200}
            value={warehouse.width_m ?? ''}
            onChange={(e) =>
              setWarehouse((p) => ({
                ...p,
                width_m: e.target.value ? parseFloat(e.target.value) : null,
              }))
            }
            className="rh-input"
            placeholder="20"
          />
        </div>

        <div className="rh-field">
          <label className="rh-label">Largo (metros) *</label>
          <input
            type="number"
            min={1}
            max={200}
            value={warehouse.length_m ?? ''}
            onChange={(e) =>
              setWarehouse((p) => ({
                ...p,
                length_m: e.target.value ? parseFloat(e.target.value) : null,
              }))
            }
            className="rh-input"
            placeholder="30"
          />
        </div>

        <div className="rh-field">
          <label className="rh-label">Alto (metros) *</label>
          <input
            type="number"
            min={1}
            max={50}
            value={warehouse.height_m ?? ''}
            onChange={(e) =>
              setWarehouse((p) => ({
                ...p,
                height_m: e.target.value ? parseFloat(e.target.value) : null,
              }))
            }
            className="rh-input"
            placeholder="6"
          />
        </div>

        <div className="rh-field">
          <label className="rh-label">Area total</label>
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#F0FDF4',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              color: '#166534',
              textAlign: 'center',
              border: '1px solid #BBF7D0',
            }}
          >
            {area > 0 ? `${area.toFixed(1)} m²` : '—'}
          </div>
        </div>

        <div className="rh-field">
          <label className="rh-label">Expiracion de picking (min)</label>
          <input
            type="number"
            min={1}
            value={warehouse.pick_expiry_minutes}
            onChange={(e) =>
              setWarehouse((p) => ({
                ...p,
                pick_expiry_minutes: parseInt(e.target.value) || 30,
              }))
            }
            className="rh-input"
            placeholder="30"
          />
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
            Tiempo maximo para completar una lista de picking
          </p>
        </div>
      </div>
    </div>
  );
}
