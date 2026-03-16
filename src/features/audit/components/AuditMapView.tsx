import { useState, useEffect, useMemo } from 'react';
import { MapPin, LayoutGrid, Layers } from 'lucide-react';
import { WarehouseCenitalMini } from '@/features/warehouse/components/WarehouseCenitalMini.tsx';
import { RackMiniGrid } from '@/features/warehouse/components/RackMiniGrid.tsx';
import { CELL_SIZE_M } from '@/features/warehouse/FloorPlanBuilder.tsx';
import * as warehouseService from '@/services/warehouseService.ts';
import type {
  Warehouse,
  WarehouseZone,
  WarehouseRack,
  WarehouseAisle,
  WarehouseLocation,
  InventoryStock,
} from '@/types/warehouse.ts';

interface AuditMapViewProps {
  warehouseId: string;
  /** IDs currently selected for audit */
  selectedLocationIds: Set<string>;
  /** IDs currently animating (jackpot) */
  animatingLocationIds: Set<string>;
  /** IDs already audited */
  auditedLocationIds: Set<string>;
  /** Manual mode: user clicks to select */
  onLocationClick?: (locationId: string, rackId: string) => void;
  /** Manual mode: user clicks rack in cenital */
  onRackClick?: (rackId: string) => void;
  /** Which rack to focus in lateral view */
  focusedRackId?: string | null;
}

export function AuditMapView({
  warehouseId,
  selectedLocationIds,
  animatingLocationIds,
  auditedLocationIds,
  onLocationClick,
  onRackClick,
  focusedRackId,
}: AuditMapViewProps) {
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [zones, setZones] = useState<WarehouseZone[]>([]);
  const [allRacks, setAllRacks] = useState<WarehouseRack[]>([]);
  const [allAisles, setAllAisles] = useState<WarehouseAisle[]>([]);
  const [allLocations, setAllLocations] = useState<WarehouseLocation[]>([]);
  const [stockLocationIds, setStockLocationIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      warehouseService.getWarehouse(warehouseId),
      warehouseService.getZones(warehouseId),
      warehouseService.getRacks(warehouseId),
      warehouseService.getAisles(warehouseId),
      warehouseService.getLocations(warehouseId),
      warehouseService.getStockByWarehouse(warehouseId),
    ]).then(([whRes, zonesRes, racksRes, aislesRes, locsRes, stockRes]) => {
      setWarehouse((whRes.data as Warehouse) ?? null);
      setZones((zonesRes.data as WarehouseZone[]) ?? []);
      setAllRacks((racksRes.data as WarehouseRack[]) ?? []);
      setAllAisles((aislesRes.data as WarehouseAisle[]) ?? []);
      setAllLocations((locsRes.data as WarehouseLocation[]) ?? []);
      // Build set of location IDs that have stock (quantity > 0)
      const stockLocs = new Set<string>();
      for (const s of ((stockRes.data as InventoryStock[]) ?? [])) {
        if (s.location_id && s.quantity > 0) stockLocs.add(s.location_id);
      }
      setStockLocationIds(stockLocs);
      setLoading(false);
    });
  }, [warehouseId]);

  // Group locations by rack
  const locationsByRack = useMemo(() => {
    const map = new Map<string, WarehouseLocation[]>();
    for (const loc of allLocations) {
      const arr = map.get(loc.rack_id) || [];
      arr.push(loc);
      map.set(loc.rack_id, arr);
    }
    return map;
  }, [allLocations]);

  // Racks with selected/animating locations or stock
  const highlightRackIds = useMemo(() => {
    const set = new Set<string>();
    for (const loc of allLocations) {
      if (selectedLocationIds.has(loc.id) || animatingLocationIds.has(loc.id) || auditedLocationIds.has(loc.id) || stockLocationIds.has(loc.id)) {
        set.add(loc.rack_id);
      }
    }
    if (focusedRackId) set.add(focusedRackId);
    return set;
  }, [allLocations, selectedLocationIds, animatingLocationIds, auditedLocationIds, stockLocationIds, focusedRackId]);

  // Determine which racks to show in lateral view
  const lateralRacks = useMemo(() => {
    if (focusedRackId) {
      const rack = allRacks.find((r) => r.id === focusedRackId);
      return rack ? [rack] : allRacks;
    }
    // Always show all racks so user can see which ones have stock
    return allRacks;
  }, [allRacks, focusedRackId]);

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#8A8886', fontSize: 13 }}>
        Cargando mapa del almacén...
      </div>
    );
  }

  if (allRacks.length === 0) return null;

  const hasCenital = warehouse && warehouse.width_m && warehouse.length_m;
  const whW = warehouse?.width_m ?? 10;
  const whL = warehouse?.length_m ?? 10;

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
        Mapa del Almacén — Auditoría de Stock
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: hasCenital ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Cenital view */}
        {hasCenital && (
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 14, backgroundColor: '#FAFBFC' }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <LayoutGrid size={14} style={{ color: '#6366F1' }} />
              Vista Cenital (Planta)
              <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400, marginLeft: 'auto' }}>
                {whW}m x {whL}m
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
                highlightRackIds={highlightRackIds}
                highlightColor="#F97316"
                dimNonHighlighted={highlightRackIds.size > 0}
                onRackClick={onRackClick}
              />
            </div>
            {onRackClick && (
              <p style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', marginTop: 8 }}>
                Haz clic en un estante para seleccionar ubicaciones
              </p>
            )}
          </div>
        )}

        {/* Lateral view */}
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
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={14} style={{ color: '#F97316' }} />
            Vista Lateral (Estantes)
            {focusedRackId && (
              <span style={{ fontSize: 10, color: '#F97316', fontWeight: 400, marginLeft: 'auto' }}>
                Estante enfocado
              </span>
            )}
          </h4>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', overflowX: 'auto', paddingBottom: 8 }}>
            {lateralRacks.map((rack) => {
              const hasActivity = highlightRackIds.has(rack.id);
              return (
                <div
                  key={rack.id}
                  style={{ opacity: hasActivity ? 1 : 0.4, transition: 'opacity 0.2s' }}
                >
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: hasActivity ? '#323130' : '#8A8886',
                    marginBottom: 4,
                    fontFamily: 'monospace',
                    textAlign: 'center',
                  }}>
                    {rack.code}
                  </div>
                  <RackMiniGrid
                    rack={rack}
                    allLocations={locationsByRack.get(rack.id) ?? []}
                    data={{
                      mode: 'audit',
                      selectedLocationIds,
                      animatingLocationIds,
                      auditedLocationIds,
                      stockLocationIds,
                      onLocationClick,
                    }}
                    cellSize={{ width: 26, height: 22 }}
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
          <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#DBEAFE', border: '1px solid #3B82F6' }} />
          Con producto
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#F3F2F1', border: '1px solid #E1DFDD' }} />
          Vacío
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8, borderLeft: '1px solid #E1DFDD', paddingLeft: 12 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#F97316', border: '1px solid #EA580C' }} />
          Seleccionado
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#FBBF24', border: '1px solid #F59E0B' }} />
          Animando
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#10B981', border: '1px solid #059669' }} />
          Auditado
        </span>
      </div>

      {/* Jackpot animation keyframes */}
      <style>{`
        @keyframes auditPulse {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/** Returns all location IDs for a warehouse (for jackpot animation pool) */
export async function fetchAllLocationIds(warehouseId: string): Promise<string[]> {
  const res = await warehouseService.getLocations(warehouseId);
  return ((res.data as WarehouseLocation[]) ?? []).map((l) => l.id);
}
