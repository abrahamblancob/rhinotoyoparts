import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import type { Order } from '@/lib/database.types.ts';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription.ts';

type TabKey = 'assigned' | 'preparing' | 'ready_to_ship' | 'shipped';

interface OrderWithCustomer extends Order {
  customers: { name: string } | null;
}

const TABS: { key: TabKey; label: string; statuses: string[] }[] = [
  { key: 'assigned', label: 'Pendientes', statuses: ['assigned'] },
  { key: 'preparing', label: 'En preparación', statuses: ['preparing'] },
  { key: 'ready_to_ship', label: 'Listas para envío', statuses: ['ready_to_ship'] },
  { key: 'shipped', label: 'Despachadas hoy', statuses: ['shipped', 'in_transit'] },
];

export function DispatchesPage() {
  const profile = useAuthStore((s) => s.profile);
  const organization = useAuthStore((s) => s.organization);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('assigned');
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [allOrders, setAllOrders] = useState<OrderWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    if (!profile || !organization) return;
    setLoading(true);

    const { data } = await supabase
      .from('orders')
      .select('*, customers(name)')
      .eq('org_id', organization.id)
      .eq('assigned_to', profile.id)
      .in('status', ['assigned', 'preparing', 'ready_to_ship', 'shipped', 'in_transit'])
      .order('created_at', { ascending: false });

    setAllOrders((data as OrderWithCustomer[]) ?? []);
    setLoading(false);
  }, [profile, organization]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    if (tab) {
      setOrders(allOrders.filter((o) => tab.statuses.includes(o.status)));
    }
  }, [activeTab, allOrders]);

  // Subscribe to real-time changes
  useRealtimeSubscription(
    'dispatcher-orders',
    'orders',
    profile ? `assigned_to=eq.${profile.id}` : undefined,
    loadOrders,
  );

  const tabCounts = TABS.reduce((acc, tab) => {
    acc[tab.key] = allOrders.filter((o) => tab.statuses.includes(o.status)).length;
    return acc;
  }, {} as Record<TabKey, number>);

  const totalActive = allOrders.filter((o) => !['shipped', 'in_transit', 'delivered'].includes(o.status)).length;
  const todayShipped = allOrders.filter((o) => {
    if (o.status !== 'shipped' && o.status !== 'in_transit') return false;
    if (!o.shipped_at) return false;
    return new Date(o.shipped_at).toDateString() === new Date().toDateString();
  }).length;

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${Math.floor(hours / 24)}d`;
  };

  return (
    <div>
      <div className="rh-page-header">
        <h1 className="rh-page-title">Mis Despachos</h1>
      </div>

      {/* Stats */}
      <div className="rh-stats-grid mb-6">
        <StatsCard title="Órdenes Activas" value={totalActive} icon="📦" color="#8B5CF6" />
        <StatsCard title="Pendientes" value={tabCounts.assigned} icon="⏳" color="#F59E0B" />
        <StatsCard title="Preparando" value={tabCounts.preparing} icon="🔧" color="#3B82F6" />
        <StatsCard title="Despachadas Hoy" value={todayShipped} icon="🚚" color="#10B981" />
      </div>

      {/* Tabs */}
      <div className="rh-filters" style={{ marginBottom: 16 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rh-filter-pill ${activeTab === tab.key ? 'active' : ''}`}
          >
            {tab.label} ({tabCounts[tab.key]})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={activeTab === 'assigned' ? '✅' : '📦'}
          title={`No hay órdenes ${activeTab === 'assigned' ? 'pendientes' : 'en esta sección'}`}
          description="Las órdenes asignadas a ti aparecerán aquí"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map((order) => (
            <div
              key={order.id}
              className="rh-card"
              onClick={() => navigate(`/hub/orders/${order.id}`)}
              style={{ padding: 16, cursor: 'pointer', transition: 'box-shadow 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{order.order_number}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p style={{ fontSize: 14, color: '#475569', margin: '4px 0 0' }}>
                    {order.customers?.name ?? 'Sin cliente'} · {order.customer_phone ?? ''}
                    {(order.shipping_address as Record<string, string> | null)?.address && (
                      <> · {(order.shipping_address as Record<string, string>).address}</>
                    )}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>${Number(order.total).toFixed(2)}</span>
                  <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
                    {order.status === 'assigned' && order.assigned_at && `Asignada ${timeAgo(order.assigned_at)}`}
                    {order.status === 'preparing' && `Preparando ${timeAgo(order.updated_at)}`}
                    {order.status === 'ready_to_ship' && `Lista ${timeAgo(order.updated_at)}`}
                    {(order.status === 'shipped' || order.status === 'in_transit') && order.shipped_at && `Despachada ${timeAgo(order.shipped_at)}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
