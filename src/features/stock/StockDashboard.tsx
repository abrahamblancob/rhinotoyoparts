import { useState, useCallback, useEffect } from 'react';
import {
  Search,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { useWarehouses } from '@/hooks/useWarehouse.ts';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import * as warehouseService from '@/services/warehouseService.ts';
import { supabase } from '@/lib/supabase.ts';
import type { InventoryStock } from '@/types/warehouse.ts';

// Arbitrary threshold for demo — in production this would come from the product's min_stock field
const LOW_STOCK_THRESHOLD = 5;

export function StockDashboard() {
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  usePermissions();
  const organization = useAuthStore((s) => s.organization);
  const { data: warehouses } = useWarehouses();

  const fetcher = useCallback(
    () => {
      if (!organization?.id) return Promise.resolve({ data: [] as InventoryStock[], error: null });
      if (warehouseFilter !== 'all') {
        return warehouseService.getStockByWarehouse(warehouseFilter);
      }
      return warehouseService.getStockByOrg(organization.id);
    },
    [organization?.id, warehouseFilter],
  );

  const { data: stockItems, loading, reload } = useAsyncData<InventoryStock[]>(fetcher, [
    organization?.id,
    warehouseFilter,
  ]);

  // Realtime subscription for stock changes
  useEffect(() => {
    if (!organization?.id) return;
    // Subscribe to all stock changes for the org's warehouses
    const whIds = (warehouses ?? []).map((w) => w.id);
    const channels = whIds.map((whId) =>
      warehouseService.subscribeToStock(whId, reload),
    );
    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [organization?.id, warehouses, reload]);

  const items = stockItems ?? [];

  // Filter by search
  let filtered = search.trim()
    ? items.filter(
        (s) =>
          s.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
          s.product?.sku?.toLowerCase().includes(search.toLowerCase()) ||
          s.product?.brand?.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  // Filter low stock only
  if (showLowStockOnly) {
    filtered = filtered.filter((s) => s.quantity <= LOW_STOCK_THRESHOLD);
  }

  // Aggregate stats
  const uniqueProducts = new Set(items.map((s) => s.product_id)).size;
  const totalUnits = items.reduce((sum, s) => sum + s.quantity, 0);
  const lowStockCount = items.filter((s) => s.quantity <= LOW_STOCK_THRESHOLD).length;
  const totalReserved = items.reduce((sum, s) => sum + s.reserved_quantity, 0);

  return (
    <div>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Stock de Inventario</h1>
          <p style={{ color: '#8A8886', fontSize: 14, marginTop: 4 }}>
            Vista general del stock disponible en todos los almacenes
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="rh-stats-grid mb-6">
        <StatsCard title="Productos con Stock" value={uniqueProducts} icon="📦" color="#6366F1" />
        <StatsCard title="Unidades Totales" value={totalUnits} icon="📊" color="#10B981" />
        <StatsCard title="Alertas Stock Bajo" value={lowStockCount} icon="⚠️" color="#D3010A" />
        <StatsCard title="Unidades Reservadas" value={totalReserved} icon="🔒" color="#F59E0B" />
      </div>

      {/* Filters row */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Warehouse filter */}
        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="rh-input"
          style={{ maxWidth: 220 }}
        >
          <option value="all">Todos los almacenes</option>
          {(warehouses ?? []).map((wh) => (
            <option key={wh.id} value={wh.id}>
              {wh.name} ({wh.code})
            </option>
          ))}
        </select>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }}
          />
          <input
            type="text"
            placeholder="Buscar producto, SKU, marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rh-input"
            style={{ paddingLeft: 36 }}
          />
        </div>

        {/* Low stock toggle */}
        <button
          className={`rh-filter-pill ${showLowStockOnly ? 'active' : ''}`}
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          style={showLowStockOnly ? { backgroundColor: '#D3010A15', color: '#D3010A', borderColor: '#D3010A' } : {}}
        >
          <AlertTriangle size={14} style={{ marginRight: 4 }} />
          Stock bajo ({lowStockCount})
        </button>
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No hay stock registrado"
          description="El inventario apareceraa aqui cuando se registren productos en las ubicaciones del almacen"
        />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Marca</th>
                <th className="text-right">Stock Total</th>
                <th className="text-right">Reservado</th>
                <th className="text-right">Disponible</th>
                <th>Ubicacion</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((stock) => {
                const available = stock.quantity - stock.reserved_quantity;
                const isLow = stock.quantity <= LOW_STOCK_THRESHOLD;

                return (
                  <tr key={stock.id} style={isLow ? { backgroundColor: '#FEF2F2' } : {}}>
                    <td className="cell-primary">
                      {stock.product?.name ?? '-'}
                    </td>
                    <td className="cell-mono" style={{ fontSize: 12, color: '#605E5C' }}>
                      {stock.product?.sku ?? '-'}
                    </td>
                    <td style={{ color: '#605E5C' }}>
                      {stock.product?.brand ?? '-'}
                    </td>
                    <td className="text-right cell-bold">{stock.quantity}</td>
                    <td className="text-right" style={{ color: '#F59E0B' }}>
                      {stock.reserved_quantity}
                    </td>
                    <td
                      className="text-right cell-bold"
                      style={{ color: available > 0 ? '#10B981' : '#D3010A' }}
                    >
                      {available}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: 12 }}>
                        <MapPin size={12} style={{ color: '#8A8886' }} />
                        {stock.location?.code ?? '-'}
                      </span>
                    </td>
                    <td>
                      {isLow ? (
                        <span
                          className="rh-badge"
                          style={{ backgroundColor: '#D3010A15', color: '#D3010A' }}
                        >
                          <AlertTriangle size={12} style={{ marginRight: 2 }} />
                          Stock bajo
                        </span>
                      ) : (
                        <span
                          className="rh-badge"
                          style={{ backgroundColor: '#10B98115', color: '#10B981' }}
                        >
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
