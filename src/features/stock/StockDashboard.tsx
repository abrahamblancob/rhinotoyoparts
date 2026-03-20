import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  AlertTriangle,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { useAggregatorNav } from '@/hooks/useAggregatorNav.ts';
import { useWarehouses, useWarehouseStats } from '@/hooks/useWarehouse.ts';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { OrgSelectorGrid } from '@/components/hub/shared/OrgSelectorGrid.tsx';
import { Breadcrumbs } from '@/components/hub/shared/Breadcrumbs.tsx';
import { AssociateFilterCards } from '@/components/hub/shared/AssociateFilterCards.tsx';
import * as warehouseService from '@/services/warehouseService.ts';
import { getOrgStockSummaries } from '@/services/dashboardService.ts';
import type { OrgStockSummary } from '@/services/dashboardService.ts';
import { supabase } from '@/lib/supabase.ts';
import type { InventoryStock } from '@/types/warehouse.ts';

const LOW_STOCK_THRESHOLD = 5;

/* ─── SVG Donut Chart ─── */
function DonutChart({ located, unlocated }: { located: number; unlocated: number }) {
  const total = located + unlocated;
  const pct = total > 0 ? Math.round((located / total) * 100) : 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const locatedArc = total > 0 ? (located / total) * circumference : 0;

  return (
    <svg width={180} height={180} viewBox="0 0 180 180" style={{ display: 'block', margin: '0 auto' }}>
      <circle cx={90} cy={90} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={18} />
      {locatedArc > 0 && (
        <circle cx={90} cy={90} r={radius} fill="none"
          stroke="#10B981" strokeWidth={18} strokeLinecap="round"
          strokeDasharray={`${locatedArc} ${circumference}`}
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      )}
      {total > 0 && located < total && (
        <circle cx={90} cy={90} r={radius} fill="none"
          stroke="#F59E0B" strokeWidth={18} strokeLinecap="round"
          strokeDasharray={`${circumference - locatedArc} ${circumference}`}
          strokeDashoffset={-locatedArc}
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
        />
      )}
      <text x={90} y={82} textAnchor="middle" fontSize={30} fontWeight={700} fill="#1E293B">{pct}%</text>
      <text x={90} y={104} textAnchor="middle" fontSize={12} fill="#94A3B8">Ubicados</text>
    </svg>
  );
}

