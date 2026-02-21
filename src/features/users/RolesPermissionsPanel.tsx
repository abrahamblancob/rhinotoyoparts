import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.ts';

interface RoleRow {
  role_name: string;
  display_name: string;
  org_type: string;
}

interface PermEntry {
  role_name: string;
  module: string;
  action: string;
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  organizations: 'Organizaciones',
  users: 'Usuarios',
  inventory: 'Inventario',
  catalog: 'Catálogo',
  orders: 'Órdenes',
  customers: 'Clientes',
  billing: 'Facturación',
  audit: 'Auditoría',
  settings: 'Configuración',
  upload: 'Carga Inv.',
  dispatches: 'Despachos',
};

const ACTION_LABELS: Record<string, string> = {
  read: 'Leer',
  write: 'Escribir',
  delete: 'Eliminar',
  manage: 'Gestionar',
};

const ACTION_ICONS: Record<string, string> = {
  read: '👁️',
  write: '✏️',
  delete: '🗑️',
  manage: '⚙️',
};

const ORG_TYPE_LABELS: Record<string, string> = {
  platform: 'Plataforma',
  aggregator: 'Agregador',
  associate: 'Asociado',
};

const ORG_TYPE_ORDER = ['platform', 'aggregator', 'associate'];

export function RolesPermissionsPanel() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [perms, setPerms] = useState<PermEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOrgType, setFilterOrgType] = useState<string>('all');

  useEffect(() => {
    async function load() {
      // Load roles
      const { data: rolesData } = await supabase
        .from('roles')
        .select('name, display_name, org_type')
        .order('org_type')
        .order('name');

      // Load permissions matrix: role -> permission (module + action)
      const { data: matrix } = await supabase
        .from('role_permissions')
        .select('roles(name), permissions(module, action)')
        .order('role_id');

      const roleRows: RoleRow[] = (rolesData ?? []).map((r) => ({
        role_name: (r as Record<string, string>).name,
        display_name: (r as Record<string, string>).display_name,
        org_type: (r as Record<string, string>).org_type,
      }));

      const permEntries: PermEntry[] = (matrix ?? []).map((m) => {
        const rec = m as Record<string, unknown>;
        const role = rec.roles as { name: string } | null;
        const perm = rec.permissions as { module: string; action: string } | null;
        return {
          role_name: role?.name ?? '',
          module: perm?.module ?? '',
          action: perm?.action ?? '',
        };
      });

      setRoles(roleRows);
      setPerms(permEntries);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <p className="rh-loading">Cargando matriz de permisos...</p>;
  }

  // Build permission lookup: `role_name:module:action` -> true
  const permSet = new Set(perms.map((p) => `${p.role_name}:${p.module}:${p.action}`));

  // Get unique modules from the data
  const allModules = [...new Set(perms.map((p) => p.module))].sort((a, b) => {
    const keys = Object.keys(MODULE_LABELS);
    return keys.indexOf(a) - keys.indexOf(b);
  });

  const actions = ['read', 'write', 'delete', 'manage'];

  // Filter roles by org type
  const filteredRoles = filterOrgType === 'all'
    ? roles
    : roles.filter((r) => r.org_type === filterOrgType);

  // Group roles by org type for display
  const groupedRoles: Record<string, RoleRow[]> = {};
  for (const role of filteredRoles) {
    if (!groupedRoles[role.org_type]) groupedRoles[role.org_type] = [];
    groupedRoles[role.org_type].push(role);
  }

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: 0 }}>
            Matriz de Roles y Permisos
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Vista de todos los permisos asignados a cada rol del sistema
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
          {[{ key: 'all', label: 'Todos' }, ...ORG_TYPE_ORDER.map((t) => ({ key: t, label: ORG_TYPE_LABELS[t] }))].map(
            ({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterOrgType(key)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filterOrgType === key ? '#1E293B' : '#F8FAFC',
                  color: filterOrgType === key ? '#fff' : '#64748B',
                  transition: 'all 0.15s ease',
                }}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      {ORG_TYPE_ORDER.filter((t) => groupedRoles[t]?.length).map((orgType) => (
        <div key={orgType} style={{ marginBottom: 24 }}>
          <h3 style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 8,
            paddingLeft: 4,
          }}>
            {ORG_TYPE_LABELS[orgType]}
          </h3>
          <div className="rh-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="rh-table" style={{ fontSize: 12, minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 2, minWidth: 140 }}>Rol</th>
                  {allModules.map((mod) => (
                    <th
                      key={mod}
                      colSpan={actions.length}
                      style={{ textAlign: 'center', borderLeft: '2px solid #E2E8F0', padding: '8px 4px' }}
                    >
                      {MODULE_LABELS[mod] ?? mod}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 2 }} />
                  {allModules.map((mod) =>
                    actions.map((act, i) => (
                      <th
                        key={`${mod}-${act}`}
                        style={{
                          textAlign: 'center',
                          fontSize: 10,
                          fontWeight: 500,
                          color: '#94A3B8',
                          padding: '4px 2px',
                          borderLeft: i === 0 ? '2px solid #E2E8F0' : undefined,
                          whiteSpace: 'nowrap',
                        }}
                        title={ACTION_LABELS[act]}
                      >
                        {ACTION_ICONS[act]}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {(groupedRoles[orgType] ?? []).map((role) => (
                  <tr key={role.role_name}>
                    <td style={{
                      position: 'sticky',
                      left: 0,
                      background: '#fff',
                      zIndex: 1,
                      fontWeight: 600,
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        backgroundColor: role.role_name.includes('admin') || role.role_name.includes('owner')
                          ? 'rgba(211, 1, 10, 0.08)'
                          : role.role_name.includes('viewer')
                            ? '#F0F0EF'
                            : 'rgba(99, 102, 241, 0.08)',
                        color: role.role_name.includes('admin') || role.role_name.includes('owner')
                          ? '#D3010A'
                          : role.role_name.includes('viewer')
                            ? '#8A8886'
                            : '#6366F1',
                        fontSize: 12,
                      }}>
                        {role.display_name}
                      </span>
                    </td>
                    {allModules.map((mod) =>
                      actions.map((act, i) => {
                        const has = permSet.has(`${role.role_name}:${mod}:${act}`);
                        return (
                          <td
                            key={`${mod}-${act}`}
                            style={{
                              textAlign: 'center',
                              padding: '6px 2px',
                              borderLeft: i === 0 ? '2px solid #E2E8F0' : undefined,
                            }}
                          >
                            {has ? (
                              <span style={{
                                display: 'inline-block',
                                width: 18,
                                height: 18,
                                lineHeight: '18px',
                                borderRadius: 4,
                                backgroundColor: '#DCFCE7',
                                color: '#16A34A',
                                fontSize: 11,
                                fontWeight: 700,
                              }}>
                                ✓
                              </span>
                            ) : (
                              <span style={{ color: '#E2E8F0', fontSize: 14 }}>—</span>
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 20,
        padding: '12px 16px',
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        fontSize: 12,
        color: '#64748B',
        marginTop: 8,
      }}>
        <span style={{ fontWeight: 600, color: '#475569' }}>Leyenda:</span>
        {actions.map((act) => (
          <span key={act} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {ACTION_ICONS[act]} {ACTION_LABELS[act]}
          </span>
        ))}
      </div>
    </div>
  );
}
