import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { useOrgSelector } from '@/hooks/useOrgSelector.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { OrgSelectorGrid } from '@/components/hub/shared/OrgSelectorGrid.tsx';
import { OrderCreateModal } from './OrderCreateModal.tsx';
import type { Order } from '@/lib/database.types.ts';
import { ORDER_STATUS_LABELS, SOURCE_LABELS } from '@/lib/statusConfig.ts';
import { getOrders } from '@/services/orderService.ts';
import { getOrgOrderSummaries } from '@/services/dashboardService.ts';
import type { OrgOrderSummary } from '@/services/dashboardService.ts';

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [dateSortAsc, setDateSortAsc] = useState(false);
  const { isPlatform, canWrite, isAggregator, isDispatcher } = usePermissions();
  const organization = useAuthStore((s) => s.organization);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();

  const { summaries, selectedOrgId, selectedOrg, loading: loadingSummaries, setSelectedOrgId, showSelector } =
    useOrgSelector<OrgOrderSummary>(getOrgOrderSummaries, isPlatform);

  useEffect(() => {
    if (showSelector) return;
    loadOrders();
  }, [statusFilter, selectedOrgId, showSelector]);

  const loadOrders = async () => {
    setLoading(true);
    const orgId = isPlatform ? selectedOrgId ?? undefined : organization?.id;
    const result = await getOrders({
      orgId,
      isPlatform: false,
      isAggregator,
      isDispatcher,
      assignedTo: profile?.id,
      status: statusFilter,
      includeChildren: isPlatform && !!selectedOrgId,
    });
    setOrders((result.data ?? []) as (Order & { customers: { name: string } | null; organizations: { name: string; type: string } | null })[]);
    setLoading(false);
  };

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const pendingCount = orders.filter((o) => ['draft', 'pending', 'confirmed'].includes(o.status)).length;
  const inProgressCount = orders.filter((o) => ['picking', 'packing', 'packed', 'assigned', 'picked'].includes(o.status)).length;

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return dateSortAsc ? diff : -diff;
    });
  }, [orders, dateSortAsc]);

  const statuses = ['all', 'draft', 'pending', 'confirmed', 'picking', 'packing', 'packed', 'assigned', 'picked', 'shipped', 'in_transit', 'delivered', 'cancelled'];
  const statusLabels = ORDER_STATUS_LABELS;

  // Platform user without org selected → show org cards
  if (showSelector) {
    const totalOrders = summaries.reduce((s, o) => s + o.orderCount, 0);
    const totalPending = summaries.reduce((s, o) => s + o.pendingOrders, 0);
    const totalRevAll = summaries.reduce((s, o) => s + o.revenue, 0);

    return (
      <OrgSelectorGrid<OrgOrderSummary>
        summaries={summaries}
        loading={loadingSummaries}
        onSelect={setSelectedOrgId}
        pageTitle="Órdenes de Compra"
        pageSubtitle="Selecciona un agregador para ver sus órdenes"
        globalStats={[
          { title: 'Total Órdenes', value: totalOrders.toLocaleString(), icon: '🛒', color: '#6366F1' },
          { title: 'Ingresos Totales', value: `$${totalRevAll.toFixed(2)}`, icon: '💰', color: '#10B981' },
          { title: 'Pendientes', value: totalPending, icon: '⏳', color: '#F59E0B' },
          { title: 'Agregadores', value: summaries.length, icon: '🏢', color: '#8B5CF6' },
        ]}
        statFields={[
          { key: 'orderCount', label: 'Órdenes', color: '#6366F1' },
          { key: 'revenue', label: 'Ingresos', color: '#10B981', prefix: '$' },
          { key: 'pendingOrders', label: 'Pendientes', color: '#F59E0B', highlight: true },
          { key: 'inProgressOrders', label: 'En Proceso', color: '#8B5CF6' },
        ]}
      />
    );
  }

  return (
    <div>
      <div className="rh-page-header">
        <div>
          {isPlatform && selectedOrg && (
            <button
              onClick={() => setSelectedOrgId(null)}
              className="rh-btn rh-btn-ghost"
              style={{ fontSize: 13, marginBottom: 4, padding: '2px 0' }}
            >
              ← Todos los agregadores
            </button>
          )}
          <h1 className="rh-page-title">
            Órdenes{isPlatform && selectedOrg ? ` — ${selectedOrg.name}` : ''}
          </h1>
        </div>
        {canWrite('orders') && !isDispatcher && (
          <button className="rh-btn rh-btn-primary" onClick={() => setShowCreate(true)}>
            + Nueva Orden
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="rh-stats-grid mb-6">
        <StatsCard title="Total Órdenes" value={orders.length} icon="🛒" color="#6366F1" />
        <StatsCard title="Ingresos" value={`$${totalRevenue.toFixed(2)}`} icon="💰" color="#10B981" />
        <StatsCard title="Pendientes" value={pendingCount} icon="⏳" color="#F59E0B" />
        <StatsCard title="En Proceso" value={inProgressCount} icon="🔄" color="#8B5CF6" />
      </div>

      {/* Filters */}
      <div className="rh-filters flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rh-filter-pill ${statusFilter === s ? 'active' : ''}`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : orders.length === 0 ? (
        <EmptyState icon="🛒" title="No hay órdenes" description="Las órdenes aparecerán aquí cuando se creen" />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Orden #</th>
                {isPlatform && selectedOrg && <th>Asociado</th>}
                <th>Cliente</th>
                <th
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setDateSortAsc((prev) => !prev)}
                >
                  Fecha {dateSortAsc ? '↑' : '↓'}
                </th>
                <th>Origen</th>
                <th className="text-right">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => {
                const casted = order as unknown as { customers: { name: string } | null; organizations: { name: string; type: string } | null };
                const customerName = casted.customers?.name;
                const orgName = casted.organizations?.name;
                const orgType = casted.organizations?.type;
                const isAssociate = orgType === 'associate';
                return (
                  <tr key={order.id} className="cursor-pointer" onClick={() => navigate(`/hub/orders/${order.id}`)}>
                    <td className="cell-primary cell-mono">{order.order_number}</td>
                    {isPlatform && selectedOrg && (
                      <td>
                        {isAssociate ? (
                          <span style={{ fontSize: 12, background: '#EDE9FE', color: '#7C3AED', padding: '2px 8px', borderRadius: 10 }}>
                            {orgName}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Directa</span>
                        )}
                      </td>
                    )}
                    <td>{customerName ?? '-'}</td>
                    <td className="cell-muted">
                      {new Date(order.created_at).toLocaleDateString('es-VE')}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: '#8A8886' }}>
                        {SOURCE_LABELS[order.source ?? 'manual'] ?? order.source}
                      </span>
                    </td>
                    <td className="text-right cell-bold">${Number(order.total).toFixed(2)}</td>
                    <td><StatusBadge status={order.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <OrderCreateModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={loadOrders} />
    </div>
  );
}