/* ─── Stacked Bar ─── */
function StackedBar({ segments }: { segments: { color: string; value: number }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  return (
    <div style={{ height: 24, backgroundColor: '#F1F5F9', borderRadius: 12, overflow: 'hidden', display: 'flex' }}>
      {segments.map((seg, i) => {
        const w = total > 0 ? (seg.value / total) * 100 : 0;
        return w > 0 ? (
          <div key={i} style={{ width: `${w}%`, height: '100%', backgroundColor: seg.color, transition: 'width 0.4s ease' }} />
        ) : null;
      })}
    </div>
  );
}

/* ─── Occupancy Gauge ─── */
function OccupancyGauge({ occupied, total, rate }: { occupied: number; total: number; rate: number }) {
  const color = rate < 70 ? '#10B981' : rate < 90 ? '#F59E0B' : '#D3010A';
  return (
    <div className="rh-card" style={{ padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', margin: 0 }}>🏗️ Ocupación del Almacén</h3>
        <span style={{ fontSize: 24, fontWeight: 700, color }}>{rate}%</span>
      </div>
      <div style={{ height: 16, backgroundColor: '#F1F5F9', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ width: `${Math.min(rate, 100)}%`, height: '100%', backgroundColor: color, borderRadius: 8, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748B' }}>
        <span><strong style={{ color: '#1E293B' }}>{occupied}</strong> ubicaciones ocupadas</span>
        <span><strong style={{ color: '#1E293B' }}>{total - occupied}</strong> disponibles de <strong>{total}</strong></span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */

export function StockDashboard() {
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showUnlocated, setShowUnlocated] = useState(false);
  const navigate = useNavigate();
  const { isPlatform } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  const nav = useAggregatorNav<OrgStockSummary>(getOrgStockSummaries, isPlatform);

  const orgId = isPlatform ? nav.effectiveOrgId ?? undefined : organization?.id;
  const shouldIncludeChildren = isPlatform && nav.includeChildren && !!nav.selectedAggregatorId;

  const { data: defaultWarehouses } = useWarehouses();

  // When platform user selects an org, fetch that org's warehouses
  const whFetcher = useCallback(
    () => orgId ? warehouseService.getWarehouses({ orgId, isPlatform: false }) : Promise.resolve({ data: [] as never[], error: null }),
    [orgId],
  );
  const { data: orgWarehouses } = useAsyncData(whFetcher, [orgId]);
  const warehouses = isPlatform && nav.selectedAggregatorId ? orgWarehouses : defaultWarehouses;

  const fetcher = useCallback(
    () => {
      if (!orgId) return Promise.resolve({ data: [] as InventoryStock[], error: null });
      if (warehouseFilter !== 'all') return warehouseService.getStockByWarehouse(warehouseFilter);
      return warehouseService.getStockByOrg(orgId, shouldIncludeChildren);
    },
    [orgId, warehouseFilter, shouldIncludeChildren],
  );

  const { data: stockItems, loading, reload } = useAsyncData<InventoryStock[]>(fetcher, [orgId, warehouseFilter, shouldIncludeChildren]);

  const { stats } = useWarehouseStats(warehouseFilter !== 'all' ? warehouseFilter : undefined);

  useEffect(() => {
    if (!orgId) return;
    const whIds = (warehouses ?? []).map((w) => w.id);
    const channels = whIds.map((whId) => warehouseService.subscribeToStock(whId, reload));
    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [orgId, warehouses, reload]);

  useEffect(() => { setWarehouseFilter('all'); }, [orgId]);

  const items = nav.navState !== 'list' && isPlatform ? [] : (stockItems ?? []);

  let filtered = search.trim()
    ? items.filter((s) =>
        s.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.product?.sku?.toLowerCase().includes(search.toLowerCase()) ||
        s.product?.brand?.toLowerCase().includes(search.toLowerCase()),
      )
    : items;
  if (showLowStockOnly) filtered = filtered.filter((s) => s.quantity <= LOW_STOCK_THRESHOLD);

  const uniqueProducts = new Set(items.map((s) => s.product_id)).size;
  const totalUnits = items.reduce((sum, s) => sum + s.quantity, 0);
  const totalReserved = items.reduce((sum, s) => sum + s.reserved_quantity, 0);
  const totalAvailable = totalUnits - totalReserved;

  const locatedItems = items.filter((s) => s.location_id !== null);
  const unlocatedItems = items.filter((s) => s.location_id === null);
  const locatedUnits = locatedItems.reduce((sum, s) => sum + s.quantity, 0);
  const unlocatedUnits = unlocatedItems.reduce((sum, s) => sum + s.quantity, 0);
  const totalRows = items.length;
  const locationCoveragePct = totalRows > 0 ? Math.round((locatedItems.length / totalRows) * 100) : 0;

  const lowStockCount = items.filter((s) => s.quantity <= LOW_STOCK_THRESHOLD).length;
  const normalStockCount = items.filter((s) => s.quantity > LOW_STOCK_THRESHOLD).length;
  const zeroStockCount = items.filter((s) => s.quantity === 0).length;
  const lowButPositiveCount = items.filter((s) => s.quantity > 0 && s.quantity <= LOW_STOCK_THRESHOLD).length;
  const healthTotal = normalStockCount + lowButPositiveCount + zeroStockCount;

  const healthData = [
    { label: 'Stock Normal', count: normalStockCount, color: '#10B981' },
    { label: 'Stock Bajo', count: lowButPositiveCount, color: '#F59E0B' },
    { label: 'Sin Stock', count: zeroStockCount, color: '#D3010A' },
  ];

  const selectedWarehouseName = warehouseFilter !== 'all'
    ? warehouses?.find((w) => w.id === warehouseFilter)?.name ?? 'Almacén'
    : null;

  // Level 1: Aggregator grid
  if (nav.navState === 'aggregators') {
    const totalProducts = nav.summaries.reduce((s, o) => s + o.productCount, 0);
    const totalUnitsAll = nav.summaries.reduce((s, o) => s + o.totalUnits, 0);
    const totalLow = nav.summaries.reduce((s, o) => s + o.lowStockCount, 0);
    const totalWarehouses = nav.summaries.reduce((s, o) => s + o.warehouseCount, 0);

    return (
      <OrgSelectorGrid<OrgStockSummary>
        summaries={nav.summaries}
        loading={nav.loading}
        onSelect={nav.selectAggregator}
        pageTitle="Stock por Ubicación"
        pageSubtitle="Selecciona un agregador para ver su inventario"
        globalStats={[
          { title: 'Productos', value: totalProducts, icon: '📦', color: '#6366F1' },
          { title: 'Unidades Totales', value: totalUnitsAll.toLocaleString(), icon: '📊', color: '#10B981' },
          { title: 'Alertas Stock Bajo', value: totalLow, icon: '⚠️', color: '#D3010A' },
          { title: 'Almacenes', value: totalWarehouses, icon: '🏭', color: '#8B5CF6' },
        ]}
        statFields={[
          { key: 'productCount', label: 'Productos', color: '#6366F1' },
          { key: 'totalUnits', label: 'Unidades', color: '#10B981' },
          { key: 'lowStockCount', label: 'Stock Bajo', color: '#D3010A', highlight: true },
          { key: 'warehouseCount', label: 'Almacenes', color: '#8B5CF6' },
        ]}
      />
    );
  }

  return (
    <div>
      <div className="rh-page-header" style={{ marginBottom: 24 }}>
        <div>
          {isPlatform && nav.breadcrumbs.length > 0 && <Breadcrumbs items={nav.breadcrumbs} />}
          <h1 className="rh-page-title">Stock de Inventario</h1>
          <p style={{ color: '#8A8886', fontSize: 14, marginTop: 4 }}>
            {selectedWarehouseName
              ? `Dashboard de stock — ${selectedWarehouseName}`
              : 'Vista general del stock en todos los almacenes'}
          </p>
        </div>
        <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}
          className="rh-input" style={{ maxWidth: 220 }}>
          <option value="all">Todos los almacenes</option>
          {(warehouses ?? []).map((wh) => (
            <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
          ))}
        </select>
      </div>

      {isPlatform && nav.childOrgs.length > 0 && (
        <AssociateFilterCards
          childOrgs={nav.childOrgs}
          filterChildOrgId={nav.filterChildOrgId}
          onFilter={nav.setFilterChildOrgId}
        />
      )}

      {loading ? (
        <p className="rh-loading">Cargando dashboard...</p>
      ) : items.length === 0 ? (
        <EmptyState icon="📦" title="No hay stock registrado"
          description="El inventario aparecerá aquí cuando se registren productos en las ubicaciones del almacén" />
      ) : (
        <>
          <div className="rh-stats-grid-5">
            <StatsCard title="Productos en Almacén" value={uniqueProducts} icon="📦" color="#6366F1" />
            <StatsCard title="En Estantería" value={`${locatedUnits} uds`} icon="📍" color="#10B981"
              trend={{ value: locationCoveragePct, label: 'ubicados' }} />
            <div onClick={() => unlocatedItems.length > 0 && setShowUnlocated(!showUnlocated)}
              style={{ cursor: unlocatedItems.length > 0 ? 'pointer' : 'default', borderRadius: 16,
                outline: showUnlocated ? '2px solid #F59E0B' : 'none', outlineOffset: -1, transition: 'outline 0.2s' }}>
              <StatsCard title="Sin Ubicar" value={`${unlocatedUnits} uds`} icon="🚫" color="#F59E0B" />
            </div>
            <StatsCard title="Alertas Stock Bajo" value={lowStockCount} icon="⚠️" color="#D3010A" />
          </div>

          {showUnlocated && unlocatedItems.length > 0 && (
            <div className="rh-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24, border: '1px solid #F59E0B' }}>
              <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#9A3412', margin: 0 }}>🚫 Productos sin ubicación asignada</h3>
                  <p style={{ fontSize: 12, color: '#C2410C', margin: '4px 0 0' }}>
                    Estos productos están en el almacén pero no tienen estante asignado. Asígnalos desde el{' '}
                    <button onClick={() => navigate('/hub/warehouse')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A3412',
                        fontWeight: 700, textDecoration: 'underline', padding: 0, fontSize: 'inherit' }}>
                      Layout del Almacén →
                    </button>
                  </p>
                </div>
                <button onClick={() => setShowUnlocated(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9A3412', padding: 4 }}>✕</button>
              </div>
              <div className="rh-table-wrapper">
                <table className="rh-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Marca</th>
                      <th className="text-right">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unlocatedItems.map((stock) => {
                      return (
                        <tr key={stock.id}>
                          <td className="cell-mono cell-bold">{stock.product?.sku ?? '-'}</td>
                          <td className="cell-muted" style={{ fontSize: 12 }}>{stock.product?.name ?? '-'}</td>
                          <td style={{ color: '#605E5C' }}>{stock.product?.brand ?? '-'}</td>
                          <td className="text-right cell-bold">{stock.quantity}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '12px 24px', backgroundColor: '#FFFBEB', borderTop: '1px solid #FED7AA', fontSize: 13, color: '#92400E' }}>
                Total: <strong>{unlocatedItems.length}</strong> registros · <strong>{unlocatedUnits}</strong> unidades sin ubicar
              </div>
            </div>
          )}

          <div className="stock-charts-grid">
            <div className="rh-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 20 }}>📊 Cobertura de Ubicación</h3>
              <DonutChart located={locatedItems.length} unlocated={unlocatedItems.length} />
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                    <span style={{ fontSize: 13, color: '#475569' }}>En estantería</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{locatedUnits} unidades</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#F59E0B', display: 'inline-block' }} />
                    <span style={{ fontSize: 13, color: '#475569' }}>Sin ubicar</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{unlocatedUnits} unidades</span>
                </div>
              </div>
            </div>

            <div className="rh-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', marginBottom: 20 }}>🩺 Salud del Inventario</h3>
              <StackedBar segments={healthData.map((d) => ({ color: d.color, value: d.count }))} />
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {healthData.map((d) => (
                  <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: d.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 13, color: '#475569' }}>{d.label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                      {d.count} ({healthTotal > 0 ? Math.round((d.count / healthTotal) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #E2E8F0' }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disponibilidad</h4>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '12px 8px', backgroundColor: '#F0FDF4', borderRadius: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#10B981' }}>{totalUnits}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Total en Stock</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {warehouseFilter !== 'all' && stats && stats.totalLocations > 0 && (
            <OccupancyGauge occupied={stats.occupiedLocations} total={stats.totalLocations} rate={stats.occupancyRate} />
          )}

          <div className="rh-card" style={{ padding: 0, overflow: 'hidden' }}>
            <button onClick={() => setShowTable(!showTable)}
              style={{ width: '100%', padding: '16px 24px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#1E293B' }}>
              <span>📋 Detalle de Inventario ({filtered.length} registros)</span>
              <ChevronDown size={20} style={{ color: '#64748B', transform: showTable ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {showTable && (
              <div style={{ padding: '0 24px 24px' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
                    <input type="text" placeholder="Buscar producto, SKU, marca..." value={search}
                      onChange={(e) => setSearch(e.target.value)} className="rh-input" style={{ paddingLeft: 36 }} />
                  </div>
                  <button className={`rh-filter-pill ${showLowStockOnly ? 'active' : ''}`}
                    onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                    style={showLowStockOnly ? { backgroundColor: '#D3010A15', color: '#D3010A', borderColor: '#D3010A' } : {}}>
                    <AlertTriangle size={14} style={{ marginRight: 4 }} />
                    Stock bajo ({lowStockCount})
                  </button>
                </div>

                {filtered.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#94A3B8', padding: 24 }}>No se encontraron registros</p>
                ) : (
                  <div className="rh-table-wrapper">
                    <table className="rh-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Producto</th>
                          <th>Marca</th>
                          <th className="text-right">Cantidad</th>
                          <th>Ubicación</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((stock) => {
                          const available = stock.quantity - stock.reserved_quantity;
                          const isLow = stock.quantity <= LOW_STOCK_THRESHOLD;
                          const isUnlocated = !stock.location_id;

                          return (
                            <tr key={stock.id} style={isLow ? { backgroundColor: '#FEF2F2' } : {}}>
                              <td className="cell-mono cell-bold">{stock.product?.sku ?? '-'}</td>
                              <td className="cell-muted" style={{ fontSize: 12 }}>{stock.product?.name ?? '-'}</td>
                              <td style={{ color: '#605E5C' }}>{stock.product?.brand ?? '-'}</td>
                              <td className="text-right cell-bold">{stock.quantity}</td>
                              <td>
                                {isUnlocated ? (
                                  <span className="rh-badge" style={{ backgroundColor: '#FFF7ED', color: '#EA580C', border: '1px solid #FDBA74' }}>
                                    🚫 Sin ubicar
                                  </span>
                                ) : (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: 12 }}>
                                    <MapPin size={12} style={{ color: '#10B981' }} />
                                    {stock.location?.code ?? '-'}
                                  </span>
                                )}
                              </td>
                              <td>
                                {isLow ? (
                                  <span className="rh-badge" style={{ backgroundColor: '#D3010A15', color: '#D3010A' }}>
                                    <AlertTriangle size={12} style={{ marginRight: 2 }} /> Stock bajo
                                  </span>
                                ) : (
                                  <span className="rh-badge" style={{ backgroundColor: '#10B98115', color: '#10B981' }}>Normal</span>
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
