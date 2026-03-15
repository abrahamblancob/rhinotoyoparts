import {
  Warehouse,
  Grid3X3,
  MapPin,
  LayoutGrid,
  Package,
  BarChart3,
  Layers,
} from 'lucide-react';
import { CELL_SIZE_M } from '../FloorPlanBuilder.tsx';
import {
  RACK_COLORS,
  levelToLetter,
  type WarehouseForm,
  type WizardRackForm,
  type WizardAisleForm,
  type PlacedRack,
  type PlacedAisle,
  type WizardZoneForm,
} from './types.ts';
import type { ZoneType } from '@/types/warehouse.ts';

interface ConfirmStepProps {
  warehouse: WarehouseForm;
  racks: WizardRackForm[];
  wizardAisles: WizardAisleForm[];
  placedRacks: PlacedRack[];
  placedAisles: PlacedAisle[];
  zones: WizardZoneForm[];
  rackDisplayCode: (rack: WizardRackForm) => string;
  area: number;
  totalLocations: number;
  rackFootprint: number;
  occupancyPct: number;
}

export function ConfirmStep({
  warehouse,
  racks,
  wizardAisles,
  placedRacks,
  placedAisles,
  zones,
  rackDisplayCode,
  area,
  totalLocations,
  rackFootprint,
  occupancyPct,
}: ConfirmStepProps) {
  const whW = warehouse.width_m || 10;
  const whL = warehouse.length_m || 10;
  const maxViewW = 460;
  const maxViewH = 320;
  const gridW = Math.ceil(whW / CELL_SIZE_M);
  const gridH = Math.ceil(whL / CELL_SIZE_M);
  const cellW = maxViewW / gridW;
  const cellH = maxViewH / gridH;
  const viewW = maxViewW;
  const viewH = maxViewH;
  const effectiveZones = zones.length > 0 ? zones : [{
    id: 'default',
    name: 'Almacenamiento',
    code: 'Z-01',
    zone_type: 'storage' as ZoneType,
    color: '#3B82F6',
    x: 0,
    y: 0,
    width: whW,
    height: whL,
  }];

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
        Resumen de Configuracion
      </h3>

      {/* Stats cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          { icon: Warehouse, value: '1', label: 'Almacen', bg: '#EEF2FF', color: '#6366F1' },
          { icon: Layers, value: String(wizardAisles.length), label: 'Pasillos', bg: '#F1F5F9', color: '#64748B' },
          { icon: Grid3X3, value: String(racks.length), label: 'Estantes', bg: '#FEF3C7', color: '#F59E0B' },
          { icon: MapPin, value: String(zones.length || 1), label: 'Zonas', bg: '#ECFDF5', color: '#10B981' },
          { icon: Package, value: String(totalLocations), label: 'Ubicaciones', bg: '#FEE2E2', color: '#D3010A' },
          { icon: BarChart3, value: `${occupancyPct}%`, label: 'Ocupacion Area', bg: '#F0F9FF', color: '#0EA5E9' },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              textAlign: 'center',
              padding: 16,
              backgroundColor: card.bg,
              borderRadius: 10,
            }}
          >
            <card.icon
              size={24}
              style={{ color: card.color, margin: '0 auto 6px' }}
            />
            <p style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', margin: 0 }}>
              {card.value}
            </p>
            <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Visual views: Cenital + Lateral */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Top-down / Cenital view */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: 16,
            backgroundColor: '#FAFBFC',
          }}
        >
          <h4
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#475569',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <LayoutGrid size={14} style={{ color: '#6366F1' }} />
            Vista Cenital (Planta)
            <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400, marginLeft: 'auto' }}>
              {whW}m × {whL}m
            </span>
          </h4>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', paddingBottom: 22, paddingRight: 48 }}>
              <div
                style={{
                  width: viewW,
                  height: viewH,
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #CBD5E1',
                  borderRadius: 6,
                  backgroundImage: `
                    linear-gradient(to right, #E2E8F020 1px, transparent 1px),
                    linear-gradient(to bottom, #E2E8F020 1px, transparent 1px)
                  `,
                  backgroundSize: `${cellW / CELL_SIZE_M}px ${cellH / CELL_SIZE_M}px`,
                }}
              >
                {/* Zones */}
                {effectiveZones.map((zone) => {
                  const zLeft = (zone.x / CELL_SIZE_M) * cellW;
                  const zTop = (zone.y / CELL_SIZE_M) * cellH;
                  const zW = Math.min((zone.width / CELL_SIZE_M) * cellW, viewW - zLeft);
                  const zH = Math.min((zone.height / CELL_SIZE_M) * cellH, viewH - zTop);
                  if (zW <= 0 || zH <= 0) return null;
                  return (
                    <div
                      key={zone.id}
                      style={{
                        position: 'absolute',
                        left: zLeft,
                        top: zTop,
                        width: zW,
                        height: zH,
                        backgroundColor: zone.color + '15',
                        border: `1px dashed ${zone.color}60`,
                        borderRadius: 3,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: 3,
                          fontSize: 9,
                          color: zone.color,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                        }}
                      >
                        {zone.name}
                      </span>
                    </div>
                  );
                })}

                {/* Aisles */}
                {placedAisles.map((pa) => {
                  const aisle = wizardAisles.find((a) => a.id === pa.aisleId);
                  if (!aisle) return null;
                  const aw = pa.orientation === 'horizontal' ? pa.lengthCells : pa.widthCells;
                  const ah = pa.orientation === 'horizontal' ? pa.widthCells : pa.lengthCells;
                  return (
                    <div
                      key={pa.aisleId}
                      style={{
                        position: 'absolute',
                        left: pa.gridX * cellW,
                        top: pa.gridY * cellH,
                        width: aw * cellW - 1,
                        height: ah * cellH - 1,
                        backgroundColor: '#94A3B825',
                        border: '1px dashed #94A3B8',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: 8, fontWeight: 700, color: '#94A3B8', fontFamily: 'monospace',
                        writingMode: pa.orientation === 'vertical' ? 'vertical-rl' : 'horizontal-tb' }}>
                        {aisle.code}
                      </span>
                    </div>
                  );
                })}

                {/* Racks */}
                {placedRacks.map((p) => {
                  const rack = racks.find((r) => r.id === p.rackId);
                  if (!rack) return null;
                  const rIdx = racks.indexOf(rack);
                  const color = RACK_COLORS[rIdx % RACK_COLORS.length];
                  const rLeft = p.gridX * cellW;
                  const rTop = p.gridY * cellH;
                  const rW = p.widthCells * cellW - 2;
                  const rH = p.depthCells * cellH - 2;
                  if (rW <= 0 || rH <= 0) return null;
                  return (
                    <div
                      key={p.rackId}
                      style={{
                        position: 'absolute',
                        left: rLeft,
                        top: rTop,
                        width: rW,
                        height: rH,
                        backgroundColor: color + '35',
                        border: `1.5px solid ${color}`,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <span
                        style={{
                          fontSize: Math.max(9, Math.min(12, Math.min(cellW, cellH) * 0.6)),
                          fontWeight: 800,
                          color,
                          fontFamily: 'monospace',
                        }}
                      >
                        {rackDisplayCode(rack)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Dimension labels */}
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  left: viewW / 2,
                  transform: 'translateX(-50%)',
                  fontSize: 10,
                  color: '#94A3B8',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                }}
              >
                {whW}m (ancho)
              </span>
              <span
                style={{
                  position: 'absolute',
                  right: 0,
                  top: viewH / 2,
                  transform: 'translateY(-50%) rotate(90deg)',
                  fontSize: 10,
                  color: '#94A3B8',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                }}
              >
                {whL}m (largo)
              </span>
            </div>
          </div>
          <p style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', marginTop: 20 }}>
            Huella de estantes: {rackFootprint.toFixed(1)} m² de {area.toFixed(1)} m² ({occupancyPct}%)
          </p>
        </div>

        {/* Side / Lateral view */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: 16,
            backgroundColor: '#FAFBFC',
          }}
        >
          <h4
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#475569',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Layers size={14} style={{ color: '#8B5CF6' }} />
            Vista Lateral (Estantes)
            <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400, marginLeft: 'auto' }}>
              {racks.length} estantes
            </span>
          </h4>
          <div
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 8,
            }}
          >
            {racks.map((rack, rIdx) => {
              const color = RACK_COLORS[rIdx % RACK_COLORS.length];
              const maxLevels = Math.min(rack.levels, 10);
              const maxPos = Math.min(rack.positions_per_level, 6);
              const rCellW = 18;
              const rCellH = 16;
              return (
                <div
                  key={rack.id}
                  style={{
                    flexShrink: 0,
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color,
                      marginBottom: 4,
                      fontFamily: 'monospace',
                    }}
                  >
                    {rackDisplayCode(rack)}
                  </p>
                  <div
                    style={{
                      border: `2px solid ${color}`,
                      borderRadius: 4,
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {Array.from({ length: maxLevels }, (_, li) => {
                      const level = li + 1;
                      return (
                        <div
                          key={li}
                          style={{
                            display: 'flex',
                            borderBottom: li < maxLevels - 1 ? `1px solid ${color}30` : undefined,
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              fontSize: 8,
                              fontWeight: 700,
                              color: '#94A3B8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#F8FAFC',
                              borderRight: `1px solid ${color}20`,
                              flexShrink: 0,
                            }}
                          >
                            {levelToLetter(level)}
                          </span>
                          {Array.from({ length: maxPos }, (_, pi) => (
                            <div
                              key={pi}
                              style={{
                                width: rCellW,
                                height: rCellH,
                                backgroundColor: color + '10',
                                borderRight: pi < maxPos - 1 ? `1px solid ${color}15` : undefined,
                              }}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  {(rack.levels > 10 || rack.positions_per_level > 6) && (
                    <p style={{ fontSize: 8, color: '#CBD5E1', marginTop: 1 }}>
                      ...
                    </p>
                  )}
                  <p style={{ fontSize: 8, color: '#94A3B8', marginTop: 2 }}>
                    {rack.rack_width_m}×{rack.rack_depth_m}m
                  </p>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', marginTop: 4 }}>
            Niveles A-Z de arriba a abajo | {totalLocations} ubicaciones totales
          </p>
        </div>
      </div>

      {/* Warehouse details */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
          Almacen
        </h4>
        <div
          style={{
            padding: 12,
            backgroundColor: '#F8FAFC',
            borderRadius: 8,
            fontSize: 13,
            color: '#1E293B',
            lineHeight: 1.8,
          }}
        >
          <strong>{warehouse.name}</strong> ({warehouse.code})
          <br />
          Dimensiones: {warehouse.width_m}m × {warehouse.length_m}m ×{' '}
          {warehouse.height_m}m | Area: {area.toFixed(1)} m²
          <br />
          {warehouse.address && (
            <>
              Direccion: {warehouse.address}
              <br />
            </>
          )}
          Expiracion picking: {warehouse.pick_expiry_minutes} minutos
        </div>
      </div>

      {/* Racks summary */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
          Estantes ({racks.length})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {racks.map((r, rIdx) => {
            const pl = placedRacks.find((p) => p.rackId === r.id);
            const color = RACK_COLORS[rIdx % RACK_COLORS.length];
            return (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 6,
                  fontSize: 13,
                  borderLeft: `4px solid ${color}`,
                }}
              >
                <span style={{ fontWeight: 600, color: '#1E293B', fontFamily: 'monospace' }}>
                  [{rackDisplayCode(r)}] {r.name}
                </span>
                <span style={{ color: '#64748B' }}>
                  {r.rack_width_m}m × {r.rack_depth_m}m |{' '}
                  {r.levels} niveles × {r.positions_per_level}{' '}
                  pos = {r.levels * r.positions_per_level} ubic
                  {pl && (
                    <span style={{ color: '#10B981', marginLeft: 8 }}>
                      ✓ Pos ({pl.gridX},{pl.gridY})
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aisles summary */}
      {wizardAisles.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            Pasillos ({wizardAisles.length})
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {wizardAisles.map((a) => {
              const pa = placedAisles.find((p) => p.aisleId === a.id);
              return (
                <span
                  key={a.id}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                  }}
                >
                  {a.code} — {a.name} ({a.widthCells}m x {a.lengthCells}m)
                  {pa && <span style={{ color: '#10B981', marginLeft: 6 }}>✓</span>}
                </span>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
            Formato de ubicacion: {wizardAisles[0]?.code}-01-A-1 (Pasillo-Estante-Nivel-Posicion)
          </p>
        </div>
      )}

      {/* Zones summary */}
      <div>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
          Zonas ({zones.length || 1})
        </h4>
        {zones.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: '#94A3B8',
              padding: '8px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: 6,
            }}
          >
            Se creara una zona "Almacenamiento" por defecto cubriendo todo el almacen
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {zones.map((z) => (
              <span
                key={z.id}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: z.color + '20',
                  color: z.color,
                  border: `1px solid ${z.color}40`,
                }}
              >
                {z.name} ({z.code}) — {z.width}m × {z.height}m
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
