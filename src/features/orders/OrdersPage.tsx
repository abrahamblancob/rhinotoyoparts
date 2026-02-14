import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import type { Order } from '@/lib/database.types.ts';

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const { isPlatform } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (!isPlatform && organization) {
      query = query.eq('org_id', organization.id);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    const { data } = await query;
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  };

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const processingCount = orders.filter((o) => o.status === 'processing' || o.status === 'confirmed').length;

  const statuses = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const statusLabels: Record<string, string> = {
    all: 'Todas', pending: 'Pendientes', confirmed: 'Confirmadas', processing: 'En proceso',
    shipped: 'Enviadas', delivered: 'Entregadas', cancelled: 'Canceladas',
  };

  return (
    <div>
      <div className="rh-page-header">
        <h1 className="rh-page-title">Órdenes</h1>
      </div>

      {/* Stats */}
      <div className="rh-stats-grid mb-6">
        <StatsCard title="Total Órdenes" value={orders.length} icon="🛒" color="#6366F1" />
        <StatsCard title="Ingresos" value={`$${totalRevenue.toFixed(2)}`} icon="💰" color="#10B981" />
        <StatsCard title="Pendientes" value={pendingCount} icon="⏳" color="#F59E0B" />
        <StatsCard title="En Proceso" value={processingCount} icon="🔄" color="#D3010A" />
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
                <th>Fecha</th>
                <th className="text-right">Subtotal</th>
                <th className="text-right">Impuesto</th>
                <th className="text-right">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="cursor-pointer">
                  <td className="cell-primary cell-mono">{order.order_number}</td>
                  <td className="cell-muted">
                    {new Date(order.created_at).toLocaleDateString('es-VE')}
                  </td>
                  <td className="text-right cell-muted">${order.subtotal.toFixed(2)}</td>
                  <td className="text-right cell-muted">${order.tax.toFixed(2)}</td>
                  <td className="text-right cell-bold">${order.total.toFixed(2)}</td>
                  <td><StatusBadge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
