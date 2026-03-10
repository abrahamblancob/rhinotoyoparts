import { useState, useEffect, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import * as pickingService from '@/services/pickingService.ts';
import { RackMiniGrid } from '@/features/warehouse/components/RackMiniGrid.tsx';
import type { WarehouseLocation, WarehouseRack } from '@/types/warehouse.ts';

interface PickingMiniMapProps {
  locationIds: string[];
  pickedLocationIds: string[];
}

type LocationWithRack = WarehouseLocation & { rack: WarehouseRack | null };

interface RackGroup {
  rack: WarehouseRack;
  locations: LocationWithRack[];
}

export function PickingMiniMap({ locationIds, pickedLocationIds }: PickingMiniMapProps) {
  const [locations, setLocations] = useState<LocationWithRack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (locationIds.length === 0) {
      setLocations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    pickingService.getPickListLocations(locationIds).then(({ data }) => {
      setLocations((data as LocationWithRack[]) ?? []);
      setLoading(false);
    });
  }, [locationIds]);

  // Group locations by rack
  const rackGroups = useMemo(() => {
    const map = new Map<string, RackGroup>();
    for (const loc of locations) {
      if (!loc.rack) continue;
      const existing = map.get(loc.rack.id);
      if (existing) {
        existing.locations.push(loc);
      } else {
        map.set(loc.rack.id, { rack: loc.rack, locations: [loc] });
      }
    }
    return Array.from(map.values());
  }, [locations]);

  const pickedSet = useMemo(() => new Set(pickedLocationIds), [pickedLocationIds]);

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#8A8886', fontSize: 13 }}>
        Cargando mapa...
      </div>
    );
  }

  if (rackGroups.length === 0) {
    return null;
  }

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
        Mapa de Ubicaciones
      </h3>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {rackGroups.map((group) => (
          <div key={group.rack.id}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#323130', marginBottom: 8, fontFamily: 'monospace' }}>
              {group.rack.code} — {group.rack.name}
            </div>
            <RackMiniGrid
              rack={group.rack}
              data={{
                mode: 'picking',
                targetLocations: group.locations,
                pickedSet,
              }}
              cellSize={{ width: 36, height: 32 }}
              showLabels
            />
          </div>
        ))}
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

