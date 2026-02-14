import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { OrgCreateModal } from './OrgCreateModal.tsx';
import type { Organization } from '@/lib/database.types.ts';

export function OrgListPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editOrg, setEditOrg] = useState<Organization | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const { isPlatform, canWrite } = usePermissions();

  const loadOrgs = async () => {
    setLoading(true);
    let query = supabase.from('organizations').select('*').neq('type', 'platform').order('created_at', { ascending: false });
    if (filter !== 'all') {
      query = query.eq('status', filter);
    }
    const { data } = await query;
    setOrgs(data as Organization[] ?? []);
    setLoading(false);
  };

  useEffect(() => { loadOrgs(); }, [filter]);

  const title = isPlatform ? 'Agregadores' : 'Mis Asociados';
  const entityName = isPlatform ? 'agregadores' : 'asociados';
  const entityLabel = isPlatform ? 'Agregador' : 'Asociado';
  const filters = ['all', 'active', 'suspended', 'pending'];
  const filterLabels: Record<string, string> = { all: 'Todos', active: 'Activos', suspended: 'Suspendidos', pending: 'Pendientes' };

  const handleCreate = () => {
    setEditOrg(null);
    setShowModal(true);
  };

  const handleEdit = (org: Organization) => {
    setEditOrg(org);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditOrg(null);
  };

  // Different empty state depending on whether we're filtering
  const isFiltered = filter !== 'all';
  const emptyTitle = isFiltered
    ? `No hay ${entityName} ${filterLabels[filter]?.toLowerCase()}`
    : `No hay ${entityName}`;
  const emptyDescription = isFiltered
    ? `No se encontraron ${entityName} con estado "${filterLabels[filter]?.toLowerCase()}"`
    : `Crea tu primer ${entityLabel.toLowerCase()} para comenzar`;

  return (
    <div>
      <div className="rh-page-header">
        <h1 className="rh-page-title">{title}</h1>
        {canWrite('organizations') && (
          <div className="rh-page-actions">
            <button
              onClick={handleCreate}
              className="rh-btn rh-btn-primary"
            >
              + Nuevo {entityLabel}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rh-filters">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rh-filter-pill ${filter === f ? 'active' : ''}`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : orgs.length === 0 ? (
        <EmptyState
          icon="🏢"
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={isFiltered ? undefined : `Crear ${entityLabel}`}
          onAction={isFiltered ? undefined : handleCreate}
        />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RIF</th>
                <th>Tipo</th>
                <th>Email</th>
                <th>Comisión</th>
                <th>Estado</th>
                {canWrite('organizations') && <th style={{ width: 80 }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr
                  key={org.id}
                  onClick={() => canWrite('organizations') && handleEdit(org)}
                  style={{ cursor: canWrite('organizations') ? 'pointer' : 'default' }}
                >
                  <td className="cell-primary">{org.name}</td>
                  <td className="cell-muted">{org.rif ?? '—'}</td>
                  <td><StatusBadge status={org.type} label={org.type === 'aggregator' ? 'Agregador' : 'Asociado'} /></td>
                  <td className="cell-muted">{org.email ?? '—'}</td>
                  <td className="cell-mono">{org.commission_pct ?? 0}%</td>
                  <td><StatusBadge status={org.status} /></td>
                  {canWrite('organizations') && (
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(org);
                        }}
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

      <OrgCreateModal
        open={showModal}
        onClose={handleCloseModal}
        onCreated={loadOrgs}
        editOrg={editOrg}
      />
    </div>
  );
}
