import { useEffect, useMemo, useState } from 'react';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { OrderPipelineWidget } from './OrderPipelineWidget.tsx';
import { getDashboardStats, getOrgSummaries } from '@/services/dashboardService.ts';
import type { OrgInventorySummary } from '@/services/dashboardService.ts';

export function DashboardPage() {
  const { isPlatform, isAggregator } = usePermissions();
  const organization = useAuthStore((s) => s.organization);
  const [stats, setStats] = useState({ orgs: 0, products: 0, orders: 0, lowStock: 0 });
  const [salesPeriod, setSalesPeriod] = useState<'6m' | '12m'>('6m');

  // Platform org selector
  const [orgSummaries, setOrgSummaries] = useState<OrgInventorySummary[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loadingSummaries, setLoadingSummaries] = useState(false);

  const selectedOrg = orgSummaries.find((o) => o.id === selectedOrgId);

  useEffect(() => {
    if (isPlatform && !selectedOrgId) {
      setLoadingSummaries(true);
      getOrgSummaries().then((data) => {
        setOrgSummaries(data);
        setLoadingSummaries(false);
      });
    }
  }, [isPlatform, selectedOrgId]);

  useEffect(() => {
    const orgId = isPlatform ? selectedOrgId ?? undefined : undefined;
    getDashboardStats(orgId).then(setStats);
  }, [isPlatform, selectedOrgId]);

  // Generate month labels for chart
  const monthLabels = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const count = salesPeriod === '6m' ? 6 : 12;
    const now = new Date();
    const labels: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(months[d.getMonth()]);
    }
    return labels;
  }, [salesPeriod]);

  // Mock activity data
  const recentActivity = [
    { color: '#10B981', title: 'Inventario actualizado', time: 'Reciente' },
    { color: '#D3010A', title: 'Nuevo lote cargado', time: 'Reciente' },
    { color: '#10B981', title: 'Producto creado', time: 'Reciente' },
  ];

  const regionData = [{ name: 'Nacional', pct: 100 }];

  // Platform user without org selected → show org cards
  if (isPlatform && !selectedOrgId) {
    const totalProducts = orgSummaries.reduce((s, o) => s + o.productCount, 0);
    const totalStock = orgSummaries.reduce((s, o) => s + o.totalStock, 0);
    const totalOrders = orgSummaries.reduce((s, o) => s + o.orderCount, 0);

    return (
      <div>
        <div className="rh-page-header">
          <div>
            <h1 className="rh-page-title">Dashboard de Plataforma</h1>
            <p className="rh-page-subtitle">Selecciona una organización para ver su dashboard detallado</p>
          </div>
        </div>

        {/* Global stats */}
        <div className="rh-stats-grid mb-6">
          <StatsCard title="Total Productos" value={totalProducts.toLocaleString()} icon="📦" color="#6366F1" />
          <StatsCard title="Stock Total" value={totalStock.toLocaleString()} icon="🏷️" color="#10B981" />
          <StatsCard title="Órdenes Totales" value={totalOrders} icon="🛒" color="#F59E0B" />
          <StatsCard title="Organizaciones" value={orgSummaries.length} icon="🏢" color="#8B5CF6" />
        </div>

        {loadingSummaries ? (
          <p className="rh-loading">Cargando organizaciones...</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}>
            {orgSummaries.map((org) => (
              <div
                key={org.id}
                onClick={() => setSelectedOrgId(org.id)}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                      {org.name}
                    </h3>
                    <span style={{
                      display: 'inline-block',
                      marginTop: 4,
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: org.type === 'aggregator' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)',
                      color: org.type === 'aggregator' ? '#6366F1' : '#10B981',
                    }}>
                      {org.type === 'aggregator' ? 'Agregador' : 'Asociado'}
                    </span>
                  </div>
                  <span style={{ fontSize: 24, opacity: 0.3 }}>→</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ textAlign: 'center', padding: '8px 0', backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#6366F1', margin: 0 }}>
                      {org.productCount.toLocaleString()}
                    </p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Productos</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 0', backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#10B981', margin: 0 }}>
                      {org.totalStock.toLocaleString()}
                    </p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Stock Total</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 0', backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B', margin: 0 }}>
                      {org.orderCount}
                    </p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Órdenes</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 0', backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: org.lowStock > 0 ? '#D3010A' : '#94A3B8', margin: 0 }}>
                      {org.lowStock}
                    </p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Stock Bajo</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">
            {isPlatform
              ? `Dashboard — ${selectedOrg?.name ?? 'Plataforma'}`
              : isAggregator
                ? 'Dashboard de Agregador'
                : 'Dashboard'}
          </h1>
          <p className="rh-page-subtitle">
            Bienvenido, {selectedOrg?.name ?? organization?.name}
          </p>
        </div>
        {isPlatform && selectedOrgId && (
          <button
            onClick={() => setSelectedOrgId(null)}
            className="rh-btn rh-btn-ghost"
          >
            ← Todas las organizaciones
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="rh-stats-grid mb-6">
        <StatsCard
          title="Productos Activos"
          value={stats.products.toLocaleString()}
          icon="📦"
          color="#6366F1"
        />
        <StatsCard
          title="Ventas del Mes"
          value="$0.00"
          icon="💰"
          color="#10B981"
        />
        <StatsCard
          title="Ordenes Activas"
          value={stats.orders}
          icon="🛒"
          color="#F59E0B"
        />
        <StatsCard
          title="Stock Bajo Alerta"
          value={stats.lowStock}
          icon="⚠️"
          color="#D3010A"
        />
      </div>

      {/* Order Pipeline (visible for aggregator and platform) */}
      {(isPlatform || isAggregator) && (
        <div style={{ marginBottom: 20 }}>
          <OrderPipelineWidget orgId={isPlatform ? selectedOrgId ?? undefined : undefined} />
        </div>
      )}

      {/* Sales Chart + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginBottom: 20 }}>
        {/* Sales Chart */}
        <div className="rh-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 className="rh-card-title" style={{ margin: 0 }}>
              📊 Ventas por Mes
            </h3>
            <div style={{ display: 'flex', gap: 0, border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <button
                onClick={() => setSalesPeriod('6m')}
                style={{
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: salesPeriod === '6m' ? '#FFFFFF' : '#F8FAFC',
                  color: salesPeriod === '6m' ? '#D3010A' : '#94A3B8',
                }}
              >
                6 meses
              </button>
              <button
                onClick={() => setSalesPeriod('12m')}
                style={{
                  padding: '6px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  borderLeft: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  backgroundColor: salesPeriod === '12m' ? '#FFFFFF' : '#F8FAFC',
                  color: salesPeriod === '12m' ? '#D3010A' : '#94A3B8',
                }}
              >
                12 meses
              </button>
            </div>
          </div>

          {/* Chart area placeholder */}
          <div
            style={{
              height: 240,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              gap: 8,
              paddingBottom: 32,
              position: 'relative',
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={`grid-${i}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 32 + i * 52,
                  borderBottom: '1px solid #F1F5F9',
                }}
              />
            ))}

            {monthLabels.map((month) => (
              <div key={month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 1 }}>
                <div
                  style={{
                    width: '60%',
                    maxWidth: 48,
                    height: 4,
                    backgroundColor: '#E2E8F0',
                    borderRadius: 4,
                  }}
                />
                <span style={{ fontSize: 12, color: '#94A3B8', marginTop: 12 }}>{month}</span>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 13, marginTop: 8 }}>
            Sin datos de ventas registrados aun
          </p>
        </div>

        {/* Recent Activity */}
        <div className="rh-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 className="rh-card-title" style={{ margin: 0 }}>
              ⚡ Actividad Reciente
            </h3>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
              En vivo
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recentActivity.length > 0 ? recentActivity.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 0',
                  borderBottom: i < recentActivity.length - 1 ? '1px solid #F1F5F9' : 'none',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: item.color,
                    flexShrink: 0,
                    marginTop: 5,
                  }}
                />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: 0 }}>
                    {item.title}
                  </p>
                  <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
                    {item.time}
                  </p>
                </div>
              </div>
            )) : (
              <p style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
                No hay actividad reciente
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Top Products + Sales by Region */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        <div className="rh-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 0' }}>
            <h3 className="rh-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              🏆 Top Productos Vendidos
            </h3>
          </div>
          <div className="rh-table-wrapper">
            <table className="rh-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Precio</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8', padding: 32 }}>
                    Sin datos de ventas aun
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rh-card" style={{ padding: '24px' }}>
          <h3 className="rh-card-title" style={{ marginBottom: 20 }}>
            📍 Ventas por Region
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {regionData.map((region) => (
              <div key={region.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1E293B' }}>{region.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{region.pct}%</span>
                </div>
                <div style={{ height: 6, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${region.pct}%`,
                      height: '100%',
                      backgroundColor: '#D3010A',
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            ))}
            <p style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 13, marginTop: 8 }}>
              Se actualizara con datos de ordenes reales
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
