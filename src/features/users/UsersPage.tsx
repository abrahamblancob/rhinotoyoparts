import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { callEdgeFunction } from '@/lib/edgeFunction.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { ConfirmDeleteModal } from '@/components/hub/shared/ConfirmDeleteModal.tsx';
import type { Profile } from '@/lib/database.types.ts';
import { RolesPermissionsPanel } from './RolesPermissionsPanel.tsx';
import { UserCreateModal } from './UserCreateModal.tsx';
import { UserEditModal } from './UserEditModal.tsx';
import type { UserWithRole } from './UserEditModal.tsx';
import { getRoleBadgeStyle } from '@/lib/statusConfig.ts';

function getUserStatus(user: UserWithRole): 'active' | 'pending' | 'inactive' {
  if (!user.is_active && !user.last_login) return 'pending';
  if (!user.is_active) return 'inactive';
  return 'active';
}

export function UsersPage() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const { canWrite, canManage, isPlatform, isAggregator, roles: userRoles } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  // Edit & delete state
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserWithRole | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Resend invitation state
  const [resendLoading, setResendLoading] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState('');

  const loadUsers = async () => {
    setLoading(true);

    let visibleOrgIds: string[] = [];

    if (isPlatform) {
      // Platform sees all
    } else if (isAggregator && organization) {
      visibleOrgIds = [organization.id];
      const { data: children } = await supabase
        .from('org_hierarchy')
        .select('child_id')
        .eq('parent_id', organization.id);
      if (children) {
        visibleOrgIds.push(...children.map((c: { child_id: string }) => c.child_id));
      }
    } else if (organization) {
      visibleOrgIds = [organization.id];
    }

    let query = supabase
      .from('profiles')
      .select('*, user_roles(role_id, roles(name, display_name))')
      .order('created_at', { ascending: false });

    if (!isPlatform && visibleOrgIds.length > 0) {
      query = query.in('org_id', visibleOrgIds);
    }

    const { data } = await query;

    let orgMap: Record<string, string> = {};
    if (isPlatform || isAggregator) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name');
      orgMap = Object.fromEntries((orgs ?? []).map((o: { id: string; name: string }) => [o.id, o.name]));
    }

    const mapped: UserWithRole[] = (data ?? []).map((u) => {
      const record = u as Record<string, unknown>;
      const uRoles = record.user_roles as { role_id: string; roles: { name: string; display_name: string } | null }[] | null;
      const firstRole = uRoles?.[0];
      const profile = record as unknown as Profile;
      return {
        ...profile,
        role_name: firstRole?.roles?.name ?? '',
        role_display: firstRole?.roles?.display_name ?? 'Sin rol',
        role_id: firstRole?.role_id ?? '',
        org_name: (isPlatform || isAggregator) ? orgMap[profile.org_id] ?? '' : undefined,
      };
    });

    setUsers(mapped);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.role_display ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleResendInvitation = async (userId: string) => {
    setResendLoading(userId);
    setResendMsg('');

    try {
      const data = await callEdgeFunction<{ message?: string }>('resend-invitation', { user_id: userId });
      setResendMsg(data?.message || 'Correo enviado');
    } catch (err) {
      setResendMsg((err as Error).message);
    }

    setResendLoading(null);
    setTimeout(() => setResendMsg(''), 3000);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    try {
      const data = await callEdgeFunction<{ message?: string }>('delete-user', { user_id: deleteTarget.id });
      setResendMsg(data?.message || 'Usuario eliminado');
      loadUsers();
    } catch (err) {
      setResendMsg((err as Error).message);
    }

    setDeleteLoading(false);
    setDeleteTarget(null);
    setTimeout(() => setResendMsg(''), 3000);
  };

  const currentUserId = useAuthStore((s) => s.user?.id);

  return (
    <div>
      <div className="rh-page-header">
        <h1 className="rh-page-title">Usuarios</h1>
        <div className="rh-page-actions">
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rh-search"
          />
          {canWrite('users') && (
            <button
              onClick={() => setShowCreate(true)}
              className="rh-btn rh-btn-primary"
            >
              + Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      {resendMsg && (
        <div className="rh-alert rh-alert-success" style={{ marginBottom: 16 }}>
          {resendMsg}
        </div>
      )}

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No hay usuarios"
          description="Agrega usuarios para gestionar tu equipo"
          actionLabel={canWrite('users') ? 'Crear Usuario' : undefined}
          onAction={canWrite('users') ? () => setShowCreate(true) : undefined}
        />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                {(isPlatform || isAggregator) && <th>Organización</th>}
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Último Login</th>
                {canWrite('users') && <th style={{ width: 1, whiteSpace: 'nowrap' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const status = getUserStatus(user);
                const isPending = status === 'pending';
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="rh-avatar">
                          {user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <span className="cell-primary">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="cell-muted">{user.email}</td>
                    <td>
                      {(() => {
                        const badgeStyle = getRoleBadgeStyle(user.role_name ?? '');
                        return (
                          <span className="rh-badge" style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.color }}>
                            {user.role_display}
                          </span>
                        );
                      })()}
                    </td>
                    {(isPlatform || isAggregator) && (
                      <td className="cell-muted">{user.org_name ?? '—'}</td>
                    )}
                    <td className="cell-muted">{user.phone ?? '—'}</td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                    <td className="cell-muted">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString('es-VE') : '—'}
                    </td>
                    {canWrite('users') && (
                      <td>
                        <div className="flex items-center gap-2" style={{ whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => setEditUser(user)}
                            className="rh-btn rh-btn-ghost"
                            style={{ padding: '4px 10px', fontSize: 13 }}
                            title="Editar usuario"
                          >
                            ✏️ Editar
                          </button>
                          {isPending && (
                            <button
                              onClick={() => handleResendInvitation(user.id)}
                              disabled={resendLoading === user.id}
                              className="rh-btn rh-btn-ghost"
                              style={{ padding: '4px 10px', fontSize: 13 }}
                              title="Reenviar invitación"
                            >
                              {resendLoading === user.id ? '⏳' : '📧'} Reenviar
                            </button>
                          )}
                          {!isPending && user.id !== currentUserId && (
                            <button
                              onClick={() => handleResendInvitation(user.id)}
                              disabled={resendLoading === user.id}
                              className="rh-btn rh-btn-ghost"
                              style={{ padding: '4px 10px', fontSize: 13 }}
                              title="Enviar reset de contraseña"
                            >
                              {resendLoading === user.id ? '⏳' : '🔑'} Reset
                            </button>
                          )}
                          {canManage('users') && user.id !== currentUserId && (
                            <button
                              onClick={() => setDeleteTarget(user)}
                              className="rh-btn rh-btn-ghost"
                              style={{ padding: '4px 10px', fontSize: 13, color: '#DC2626' }}
                              title="Eliminar usuario"
                            >
                              🗑️ Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      <UserCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadUsers}
      />

      {/* Edit User Modal */}
      <UserEditModal
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={loadUsers}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Eliminar Usuario"
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
      >
        <p style={{ fontWeight: 500, marginBottom: 8 }}>
          ¿Estás seguro que deseas eliminar a este usuario?
        </p>
        {deleteTarget && (
          <p style={{ color: '#8A8886', fontSize: 14, marginBottom: 16 }}>
            <strong>{deleteTarget.full_name}</strong> ({deleteTarget.email})
          </p>
        )}
        <p style={{ color: '#DC2626', fontSize: 13 }}>
          Esta acción es irreversible. Se eliminará el usuario, su perfil y todos sus roles.
        </p>
      </ConfirmDeleteModal>

      {/* Roles & Permissions Matrix (admin only) */}
      {(userRoles.includes('platform_owner') || userRoles.includes('platform_support') || userRoles.includes('aggregator_admin') || userRoles.includes('associate_admin')) && (
        <RolesPermissionsPanel />
      )}
    </div>
  );
}
