import { useCallback } from 'react';
import { Warehouse as WarehouseIcon, MapPin, Package, ClipboardCheck } from 'lucide-react';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import * as warehouseService from '@/services/warehouseService.ts';
import type { Warehouse } from '@/types/warehouse.ts';

interface WarehouseSelectorProps {
  orgId: string | undefined;
  isPlatform: boolean;
  onSelect: (warehouse: Warehouse) => void;
}

export function WarehouseSelector({ orgId, isPlatform, onSelect }: WarehouseSelectorProps) {
  const fetcher = useCallback(
    () => warehouseService.getWarehouses({ orgId, isPlatform }),
    [orgId, isPlatform],
  );

  const { data: warehouses, loading } = useAsyncData<Warehouse[]>(fetcher, [orgId]);

  if (loading) {
    return <p className="rh-loading">Cargando almacenes...</p>;
  }

  const items = warehouses ?? [];

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
        <WarehouseIcon size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
        <p style={{ fontSize: 14, fontWeight: 600 }}>No hay almacenes disponibles</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <WarehouseIcon size={18} />
        Selecciona un Almacen
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {items.map((wh) => (
          <div
            key={wh.id}
            onClick={() => onSelect(wh)}
            className="rh-card"
            style={{
              padding: '20px 24px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: '1px solid #E2E0DE',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#D3010A';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(211,1,10,0.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E2E0DE';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', margin: 0 }}>{wh.name}</h4>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748B' }}>{wh.code}</span>
              </div>
              <span style={{ fontSize: 20, opacity: 0.3 }}>→</span>
            </div>

            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748B' }}>
              {wh.width_m && wh.length_m && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} />
                  {wh.width_m}m x {wh.length_m}m
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Package size={12} />
                Almacen
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ClipboardCheck size={12} />
                Auditar
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
