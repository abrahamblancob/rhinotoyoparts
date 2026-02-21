import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { OrderCreateModal } from './OrderCreateModal.tsx';
import type { Order } from '@/lib/database.types.ts';

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const { isPlatform, canWrite, isAggregator, isDispatcher } = usePermissions();
  const organization = useAuthStore((s) => s.organization);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, customers(name)')
      .order('created_at', { ascending: false });

    if (!isPlatform && organization) {
      query = query.eq('org_id', organization.id);
    }

    // Dispatchers only see their assigned orders
    if (isDispatcher && profile) {
      query = query.eq('assigned_to', profile.id);
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    const { data } = await query;
    setOrders((data as (Order & { customers: { name: string } | null })[]) ?? []);
    setLoading(false);
  };

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const pendingCount = orders.filter((o) => ['draft', 'pending', 'confirmed'].includes(o.status)).length;
  const inProgressCount = orders.filter((o) => ['assigned', 'preparing', 'ready_to_ship', 'processing'].includes(o.status)).length;

  const statuses = ['all', 'draft', 'pending', 'confirmed', 'assigned', 'preparing', 'ready_to_ship', 'shipped', 'in_transit', 'delivered', 'cancelled'];
  const statusLabels: Record<string, string> = {
    all: 'Todas', draft: 'Borrador', pending: 'Pendientes', confirmed: 'Confirmadas',
    assigned: 'Asignadas', preparing: 'Preparando', ready_to_ship: 'Listas',
    processing: 'En proceso', shipped: 'Enviadas', in_transit: 'En tránsito',
    delivered: 'Entregadas', cancelled: 'Canceladas',
  };

  return (
    <div>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Órdenes</h1>
        </div>
        {canWrite('orders') && !isAggregator && !isDispatcher && (
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
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Origen</th>
                <th className="text-right">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const customerName = (order as unknown as { customers: { name: string } | null }).customers?.name;
                return (
                  <tr key={order.id} className="cursor-pointer" onClick={() => navigate(`/hub/orders/${order.id}`)}>
                    <td className="cell-primary cell-mono">{order.order_number}</td>
                    <td>{customerName ?? '-'}</td>
                    <td className="cell-muted">
                      {new Date(order.created_at).toLocaleDateString('es-VE')}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: '#8A8886' }}>
                        {order.source === 'whatsapp' ? 'WhatsApp' : order.source === 'rhino_vision' ? 'Rhino Vision' : 'Manual'}
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
