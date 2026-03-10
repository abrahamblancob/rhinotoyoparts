import { useState, useEffect, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import * as pickingService from '@/services/pickingService.ts';
import { RackMiniGrid } from '@/features/warehouse/components/RackMiniGrid.tsx';
import type { WarehouseLocation, WarehouseRack } from '@/types/warehouse.ts';

interface PickingMiniMapProps {
  warehouseId: string;
  locationIds: string[];
  pickedLocationIds: string[];
}

type LocationWithRack = WarehouseLocation & { rack: WarehouseRack | null };

export function PickingMiniMap({ warehouseId, locationIds, pickedLocationIds }: PickingMiniMapProps) {
  const [allRacks, setAllRacks] = useState<WarehouseRack[]>([]);
  const [targetLocations, setTargetLocations] = useState<LocationWithRack[]>([]);
  const [loading, setLoading] = useState(true);

  // Load ALL racks for the warehouse + target location details
  useEffect(() => {
    setLoading(true);
    Promise.all([
      pickingService.getWarehouseRacks(warehouseId),
      locationIds.length > 0
        ? pickingService.getPickListLocations(locationIds)
        : Promise.resolve({ data: [], error: null }),
    ]).then(([racksRes, locsRes]) => {
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

  const pickedSet = useMemo(() => new Set(pickedLocationIds), [pickedLocationIds]);

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#8A8886', fontSize: 13 }}>
        Cargando mapa del almacén...
      </div>
    );
  }

  if (allRacks.length === 0) return null;

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

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
                cellSize={{ width: 24, height: 20 }}
              />
            </div>
          );
        })}
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
      </div>
    </div>
  );
}
