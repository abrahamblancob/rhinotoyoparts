import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { useAggregatorNav } from '@/hooks/useAggregatorNav.ts';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { OrgSelectorGrid } from '@/components/hub/shared/OrgSelectorGrid.tsx';
import { Breadcrumbs } from '@/components/hub/shared/Breadcrumbs.tsx';
import { AssociateFilterCards } from '@/components/hub/shared/AssociateFilterCards.tsx';
import { supabase } from '@/lib/supabase.ts';

interface OrgDispatchSummary {
  id: string;
  name: string;
  type: string;
  readyToShip: number;
  inTransit: number;
  total: number;
}

type TabKey = 'ready_to_ship' | 'in_transit';

const TABS: { key: TabKey; label: string; statuses: string[] }[] = [
  { key: 'ready_to_ship', label: 'Esperando Recoger', statuses: ['ready_to_ship'] },
  { key: 'in_transit', label: 'En Tránsito', statuses: ['shipped', 'in_transit'] },
];

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  updated_at: string;
  shipped_at: string | null;
  customer_phone: string | null;
  customers: { name: string } | null;
  assigned_profile: { full_name: string } | null;
}

async function getOrgDispatchSummaries(): Promise<OrgDispatchSummary[]> {
  // Fetch aggregators with their children
  const { data: aggregators } = await supabase
    .from('organizations')
    .select('id, name, type')
    .eq('type', 'aggregator')
    .eq('status', 'active');

  if (!aggregators || aggregators.length === 0) return [];

  const results: OrgDispatchSummary[] = [];

  for (const agg of aggregators) {
    // Get child org IDs
    const { data: hierarchy } = await supabase
      .from('org_hierarchy')
      .select('child_id')
      .eq('parent_id', agg.id);

    const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);
    const allOrgIds = [agg.id, ...childIds];

    const { data: orders } = await supabase
      .from('orders')
      .select('status')
      .in('org_id', allOrgIds)
      .in('status', ['ready_to_ship', 'shipped', 'in_transit']);

    let readyToShip = 0;
    let inTransit = 0;
    for (const o of orders ?? []) {
      if ((o as { status: string }).status === 'ready_to_ship') readyToShip++;
      else inTransit++;
    }

    results.push({
      id: agg.id,
      name: agg.name,
      type: agg.type,
      readyToShip,
      inTransit,
      total: readyToShip + inTransit,
    });
  }

  return results;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export function WmsDispatchesDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('ready_to_ship');
  const navigate = useNavigate();
  const { isPlatform } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  const nav = useAggregatorNav<OrgDispatchSummary>(getOrgDispatchSummaries, isPlatform);

  const orgId = isPlatform ? nav.effectiveOrgId ?? undefined : organization?.id;

  const fetcher = useCallback(async (): Promise<{ data: OrderRow[] | null; error: string | null }> => {
    if (!orgId) return { data: [], error: null };

    // If platform viewing aggregator (includeChildren), get child org IDs too
    let orgIds = [orgId];
    if (isPlatform && nav.includeChildren) {
      const { data: hierarchy } = await supabase
        .from('org_hierarchy')
        .select('child_id')
        .eq('parent_id', orgId);
      const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);
      orgIds = [orgId, ...childIds];
    }

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, status, total, created_at, updated_at, shipped_at, customer_phone, customers(name), assigned_profile:profiles!orders_assigned_to_fkey(full_name)')
      .in('org_id', orgIds)
      .in('status', ['ready_to_ship', 'shipped', 'in_transit'])
      .order('updated_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: (data as unknown as OrderRow[]) ?? [], error: null };
  }, [orgId, isPlatform, nav.includeChildren]);

  const { data: orders } = useAsyncData<OrderRow[]>(fetcher, [orgId, nav.includeChildren]);
  const allOrders = orders ?? [];

  const tab = TABS.find((t) => t.key === activeTab)!;
  const filtered = allOrders.filter((o) => tab.statuses.includes(o.status));

  const readyCount = allOrders.filter((o) => o.status === 'ready_to_ship').length;
  const transitCount = allOrders.filter((o) => ['shipped', 'in_transit'].includes(o.status)).length;

  // Level 1: Aggregator grid (platform only)
  if (nav.navState === 'aggregators') {
    const totalReady = nav.summaries.reduce((s, o) => s + o.readyToShip, 0);
    const totalTransit = nav.summaries.reduce((s, o) => s + o.inTransit, 0);

    return (
      <OrgSelectorGrid<OrgDispatchSummary>
        summaries={nav.summaries}
        loading={nav.loading}
        onSelect={nav.selectAggregator}
        pageTitle="Despachos"
        pageSubtitle="Selecciona un agregador para gestionar sus despachos"
        globalStats={[
          { title: 'Esperando Recoger', value: totalReady, icon: '📦', color: '#F59E0B' },
          { title: 'En Tránsito', value: totalTransit, icon: '🚚', color: '#3B82F6' },
        ]}
        statFields={[
          { key: 'readyToShip', label: 'Esperando', color: '#F59E0B', highlight: true },
          { key: 'inTransit', label: 'En Tránsito', color: '#3B82F6' },
          { key: 'total', label: 'Total', color: '#6366F1' },
        ]}
      />
    );
  }

  function renderContent() {
    return (
      <>
        {/* Stats */}
        <div className="rh-stats-grid mb-6">
          <StatsCard title="Esperando Recoger" value={readyCount} icon="📦" color="#F59E0B" />
          <StatsCard title="En Tránsito" value={transitCount} icon="🚚" color="#3B82F6" />
          <StatsCard title="Total" value={allOrders.length} icon="📊" color="#6366F1" />
        </div>

        {/* Tabs */}
        <div className="rh-filters" style={{ marginBottom: 16 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`rh-filter-pill ${activeTab === t.key ? 'active' : ''}`}
            >
              {t.label} ({t.key === 'ready_to_ship' ? readyCount : transitCount})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={activeTab === 'ready_to_ship' ? '✅' : '🚚'}
            title={activeTab === 'ready_to_ship' ? 'No hay órdenes esperando recoger' : 'No hay órdenes en tránsito'}
            description="Las órdenes aparecerán aquí cuando cambien de estado"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((order) => (
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
                      {order.customers?.name ?? 'Sin cliente'}
                      {order.customer_phone && ` · ${order.customer_phone}`}
                    </p>
                    {order.assigned_profile?.full_name && (
                      <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
                        Despachador: {order.assigned_profile.full_name}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>${Number(order.total).toFixed(2)}</span>
                    <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
                      {order.status === 'ready_to_ship' && `Lista ${timeAgo(order.updated_at)}`}
                      {(order.status === 'shipped' || order.status === 'in_transit') && order.shipped_at && `Despachada ${timeAgo(order.shipped_at)}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  // Default view (associate or platform after selecting org)
  return (
    <div>
      {isPlatform && nav.breadcrumbs.length > 0 && <Breadcrumbs items={nav.breadcrumbs} />}
      <div className="rh-page-header">
        <h1 className="rh-page-title">Despachos</h1>
      </div>
      {isPlatform && nav.childOrgs.length > 0 && (
        <AssociateFilterCards
          childOrgs={nav.childOrgs}
          filterChildOrgId={nav.filterChildOrgId}
          onFilter={nav.setFilterChildOrgId}
        />
      )}
      {renderContent()}
    </div>
  );
}
