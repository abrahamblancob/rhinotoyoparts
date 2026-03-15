import { Plus, Trash2, Grid3X3 } from 'lucide-react';
import { levelToLetter, type WizardRackForm, type WizardAisleForm } from './types.ts';

interface RacksStepProps {
  wizardAisles: WizardAisleForm[];
  racks: WizardRackForm[];
  addAisle: () => void;
  removeAisle: (id: string) => void;
  updateAisle: (id: string, field: keyof WizardAisleForm, value: string | number) => void;
  addRack: (aisleId: string) => void;
  removeRack: (id: string) => void;
  updateRack: (id: string, field: keyof WizardRackForm, value: string | number) => void;
  totalLocations: number;
  rackDisplayCode: (rack: WizardRackForm) => string;
}

export function RacksStep({
  wizardAisles,
  racks,
  addAisle,
  removeAisle,
  updateAisle,
  addRack,
  removeRack,
  updateRack,
  totalLocations,
  rackDisplayCode,
}: RacksStepProps) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: 0 }}>
          Pasillos y Estantes
        </h3>
        <button
          onClick={addAisle}
          className="rh-btn rh-btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} />
          Agregar Pasillo
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>
        Cada pasillo agrupa sus estantes. El codigo de ubicacion se forma como: Pasillo-Estante-Nivel-Posicion (ej: P1-01-A-1).
        Agrega al menos un pasillo con al menos un estante.
      </p>

      {wizardAisles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Grid3X3
            size={48}
            style={{ color: '#CBD5E1', margin: '0 auto 12px' }}
          />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#64748B' }}>
            No has agregado pasillos
          </p>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
            Agrega al menos un pasillo para organizar tus estantes
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {wizardAisles.map((aisle) => {
            const aisleRacks = racks.filter((r) => r.aisleId === aisle.id);
            return (
              <div
                key={aisle.id}
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                {/* Aisle header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'end',
                    gap: 10,
                    padding: '12px 16px',
                    backgroundColor: '#F1F5F9',
                    borderBottom: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', fontFamily: 'monospace', alignSelf: 'center' }}>
                    {aisle.code}
                  </span>
                  <div className="rh-field" style={{ flex: 1 }}>
                    <label className="rh-label" style={{ fontSize: 11 }}>Nombre</label>
                    <input
                      type="text"
                      value={aisle.name}
                      onChange={(e) => updateAisle(aisle.id, 'name', e.target.value)}
                      className="rh-input"
                      style={{ fontSize: 13 }}
                    />
                  </div>
                  <div className="rh-field" style={{ width: 90 }}>
                    <label className="rh-label" style={{ fontSize: 11 }}>Ancho (m)</label>
                    <input
                      type="number"
                      min={0.1}
                      max={5}
                      step={0.1}
                      value={aisle.widthCells}
                      onChange={(e) => updateAisle(aisle.id, 'widthCells', parseFloat(e.target.value) || 0.5)}
                      className="rh-input"
                      style={{ fontSize: 13 }}
                    />
                  </div>
                  <div className="rh-field" style={{ width: 90 }}>
                    <label className="rh-label" style={{ fontSize: 11 }}>Largo (m)</label>
                    <input
                      type="number"
                      min={0.1}
                      max={200}
                      step={0.1}
                      value={aisle.lengthCells}
                      onChange={(e) => updateAisle(aisle.id, 'lengthCells', parseFloat(e.target.value) || 1)}
                      className="rh-input"
                      style={{ fontSize: 13 }}
                    />
                  </div>
                  <button
                    onClick={() => removeAisle(aisle.id)}
                    className="rh-btn rh-btn-ghost"
                    style={{ color: '#EF4444', padding: '8px' }}
                    title="Eliminar pasillo y sus estantes"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Racks inside this aisle */}
                <div style={{ padding: '12px 16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                      Estantes ({aisleRacks.length})
                    </span>
                    <button
                      onClick={() => addRack(aisle.id)}
                      className="rh-btn rh-btn-ghost"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, border: '1px solid #CBD5E1', padding: '4px 10px' }}
                    >
                      <Plus size={14} />
                      Agregar Estante
                    </button>
                  </div>

                  {aisleRacks.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#CBD5E1', fontStyle: 'italic', padding: '8px 0' }}>
                      Sin estantes. Agrega al menos un estante a este pasillo.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {aisleRacks.map((rack) => (
                        <div
                          key={rack.id}
                          style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: 8,
                            padding: '10px 14px',
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 360 }}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '70px 100px 100px 70px 70px auto',
                                gap: 8,
                                alignItems: 'end',
                              }}
                            >
                              <div className="rh-field">
                                <label className="rh-label" style={{ fontSize: 11 }}>Codigo</label>
                                <input
                                  type="text"
                                  value={rackDisplayCode(rack)}
                                  readOnly
                                  className="rh-input"
                                  style={{ fontSize: 13, backgroundColor: '#F1F5F9', fontWeight: 700, fontFamily: 'monospace' }}
                                />
                              </div>
                              <div className="rh-field">
                                <label className="rh-label" style={{ fontSize: 11 }}>Ancho (m)</label>
                                <input
                                  type="number"
                                  min={0.1}
                                  max={20}
                                  step={0.01}
                                  value={rack.rack_width_m}
                                  onChange={(e) => updateRack(rack.id, 'rack_width_m', parseFloat(e.target.value) || 0.1)}
                                  className="rh-input"
                                  style={{ fontSize: 13 }}
                                />
                              </div>
                              <div className="rh-field">
                                <label className="rh-label" style={{ fontSize: 11 }}>Prof. (m)</label>
                                <input
                                  type="number"
                                  min={0.1}
                                  max={10}
                                  step={0.01}
                                  value={rack.rack_depth_m}
                                  onChange={(e) => updateRack(rack.id, 'rack_depth_m', parseFloat(e.target.value) || 0.1)}
                                  className="rh-input"
                                  style={{ fontSize: 13 }}
                                />
                              </div>
                              <div className="rh-field">
                                <label className="rh-label" style={{ fontSize: 11 }}>Niveles</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={rack.levels}
                                  onChange={(e) => updateRack(rack.id, 'levels', parseInt(e.target.value) || 1)}
                                  className="rh-input"
                                  style={{ fontSize: 13 }}
                                />
                              </div>
                              <div className="rh-field">
                                <label className="rh-label" style={{ fontSize: 11 }}>Pos/Niv</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={rack.positions_per_level}
                                  onChange={(e) => updateRack(rack.id, 'positions_per_level', parseInt(e.target.value) || 1)}
                                  className="rh-input"
                                  style={{ fontSize: 13 }}
                                />
                              </div>
                              <button
                                onClick={() => removeRack(rack.id)}
                                className="rh-btn rh-btn-ghost"
                                style={{ color: '#EF4444', padding: '6px' }}
                                title="Eliminar estante"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 11, color: '#94A3B8' }}>
                              {rack.levels * rack.positions_per_level} ubicaciones |
                              Niveles: {Array.from({ length: Math.min(rack.levels, 8) }, (_, i) => levelToLetter(i + 1)).join(', ')}
                              {rack.levels > 8 ? '...' : ''}
                            </div>
                          </div>

                          {/* Mini preview */}
                          <div
                            style={{
                              backgroundColor: '#F8FAFC',
                              borderRadius: 8,
                              padding: 6,
                              minWidth: 100,
                            }}
                          >
                            <p style={{ fontSize: 9, color: '#94A3B8', marginBottom: 3, textAlign: 'center', fontWeight: 600 }}>
                              Vista previa
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {Array.from({ length: Math.min(rack.levels, 6) }, (_, li) => {
                                const level = li + 1;
                                return (
                                  <div key={li} style={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <span style={{ fontSize: 9, color: '#94A3B8', width: 12, textAlign: 'right', fontWeight: 700 }}>
                                      {levelToLetter(level)}
                                    </span>
                                    {Array.from({ length: Math.min(rack.positions_per_level, 8) }, (_, pi) => (
                                      <div
                                        key={pi}
                                        style={{
                                          width: 12,
                                          height: 10,
                                          borderRadius: 2,
                                          backgroundColor: '#E2E8F0',
                                          border: '1px solid #CBD5E1',
                                        }}
                                      />
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                            {(rack.levels > 6 || rack.positions_per_level > 8) && (
                              <p style={{ fontSize: 9, color: '#CBD5E1', textAlign: 'center', marginTop: 2 }}>...truncado</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary stats */}
      {racks.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: '10px 16px',
            backgroundColor: '#F0FDF4',
            borderRadius: 8,
            fontSize: 13,
            color: '#166534',
            display: 'flex',
            gap: 20,
            border: '1px solid #BBF7D0',
          }}
        >
          <span><strong>{wizardAisles.length}</strong> pasillos</span>
          <span><strong>{racks.length}</strong> estantes</span>
          <span><strong>{totalLocations}</strong> ubicaciones totales</span>
        </div>
      )}
    </div>
  );
}
