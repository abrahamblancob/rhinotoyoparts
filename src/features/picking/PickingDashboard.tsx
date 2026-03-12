import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Hand,
  Package,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import * as pickingService from '@/services/pickingService.ts';
import { supabase } from '@/lib/supabase.ts';
import { toast } from '@/stores/toastStore.ts';
import type { PickList, PickListStatus } from '@/types/warehouse.ts';

const STATUS_LABELS: Record<string, string> = {
  all: 'Todos',
  pending: 'Pendiente',
  assigned: 'Asignado',
  in_progress: 'En Progreso',
  completed: 'Completado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<PickListStatus, { bg: string; text: string }> = {
  pending: { bg: '#F59E0B15', text: '#F59E0B' },
  assigned: { bg: '#3B82F615', text: '#3B82F6' },
  in_progress: { bg: '#F9731615', text: '#F97316' },
  completed: { bg: '#10B98115', text: '#10B981' },
  cancelled: { bg: '#8A888615', text: '#8A8886' },
  expired: { bg: '#D3010A15', text: '#D3010A' },
};

function getElapsedTime(startedAt: string | null): string {
  if (!startedAt) return '-';
  const diff = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function PickingDashboard() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { isPlatform, isAggregator, roles } = usePermissions();
  const organization = useAuthStore((s) => s.organization);
  const user = useAuthStore((s) => s.user);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetcher = useCallback(
    () =>
      pickingService.getPickLists({
        orgId: organization?.id,
        isPlatform,
        isAggregator,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    [organization?.id, isPlatform, isAggregator, statusFilter],
  );

  const { data: pickLists, loading, reload } = useAsyncData<PickList[]>(fetcher, [
    organization?.id,
    statusFilter,
  ]);

  // Realtime subscription
  useEffect(() => {
    if (!organization?.id) return;
    const channel = pickingService.subscribeToPickLists(organization.id, reload);
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id, reload]);

  const items = pickLists ?? [];

  // Filter by search
  const filtered = search.trim()
    ? items.filter((pl) =>
        pl.order?.order_number?.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  // Stats
  const totalCount = items.length;
  const pendingCount = items.filter((p) => p.status === 'pending').length;
  const inProgressCount = items.filter((p) => p.status === 'in_progress').length;
  const completedToday = items.filter((p) => {
    if (p.status !== 'completed' || !p.completed_at) return false;
    const today = new Date().toISOString().slice(0, 10);
    return p.completed_at.slice(0, 10) === today;
  }).length;

  const statuses = ['all', 'pending', 'assigned', 'in_progress', 'completed', 'expired'];

  const isPicker = roles.includes('warehouse_picker') || roles.includes('warehouse_manager') || roles.includes('platform_owner');

  const handleClaimPickList = async (pickListId: string) => {
    if (!user) return;
    setClaiming(pickListId);
    try {
      const { data, error } = await pickingService.claimPickList(pickListId, user.id);
      if (error || !data) {
        toast('error', 'No se pudo tomar la lista. Puede que otro almacenista ya la haya tomado.');
      } else {
        toast('success', 'Lista tomada exitosamente');
        reload();
      }
    } catch {
      toast('error', 'Error al tomar la lista de picking');
    }
    setClaiming(null);
  };

  return (
    <div>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Picking - Listas de Recoleccion</h1>
          <p style={{ color: '#8A8886', fontSize: 14, marginTop: 4 }}>
            Gestiona las listas de recoleccion de pedidos
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="rh-stats-grid mb-6">
        <StatsCard title="Total" value={totalCount} icon="📋" color="#6366F1" />
        <StatsCard title="Pendientes" value={pendingCount} icon="⏳" color="#F59E0B" />
        <StatsCard title="En Progreso" value={inProgressCount} icon="🔄" color="#F97316" />
        <StatsCard title="Completados Hoy" value={completedToday} icon="✅" color="#10B981" />
      </div>

      {/* Filters */}
      <div className="rh-filters flex-wrap" style={{ gap: 8, marginBottom: 16 }}>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rh-filter-pill ${statusFilter === s ? 'active' : ''}`}
          >
            {STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 360 }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }}
        />
        <input
          type="text"
          placeholder="Buscar por numero de orden..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rh-input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No hay listas de picking"
          description="Las listas de recoleccion aparecerean aqui cuando se creen pedidos"
        />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Orden #</th>
                <th>Productos</th>
                <th>Almacenista</th>
                <th>Estado</th>
                <th>Tiempo</th>
                <th>% Completado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pl) => {
                const pct =
                  pl.total_items > 0
                    ? Math.round((pl.picked_items / pl.total_items) * 100)
                    : 0;
                const statusStyle = STATUS_COLORS[pl.status] ?? {
                  bg: '#8A888615',
                  text: '#8A8886',
                };

                return (
                  <tr
                    key={pl.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/hub/picking/${pl.id}`)}
                  >
                    <td className="cell-primary cell-mono">
                      {pl.order?.order_number ?? '-'}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Package size={14} style={{ color: '#8A8886' }} />
                        {pl.total_items}
                      </span>
                    </td>
                    <td>{pl.assignee?.full_name ?? <span style={{ color: '#C8C6C4' }}>Sin asignar</span>}</td>
                    <td>
                      <span
                        className="rh-badge"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                      >
                        {STATUS_LABELS[pl.status] ?? pl.status}
                      </span>
                    </td>
                    <td className="cell-muted">{getElapsedTime(pl.started_at)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 60,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: '#E1DFDD',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              backgroundColor: pct === 100 ? '#10B981' : '#F97316',
                              borderRadius: 3,
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 12, color: '#8A8886' }}>{pct}%</span>
                      </div>
                    </td>
                    <td>
                      {pl.status === 'pending' && isPicker && (
                        <button
                          className="rh-btn rh-btn-primary"
                          style={{ fontSize: 12, padding: '4px 10px' }}
                          disabled={claiming === pl.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClaimPickList(pl.id);
                          }}
                        >
                          <Hand size={14} style={{ marginRight: 4 }} />
                          {claiming === pl.id ? 'Tomando...' : 'Tomar'}
                        </button>
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
