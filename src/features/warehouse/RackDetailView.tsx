import { useState, useCallback, useMemo } from 'react';
import { ArrowLeft, Grid3X3, Package } from 'lucide-react';
import { useWarehouseLocations } from '@/hooks/useWarehouse.ts';
import * as warehouseService from '@/services/warehouseService.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { LocationCell } from './components/LocationCell.tsx';
import { LocationDetailModal } from './LocationDetailModal.tsx';
import type { WarehouseRack, WarehouseLocation, InventoryStock } from '@/types/warehouse.ts';

interface RackDetailViewProps {
  rack: WarehouseRack;
  warehouseId: string;
  orgId: string;
  onBack: () => void;
  onStockChanged?: () => void;
}

export function RackDetailView({ rack, warehouseId, orgId, onBack, onStockChanged }: RackDetailViewProps) {
  const { data: locations, loading: locationsLoading, reload: reloadLocations } = useWarehouseLocations(warehouseId, rack.id);

  const stockFetcher = useCallback(
    () => warehouseService.getStockByWarehouse(warehouseId),
    [warehouseId],
  );
  const { data: allStock, reload: reloadStock } = useAsyncData<InventoryStock[]>(stockFetcher, [warehouseId]);

  const [selectedLocation, setSelectedLocation] = useState<WarehouseLocation | null>(null);

  // Build a map of location_id -> stock (skip unassigned stock)
  const stockByLocation = useMemo(() => {
    const map = new Map<string, InventoryStock>();
    if (allStock) {
      for (const s of allStock) {
        if (s.location_id) map.set(s.location_id, s);
      }
    }
    return map;
  }, [allStock]);

  // Build grid: rows = levels (top to bottom A→H), columns = positions
  const grid = useMemo(() => {
    if (!locations) return [];
    const rows: (WarehouseLocation | null)[][] = [];
    // Levels go from 1 (A, top) to rack.levels (bottom)
    for (let level = 1; level <= rack.levels; level++) {
      const row: (WarehouseLocation | null)[] = [];
      for (let pos = 1; pos <= rack.positions_per_level; pos++) {
        const loc = locations.find((l) => l.level === level && l.position === pos) ?? null;
        row.push(loc);
      }
      rows.push(row);
    }
    return rows;
  }, [locations, rack.levels, rack.positions_per_level]);

  const occupiedCount = locations?.filter((l) => l.is_occupied).length ?? 0;
  const totalCount = locations?.length ?? 0;

  const handleCloseModal = () => {
    setSelectedLocation(null);
    reloadLocations();
    reloadStock();
    onStockChanged?.();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={onBack}
          className="rh-btn rh-btn-ghost"
          style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', margin: 0 }}>
            <Grid3X3 size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            {rack.name}
          </h2>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: '2px 0 0' }}>
            Codigo: {rack.code} | {rack.levels} niveles x {rack.positions_per_level} posiciones
          </p>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', margin: 0 }}>{totalCount}</p>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Ubicaciones</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#10B981', margin: 0 }}>{totalCount - occupiedCount}</p>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Libres</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#F59E0B', margin: 0 }}>{occupiedCount}</p>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Ocupadas</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 16,
          padding: '8px 16px',
          backgroundColor: '#F8FAFC',
          borderRadius: 8,
          fontSize: 12,
          color: '#64748B',
          alignItems: 'center',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#D1FAE5', border: '2px solid #6EE7B7', display: 'inline-block' }} />
          Vacio
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#FEF3C7', border: '2px solid #FCD34D', display: 'inline-block' }} />
          Con stock
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#FEE2E2', border: '2px solid #FCA5A5', display: 'inline-block' }} />
          Lleno/Reservado
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#E2E8F0', border: '2px solid #CBD5E1', display: 'inline-block' }} />
          Inactiva
        </span>
      </div>

      {/* Grid */}
      {locationsLoading ? (
        <p className="rh-loading">Cargando ubicaciones...</p>
      ) : grid.length === 0 ? (
        <div className="rh-card" style={{ padding: 40, textAlign: 'center' }}>
          <Package size={48} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#64748B' }}>
            No hay ubicaciones generadas para este estante
          </p>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
            Las ubicaciones se generan automaticamente al crear el estante.
          </p>
        </div>
      ) : (
        <div className="rh-card" style={{ padding: 20, overflow: 'auto' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {/* Level labels column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginRight: 4 }}>
              {grid.map((_, rowIdx) => {
                const level = rowIdx + 1;
                return (
                  <div
                    key={`label-${level}`}
                    style={{
                      minWidth: 36,
                      minHeight: 52,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#94A3B8',
                    }}
                  >
                    {String.fromCharCode(64 + level)}
                  </div>
                );
              })}
            </div>

            {/* Grid columns */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              {/* Position headers */}
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: rack.positions_per_level }, (_, i) => (
                  <div
                    key={`pos-${i + 1}`}
                    style={{
                      flex: 1,
                      minWidth: 72,
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#94A3B8',
                      paddingBottom: 4,
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              {grid.map((row, rowIdx) => (
                <div key={`row-${rowIdx}`} style={{ display: 'flex', gap: 4 }}>
                  {row.map((location, colIdx) =>
                    location ? (
                      <div key={location.id} style={{ flex: 1, minWidth: 72 }}>
                        <LocationCell
                          location={location}
                          stock={stockByLocation.get(location.id) ?? null}
                          onClick={setSelectedLocation}
                        />
                      </div>
                    ) : (
                      <div
                        key={`empty-${rowIdx}-${colIdx}`}
                        style={{
                          flex: 1,
                          minWidth: 72,
                          minHeight: 52,
                          borderRadius: 8,
                          border: '2px dashed #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          color: '#CBD5E1',
                        }}
                      >
                        --
                      </div>
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Location Detail Modal */}
      {selectedLocation && (
        <LocationDetailModal
          open={!!selectedLocation}
          location={selectedLocation}
          warehouseId={warehouseId}
          orgId={orgId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
