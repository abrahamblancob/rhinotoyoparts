import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Weight, CheckSquare, Package } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { useAggregatorNav } from '@/hooks/useAggregatorNav.ts';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { OrgSelectorGrid } from '@/components/hub/shared/OrgSelectorGrid.tsx';
import { Breadcrumbs } from '@/components/hub/shared/Breadcrumbs.tsx';
import { PACK_SESSION_STATUS_LABELS } from '@/lib/statusConfig.ts';
import * as packingService from '@/services/packingService.ts';
import { getOrgPackingSummaries } from '@/services/dashboardService.ts';
import type { OrgPackingSummary } from '@/services/dashboardService.ts';
import { supabase } from '@/lib/supabase.ts';
import type { PackSession } from '@/types/warehouse.ts';

export function PackingDashboard() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { isPlatform, isAggregator } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  const nav = useAggregatorNav<OrgPackingSummary>(getOrgPackingSummaries, isPlatform);

  const orgId = isPlatform ? nav.effectiveOrgId ?? undefined : organization?.id;
  const shouldIncludeChildren = isPlatform && nav.includeChildren && !!nav.selectedAggregatorId;

  const fetcher = useCallback(
    () =>
      packingService.getPackSessions({
        orgId,
        isPlatform: false,
        isAggregator,
        status: statusFilter === 'all' ? undefined : statusFilter,
        includeChildren: shouldIncludeChildren,
      }),
    [orgId, isAggregator, statusFilter, shouldIncludeChildren],
  );

  const { data: sessions, loading, reload } = useAsyncData<PackSession[]>(fetcher, [
    orgId,
    statusFilter,
    shouldIncludeChildren,
  ]);

  useEffect(() => {
    const subId = orgId ?? organization?.id;
    if (!subId) return;
    const channel = packingService.subscribeToPackSessions(subId, reload);
    return () => { supabase.removeChannel(channel); };
  }, [orgId, organization?.id, reload]);

  const items = nav.navState !== 'list' && isPlatform ? [] : (sessions ?? []);
  const filtered = search.trim()
    ? items.filter((s) => s.order?.order_number?.toLowerCase().includes(search.toLowerCase()))
    : items;

  const totalCount = items.length;
  const pendingCount = items.filter((s) => s.status === 'pending').length;
  const inProgressCount = items.filter((s) => s.status === 'in_progress').length;
  const completedToday = items.filter((s) => {
    if (s.status !== 'completed' || !s.completed_at) return false;
    const today = new Date().toISOString().slice(0, 10);
    return s.completed_at.slice(0, 10) === today;
  }).length;

  const statuses = ['all', 'pending', 'in_progress', 'verified', 'labelled', 'completed'];

  // Level 1: Aggregator grid
  if (nav.navState === 'aggregators') {
    const totalSessions = nav.summaries.reduce((s, o) => s + o.packSessionCount, 0);
    const totalPending = nav.summaries.reduce((s, o) => s + o.pendingPacks, 0);
    const totalInProgress = nav.summaries.reduce((s, o) => s + o.inProgressPacks, 0);

    return (
      <OrgSelectorGrid<OrgPackingSummary>
        summaries={nav.summaries}
        loading={nav.loading}
        onSelect={nav.selectAggregator}
        pageTitle="Packing"
        pageSubtitle="Selecciona un agregador para ver sus sesiones de empaque"
        globalStats={[
          { title: 'Total Sesiones', value: totalSessions, icon: '📦', color: '#6366F1' },
          { title: 'Pendientes', value: totalPending, icon: '⏳', color: '#F59E0B' },
          { title: 'En Progreso', value: totalInProgress, icon: '🔄', color: '#F97316' },
          { title: 'Agregadores', value: nav.summaries.length, icon: '🏢', color: '#8B5CF6' },
        ]}
        statFields={[
          { key: 'packSessionCount', label: 'Sesiones', color: '#6366F1' },
          { key: 'pendingPacks', label: 'Pendientes', color: '#F59E0B', highlight: true },
          { key: 'inProgressPacks', label: 'En Progreso', color: '#F97316' },
        ]}
      />
    );
  }

  // Level 2: Associate selection
  if (nav.navState === 'associates') {
    const aggName = (nav.selectedAggregator as OrgPackingSummary)?.name ?? 'Agregador';
    return (
      <div>
        <Breadcrumbs items={[
          { label: 'Agregadores', onClick: nav.goBackToAggregators },
          { label: aggName },
        ]} />
        <h1 className="rh-page-title" style={{ marginBottom: 8 }}>Packing — {aggName}</h1>
        <p style={{ color: '#8A8886', fontSize: 14, marginBottom: 20 }}>
          Selecciona una organización o ve todas las sesiones
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 500 }}>
          {/* View all option */}
          <div
            onClick={nav.viewAllForAggregator}
            style={{
              padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
              border: '2px solid #6366F1', background: '#EEF2FF',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#4338CA' }}>Ver todas las sesiones</div>
              <div style={{ fontSize: 12, color: '#6366F1', marginTop: 2 }}>
                {aggName} + {nav.childOrgs.length} asociado{nav.childOrgs.length !== 1 ? 's' : ''}
              </div>
            </div>
            <span style={{ color: '#6366F1', fontSize: 18 }}>→</span>
          </div>

          {/* Aggregator direct */}
          <div
            onClick={nav.viewAllForAggregator}
            style={{
              padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
              border: '1px solid #E2E0DE', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D3010A'; e.currentTarget.style.background = '#FEF2F2'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E0DE'; e.currentTarget.style.background = '#fff'; }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#1E293B' }}>{aggName}</div>
              <div style={{ fontSize: 12, color: '#8A8886', marginTop: 2 }}>
                <span style={{ background: '#DBEAFE', color: '#2563EB', padding: '1px 8px', borderRadius: 10, fontSize: 11 }}>Agregador</span>
              </div>
            </div>
            <span style={{ color: '#94A3B8', fontSize: 18 }}>→</span>
          </div>

          {/* Child associates */}
          {nav.childOrgs.map((child) => (
            <div
              key={child.id}
              onClick={() => nav.selectAssociate(child.id)}
              style={{
                padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
                border: '1px solid #E2E0DE', background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D3010A'; e.currentTarget.style.background = '#FEF2F2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E0DE'; e.currentTarget.style.background = '#fff'; }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#1E293B' }}>{child.name}</div>
                <div style={{ fontSize: 12, color: '#8A8886', marginTop: 2 }}>
                  <span style={{ background: '#EDE9FE', color: '#7C3AED', padding: '1px 8px', borderRadius: 10, fontSize: 11 }}>Asociado</span>
                </div>
              </div>
              <span style={{ color: '#94A3B8', fontSize: 18 }}>→</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Level 3: List view
  const showAssociateCol = isPlatform && nav.selectedAggregatorId && nav.includeChildren;

  return (
    <div>
      <div className="rh-page-header">
        <div>
          {isPlatform && nav.breadcrumbs.length > 0 && <Breadcrumbs items={nav.breadcrumbs} />}
          <h1 className="rh-page-title">Packing</h1>
          <p style={{ color: '#8A8886', fontSize: 14, marginTop: 4 }}>
            Gestiona la verificación y empaque de pedidos
          </p>
        </div>
      </div>

      <div className="rh-stats-grid mb-6">
        <StatsCard title="Total" value={totalCount} icon="📦" color="#6366F1" />
        <StatsCard title="Pendientes" value={pendingCount} icon="⏳" color="#F59E0B" />
        <StatsCard title="En Progreso" value={inProgressCount} icon="🔄" color="#F97316" />
        <StatsCard title="Completados Hoy" value={completedToday} icon="✅" color="#10B981" />
      </div>

      <div className="rh-filters flex-wrap" style={{ gap: 8, marginBottom: 16 }}>
        {statuses.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`rh-filter-pill ${statusFilter === s ? 'active' : ''}`}>
            {PACK_SESSION_STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 360 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }} />
        <input type="text" placeholder="Buscar por número de orden..." value={search} onChange={(e) => setSearch(e.target.value)} className="rh-input" style={{ paddingLeft: 36 }} />
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📦" title="No hay sesiones de packing" description="Las sesiones de empaque aparecerán aquí cuando se completen listas de picking" />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Orden #</th>
                {showAssociateCol && <th>Asociado</th>}
                <th>Empacador</th>
                <th>Estado</th>
                <th>Verificados</th>
                <th>Bultos</th>
                <th>Peso (kg)</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((session) => {
                const org = (session as unknown as { organization: { name: string; type: string } | null }).organization;
                const isAssoc = org?.type === 'associate';
                return (
                  <tr key={session.id} className="cursor-pointer" onClick={() => navigate(`/hub/packing/${session.id}`)}>
                    <td className="cell-primary cell-mono">{session.order?.order_number ?? '-'}</td>
                    {showAssociateCol && (
                      <td>
                        {isAssoc ? (
                          <span style={{ fontSize: 12, background: '#EDE9FE', color: '#7C3AED', padding: '2px 8px', borderRadius: 10 }}>{org?.name}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Directa</span>
                        )}
                      </td>
                    )}
                    <td>{session.packer?.full_name ?? <span style={{ color: '#C8C6C4' }}>Sin asignar</span>}</td>
                    <td><StatusBadge status={session.status} /></td>
                    <td><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckSquare size={14} style={{ color: '#8A8886' }} />{session.verified_items} / {session.total_items}</span></td>
                    <td><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Package size={14} style={{ color: '#8A8886' }} />{session.package_count ?? 1}</span></td>
                    <td><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Weight size={14} style={{ color: '#8A8886' }} />{session.package_weight_kg != null ? `${session.package_weight_kg} kg` : '-'}</span></td>
                    <td>
                      <button className="rh-btn" style={{ fontSize: 12, padding: '4px 10px' }} onClick={(e) => { e.stopPropagation(); navigate(`/hub/packing/${session.id}`); }}>
                        Ver detalle
                      </button>
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
