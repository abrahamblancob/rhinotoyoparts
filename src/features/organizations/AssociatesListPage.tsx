import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { AssociateCreateModal } from './AssociateCreateModal.tsx';
import type { Organization } from '@/lib/database.types.ts';

interface AssociateWithParent extends Organization {
  parent_name: string | null;
  parent_id: string | null;
}

export function AssociatesListPage() {
  const [associates, setAssociates] = useState<AssociateWithParent[]>([]);
  const [aggregators, setAggregators] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editOrg, setEditOrg] = useState<AssociateWithParent | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [aggFilter, setAggFilter] = useState<string>('all');
  const { canWrite } = usePermissions();

  const loadAssociates = async () => {
    setLoading(true);

    // Load aggregators for filter dropdown
    const { data: aggData } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('type', 'aggregator')
      .order('name');
    setAggregators(aggData ?? []);

    // Load associates with their parent aggregator via org_hierarchy
    let query = supabase
      .from('organizations')
      .select('*, org_hierarchy!org_hierarchy_child_id_fkey(parent_id, parent:organizations!org_hierarchy_parent_id_fkey(name))')
      .eq('type', 'associate')
      .order('name');

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;

    const mapped: AssociateWithParent[] = (data ?? []).map((org) => {
      const hierarchy = Array.isArray(org.org_hierarchy) ? org.org_hierarchy[0] : org.org_hierarchy;
      return {
        ...org,
        parent_name: hierarchy?.parent?.name ?? null,
        parent_id: hierarchy?.parent_id ?? null,
        org_hierarchy: undefined,
      } as AssociateWithParent;
    });

    // Apply aggregator filter client-side
    const filtered = aggFilter === 'all'
      ? mapped
      : aggFilter === 'none'
        ? mapped.filter((a) => !a.parent_id)
        : mapped.filter((a) => a.parent_id === aggFilter);

    setAssociates(filtered);
    setLoading(false);
  };

  useEffect(() => { loadAssociates(); }, [filter, aggFilter]);

  const handleCreate = () => { setEditOrg(null); setShowModal(true); };
  const handleEdit = (org: AssociateWithParent) => { setEditOrg(org); setShowModal(true); };
  const handleCloseModal = () => { setShowModal(false); setEditOrg(null); };

  const statusFilters = ['all', 'active', 'suspended', 'pending'];
  const statusLabels: Record<string, string> = {
    all: 'Todos', active: 'Activos', suspended: 'Suspendidos', pending: 'Pendientes',
  };

  const isFiltered = filter !== 'all' || aggFilter !== 'all';

  return (
    <div>
      <div className="rh-page-header">
        <h1 className="rh-page-title">Asociados</h1>
        {canWrite('organizations') && (
          <div className="rh-page-actions">
            <button onClick={handleCreate} className="rh-btn rh-btn-primary">
              + Nuevo Asociado
            </button>
          </div>
        )}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="rh-filters" style={{ marginBottom: 0 }}>
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rh-filter-pill ${filter === f ? 'active' : ''}`}
            >
              {statusLabels[f]}
            </button>
          ))}
        </div>

        {aggregators.length > 0 && (
          <select
            value={aggFilter}
            onChange={(e) => setAggFilter(e.target.value)}
            className="rh-select"
            style={{ minWidth: 200 }}
          >
            <option value="all">Todos los Agregadores</option>
            {aggregators.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
            <option value="none">Sin Agregador</option>
          </select>
        )}
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : associates.length === 0 ? (
        <EmptyState
          icon="🏪"
          title={isFiltered ? 'No hay asociados con estos filtros' : 'No hay asociados'}
          description={isFiltered
            ? 'Intenta con otros filtros'
            : 'Crea tu primer asociado para comenzar'}
          actionLabel={isFiltered ? undefined : 'Crear Asociado'}
          onAction={isFiltered ? undefined : handleCreate}
        />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Agregador</th>
                <th>RIF</th>
                <th>Email</th>
                <th>Comisión</th>
                <th>Estado</th>
                {canWrite('organizations') && <th style={{ width: 80 }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {associates.map((org) => (
                <tr
                  key={org.id}
                  onClick={() => canWrite('organizations') && handleEdit(org)}
                  style={{ cursor: canWrite('organizations') ? 'pointer' : 'default' }}
                >
                  <td className="cell-primary">{org.name}</td>
                  <td>
                    {org.parent_name ? (
                      <span style={{
                        background: '#FFF4E5', color: '#B8860B',
                        padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500,
                      }}>
                        {org.parent_name}
                      </span>
                    ) : (
                      <span className="cell-muted">—</span>
                    )}
                  </td>
                  <td className="cell-muted">{org.rif ?? '—'}</td>
                  <td className="cell-muted">{org.email ?? '—'}</td>
                  <td className="cell-mono">{org.commission_pct ?? 0}%</td>
                  <td><StatusBadge status={org.status} /></td>
                  {canWrite('organizations') && (
                    <td>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(org); }}
                        className="rh-btn rh-btn-ghost rh-btn-sm"
                      >
                        ✏️ Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AssociateCreateModal
        open={showModal}
        onClose={handleCloseModal}
        onCreated={loadAssociates}
        editOrg={editOrg}
        aggregators={aggregators}
      />
    </div>
  );
}
