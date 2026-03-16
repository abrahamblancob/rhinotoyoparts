import { useState, useEffect, useMemo } from 'react';
import { MapPin, LayoutGrid, Layers } from 'lucide-react';
import * as pickingService from '@/services/pickingService.ts';
import { RackMiniGrid } from '@/features/warehouse/components/RackMiniGrid.tsx';
import type { Warehouse, WarehouseZone, WarehouseLocation, WarehouseRack } from '@/types/warehouse.ts';

interface PickingMiniMapProps {
  warehouseId: string;
  locationIds: string[];
  pickedLocationIds: string[];
}

type LocationWithRack = WarehouseLocation & { rack: WarehouseRack | null };

const RACK_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export function PickingMiniMap({ warehouseId, locationIds, pickedLocationIds }: PickingMiniMapProps) {
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [zones, setZones] = useState<WarehouseZone[]>([]);
  const [allRacks, setAllRacks] = useState<WarehouseRack[]>([]);
  const [targetLocations, setTargetLocations] = useState<LocationWithRack[]>([]);
  const [loading, setLoading] = useState(true);

  // Load warehouse details, zones, racks and target locations
  useEffect(() => {
    setLoading(true);
    Promise.all([
      pickingService.getWarehouseDetail(warehouseId),
      pickingService.getWarehouseZones(warehouseId),
      pickingService.getWarehouseRacks(warehouseId),
      locationIds.length > 0
        ? pickingService.getPickListLocations(locationIds)
        : Promise.resolve({ data: [], error: null }),
    ]).then(([whRes, zonesRes, racksRes, locsRes]) => {
      setWarehouse((whRes.data as Warehouse) ?? null);
      setZones((zonesRes.data as WarehouseZone[]) ?? []);
      setAllRacks((racksRes.data as WarehouseRack[]) ?? []);
      setTargetLocations((locsRes.data as LocationWithRack[]) ?? []);
      setLoading(false);
    });
  }, [warehouseId, locationIds]);

  // Group target locations by rack
  const targetsByRack = useMemo(() => {
    const map = new Map<string, LocationWithRack[]>();
    for (const loc of targetLocations) {
      if (!loc.rack) continue;
      const arr = map.get(loc.rack.id) || [];
      arr.push(loc);
      map.set(loc.rack.id, arr);
    }
    return map;
  }, [targetLocations]);

  // Set of rack IDs that have pick targets
  const targetRackIds = useMemo(() => new Set(targetsByRack.keys()), [targetsByRack]);

  const pickedSet = useMemo(() => new Set(pickedLocationIds), [pickedLocationIds]);

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#8A8886', fontSize: 13 }}>
        Cargando mapa del almacén...
      </div>
    );
  }

  if (allRacks.length === 0) return null;

  // Cenital view calculations
  const hasCenital = warehouse && warehouse.width_m && warehouse.length_m;
  const whW = warehouse?.width_m ?? 10;
  const whL = warehouse?.length_m ?? 10;
  const maxViewW = 520;
  const maxViewH = 420;
  const cellW = maxViewW / whW;   /* px per meter */
  const cellH = maxViewH / whL;

  const displayZones = zones.filter(
    (z) => z.position_x != null && z.position_y != null && z.width != null && z.height != null,
  );
  const displayRacks = allRacks.filter(
    (r) => r.position_x != null && r.position_y != null,
  );

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        border: '1px solid #E1DFDD',
        marginBottom: 24,
      }}
    >
      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#323130', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <MapPin size={16} />
        Mapa del Almacén — Ruta de Picking
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: hasCenital ? '1fr 1fr' : '1fr', gap: 20 }}>

        {/* ── LEFT: Cenital (Top-Down) View ── */}
        {hasCenital && (
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: 14,
              backgroundColor: '#FAFBFC',
            }}
          >
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#475569',
                marginBottom: 10,
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
                    width: maxViewW,
                    height: maxViewH,
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #CBD5E1',
                    borderRadius: 6,
                    backgroundImage: `
                      linear-gradient(to right, #E2E8F020 1px, transparent 1px),
                      linear-gradient(to bottom, #E2E8F020 1px, transparent 1px)
                    `,
                    backgroundSize: `${cellW}px ${cellH}px`,
                  }}
                >
                  {/* Zones */}
                  {displayZones.map((zone) => {
                    const zLeft = (zone.position_x ?? 0) * cellW;
                    const zTop = (zone.position_y ?? 0) * cellH;
                    const zW = Math.min((zone.width ?? 0) * cellW, maxViewW - zLeft);
                    const zH = Math.min((zone.height ?? 0) * cellH, maxViewH - zTop);
                    if (zW <= 0 || zH <= 0) return null;
                    const color = zone.color ?? '#6366F1';
                    return (
                      <div
                        key={zone.id}
                        style={{
                          position: 'absolute',
                          left: zLeft,
                          top: zTop,
                          width: zW,
                          height: zH,
                          backgroundColor: color + '15',
                          border: `1px dashed ${color}60`,
                          borderRadius: 3,
                        }}
                      >
                      </div>
                    );
                  })}

                  {/* Racks — highlight targets */}
                  {displayRacks.map((rack, rIdx) => {
                    const isTarget = targetRackIds.has(rack.id);
                    const baseColor = RACK_COLORS[rIdx % RACK_COLORS.length];
                    const rWidthM = rack.orientation === 'horizontal'
                      ? (rack.rack_depth_m ?? 1)
                      : (rack.rack_width_m ?? 1);
                    const rDepthM = rack.orientation === 'horizontal'
                      ? (rack.rack_width_m ?? 1)
                      : (rack.rack_depth_m ?? 1);
                    const rLeft = (rack.position_x ?? 0) * cellW;
                    const rTop = (rack.position_y ?? 0) * cellH;
                    const rW = rWidthM * cellW - 2;
                    const rH = rDepthM * cellH - 2;
                    if (rW <= 0 || rH <= 0) return null;

                    // Target racks get orange highlight, non-target use base color but dimmed
                    const fillColor = isTarget ? '#F9731640' : baseColor + '35';
                    const borderColor = isTarget ? '#F97316' : baseColor;
                    const borderWidth = isTarget ? 2.5 : 1.5;

                    return (
                      <div
                        key={rack.id}
                        style={{
                          position: 'absolute',
                          left: rLeft,
                          top: rTop,
                          width: rW,
                          height: rH,
                          backgroundColor: fillColor,
                          border: `${borderWidth}px solid ${borderColor}`,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          opacity: isTarget ? 1 : 0.45,
                          transition: 'opacity 0.2s',
                        }}
                      >
                        <span
                          style={{
                            fontSize: Math.max(9, Math.min(12, Math.min(cellW, cellH) * 0.6)),
                            fontWeight: 800,
                            color: isTarget ? '#F97316' : baseColor,
                            fontFamily: 'monospace',
                          }}
                        >
                          {rack.code}
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
                    left: maxViewW / 2,
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
                    top: maxViewH / 2,
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
          </div>
        )}

        {/* ── RIGHT: Lateral (Rack Grid) View ── */}
        <div
          style={{
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: 14,
            backgroundColor: '#FAFBFC',
          }}
        >
          <h4
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#475569',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Layers size={14} style={{ color: '#F97316' }} />
            Vista Lateral (Estantes)
          </h4>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {allRacks.map((rack) => {
              const rackTargets = targetsByRack.get(rack.id) ?? [];
              const hasTargets = rackTargets.length > 0;
              return (
                <div
                  key={rack.id}
                  style={{
                    opacity: hasTargets ? 1 : 0.4,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: hasTargets ? '#323130' : '#8A8886',
                    marginBottom: 4,
                    fontFamily: 'monospace',
                    textAlign: 'center',
                  }}>
                    {rack.code}
                  </div>
                  <RackMiniGrid
                    rack={rack}
                    data={{
                      mode: 'picking',
                      targetLocations: rackTargets,
                      pickedSet,
                    }}
                    cellSize={{ width: 22, height: 18 }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 16, fontSize: 12, color: '#605E5C', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#F97316', border: '1px solid #EA580C' }} />
          Pendiente
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#10B981', border: '1px solid #059669' }} />
          Recogido
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#F3F2F1', border: '1px solid #E1DFDD' }} />
          Sin tarea
        </span>
        {hasCenital && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8, borderLeft: '1px solid #E1DFDD', paddingLeft: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#F9731640', border: '2px solid #F97316' }} />
            Estante con tarea (cenital)
          </span>
        )}
      </div>
    </div>
  );
}
