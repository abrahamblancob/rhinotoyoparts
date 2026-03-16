import { useState, useEffect, useMemo } from 'react';
import { MapPin, LayoutGrid, Layers } from 'lucide-react';
import * as pickingService from '@/services/pickingService.ts';
import { RackMiniGrid } from '@/features/warehouse/components/RackMiniGrid.tsx';
import { WarehouseCenitalMini } from '@/features/warehouse/components/WarehouseCenitalMini.tsx';
import { CELL_SIZE_M } from '@/features/warehouse/FloorPlanBuilder.tsx';
import type { Warehouse, WarehouseZone, WarehouseLocation, WarehouseRack, WarehouseAisle } from '@/types/warehouse.ts';

interface PickingMiniMapProps {
  warehouseId: string;
  locationIds: string[];
  pickedLocationIds: string[];
}

type LocationWithRack = WarehouseLocation & { rack: WarehouseRack | null };

export function PickingMiniMap({ warehouseId, locationIds, pickedLocationIds }: PickingMiniMapProps) {
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [zones, setZones] = useState<WarehouseZone[]>([]);
  const [allRacks, setAllRacks] = useState<WarehouseRack[]>([]);
  const [allAisles, setAllAisles] = useState<WarehouseAisle[]>([]);
  const [targetLocations, setTargetLocations] = useState<LocationWithRack[]>([]);
  const [loading, setLoading] = useState(true);

  // Load warehouse details, zones, racks, aisles and target locations
  useEffect(() => {
    setLoading(true);
    Promise.all([
      pickingService.getWarehouseDetail(warehouseId),
      pickingService.getWarehouseZones(warehouseId),
      pickingService.getWarehouseRacks(warehouseId),
      pickingService.getWarehouseAisles(warehouseId),
      locationIds.length > 0
        ? pickingService.getPickListLocations(locationIds)
        : Promise.resolve({ data: [], error: null }),
    ]).then(([whRes, zonesRes, racksRes, aislesRes, locsRes]) => {
      setWarehouse((whRes.data as Warehouse) ?? null);
      setZones((zonesRes.data as WarehouseZone[]) ?? []);
      setAllRacks((racksRes.data as WarehouseRack[]) ?? []);
      setAllAisles((aislesRes.data as WarehouseAisle[]) ?? []);
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

  // Build placed aisles from DB aisle positions
  const dbPlacedAisles = allAisles
    .filter((a) => a.position_x != null && a.position_y != null)
    .map((a) => ({
      aisleId: a.id,
      gridX: Math.round((a.position_x ?? 0) / CELL_SIZE_M),
      gridY: Math.round((a.position_y ?? 0) / CELL_SIZE_M),
      lengthCells: Math.max(1, Math.ceil((a.length_cells ?? 10) / CELL_SIZE_M)),
      widthCells: Math.max(1, Math.ceil((a.width_m ?? 0.5) / CELL_SIZE_M)),
      orientation: (a.orientation as 'vertical' | 'horizontal') ?? 'vertical',
    }));

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
              <WarehouseCenitalMini
                warehouseWidth={whW}
                warehouseLength={whL}
                aisles={allAisles.map((a) => ({
                  id: a.id,
                  code: a.code,
                  width_m: a.width_m ?? undefined,
                  orientation: a.orientation ?? undefined,
                }))}
                racks={allRacks.map((r) => ({
                  id: r.id,
                  code: r.code,
                  rack_width_m: r.rack_width_m ?? 1,
                  rack_depth_m: r.rack_depth_m ?? 1,
                  aisle_id: r.aisle_id,
                }))}
                placedAisles={dbPlacedAisles}
                zones={zones
                  .filter((z) => z.position_x != null && z.position_y != null)
                  .map((z) => ({
                    id: z.id,
                    name: z.name,
                    code: z.code,
                    color: z.color ?? '#6366F1',
                    position_x: z.position_x,
                    position_y: z.position_y,
                    width: z.width,
                    height: z.height,
                  }))}
                viewWidth={520}
                viewHeight={420}
                showZoneLabels={false}
                highlightRackIds={targetRackIds}
                highlightColor="#F97316"
                dimNonHighlighted={true}
              />
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
            minWidth: 0,
            overflow: 'hidden',
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
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', overflowX: 'auto', paddingBottom: 8 }}>
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
