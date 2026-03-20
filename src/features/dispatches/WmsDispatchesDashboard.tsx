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
  orgId: string;
  orgName: string;
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
  const { data } = await supabase
    .from('orders')
    .select('org_id, status, organizations:org_id(name)')
    .in('status', ['ready_to_ship', 'shipped', 'in_transit']);

  if (!data) return [];

  const map = new Map<string, OrgDispatchSummary>();
  for (const row of data as Array<{ org_id: string; status: string; organizations: { name: string } | null }>) {
    let entry = map.get(row.org_id);
    if (!entry) {
      entry = { orgId: row.org_id, orgName: row.organizations?.name ?? 'Org', readyToShip: 0, inTransit: 0, total: 0 };
      map.set(row.org_id, entry);
    }
    if (row.status === 'ready_to_ship') entry.readyToShip++;
    else entry.inTransit++;
    entry.total++;
  }
  return Array.from(map.values());
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

  const fetcher = useCallback(async () => {
    if (!orgId) return [];
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, status, total, created_at, updated_at, shipped_at, customer_phone, customers(name), assigned_profile:profiles!orders_assigned_to_fkey(full_name)')
      .eq('org_id', orgId)
      .in('status', ['ready_to_ship', 'shipped', 'in_transit'])
      .order('updated_at', { ascending: false });
    return (data as OrderRow[] | null) ?? [];
  }, [orgId]);

  const { data: orders } = useAsyncData<OrderRow[]>(fetcher, [orgId]);
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
        title="Despachos"
        summaries={nav.summaries}
        loading={nav.loading}
        onSelectOrg={nav.selectAggregator}
        stats={[
          { title: 'Esperando Recoger', value: totalReady, icon: '📦', color: '#F59E0B' },
          { title: 'En Tránsito', value: totalTransit, icon: '🚚', color: '#3B82F6' },
        ]}
        renderOrgCard={(summary) => (
          <>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{summary.total}</span>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              {summary.readyToShip} esperando · {summary.inTransit} en tránsito
            </span>
          </>
        )}
        getOrgId={(s) => s.orgId}
        getOrgName={(s) => s.orgName}
      />
    );
  }

  // Level 2: Associate filter (platform viewing aggregator)
  if (nav.navState === 'list' && isPlatform && nav.associates.length > 0) {
    return (
      <div>
        {nav.breadcrumbs.length > 0 && <Breadcrumbs items={nav.breadcrumbs} />}
        <div className="rh-page-header">
          <h1 className="rh-page-title">Despachos</h1>
        </div>
        <AssociateFilterCards
          associates={nav.associates}
          selectedId={nav.selectedAssociateId}
          onSelect={nav.selectAssociate}
        />
        {renderContent()}
      </div>
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
      {renderContent()}
    </div>
  );
}
