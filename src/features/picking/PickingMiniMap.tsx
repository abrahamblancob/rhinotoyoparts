import { useState, useEffect, useMemo } from 'react';
import { MapPin, CheckCircle2 } from 'lucide-react';
import * as pickingService from '@/services/pickingService.ts';
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
          <RackMiniGrid
            key={group.rack.id}
            rack={group.rack}
            targetLocations={group.locations}
            pickedSet={pickedSet}
          />
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

function RackMiniGrid({
  rack,
  targetLocations,
  pickedSet,
}: {
  rack: WarehouseRack;
  targetLocations: LocationWithRack[];
  pickedSet: Set<string>;
}) {
  // Build a quick lookup of target location by level+position
  const targetMap = useMemo(() => {
    const map = new Map<string, LocationWithRack>();
    for (const loc of targetLocations) {
      map.set(`${loc.level}-${loc.position}`, loc);
    }
    return map;
  }, [targetLocations]);

  // Build grid: rows = levels (top to bottom), columns = positions
  const grid = useMemo(() => {
    const rows: { level: number; cells: { position: number; location: LocationWithRack | null }[] }[] = [];
    for (let level = rack.levels; level >= 1; level--) {
      const cells: { position: number; location: LocationWithRack | null }[] = [];
      for (let pos = 1; pos <= rack.positions_per_level; pos++) {
        const loc = targetMap.get(`${level}-${pos}`) ?? null;
        cells.push({ position: pos, location: loc });
      }
      rows.push({ level, cells });
    }
    return rows;
  }, [rack.levels, rack.positions_per_level, targetMap]);

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#323130', marginBottom: 8, fontFamily: 'monospace' }}>
        {rack.code} — {rack.name}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {grid.map((row) => (
          <div key={row.level} style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#8A8886', width: 20, textAlign: 'right', marginRight: 4 }}>
              N{row.level}
            </span>
            {row.cells.map((cell) => {
              const isTarget = cell.location !== null;
              const isPicked = cell.location ? pickedSet.has(cell.location.id) : false;

              let bg = '#F3F2F1';
              let border = '#E1DFDD';
              let icon = null;

              if (isTarget && isPicked) {
                bg = '#10B981';
                border = '#059669';
                icon = <CheckCircle2 size={14} color="#fff" />;
              } else if (isTarget) {
                bg = '#F97316';
                border = '#EA580C';
                icon = <MapPin size={14} color="#fff" />;
              }

              return (
                <div
                  key={cell.position}
                  title={cell.location ? `${cell.location.code} — ${isPicked ? 'Recogido' : 'Pendiente'}` : `N${row.level}-P${cell.position}`}
                  style={{
                    width: 36,
                    height: 32,
                    borderRadius: 4,
                    backgroundColor: bg,
                    border: `1px solid ${border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isTarget ? 'default' : 'default',
                    transition: 'background-color 0.2s',
                  }}
                >
                  {icon}
                </div>
              );
            })}
          </div>
        ))}
        {/* Position labels */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 24 }}>
          {Array.from({ length: rack.positions_per_level }, (_, i) => (
            <span key={i} style={{ width: 36, textAlign: 'center', fontSize: 10, color: '#8A8886' }}>
              P{i + 1}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
