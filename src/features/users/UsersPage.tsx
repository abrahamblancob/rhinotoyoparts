import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { callEdgeFunction } from '@/lib/edgeFunction.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import type { Profile, Organization, Role } from '@/lib/database.types.ts';
import { RolesPermissionsPanel } from './RolesPermissionsPanel.tsx';

interface UserWithRole extends Profile {
  role_name?: string;
  role_display?: string;
  role_id?: string;
  org_name?: string;
}

// Derive user status from is_active + last_login
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

  // Create user form
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role_id: '',
    org_id: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Edit user state
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    role_id: '',
    is_active: true,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Resend invitation state
  const [resendLoading, setResendLoading] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState('');

  // Delete user state
  const [deleteTarget, setDeleteTarget] = useState<UserWithRole | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Available roles and orgs for the form
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);

  const loadUsers = async () => {
    setLoading(true);

    // Build list of org IDs this user can see
    let visibleOrgIds: string[] = [];

    if (isPlatform) {
      // Platform sees all — no org filter needed
    } else if (isAggregator && organization) {
      // Aggregator sees own org + child associate orgs
      visibleOrgIds = [organization.id];
      const { data: children } = await supabase
        .from('org_hierarchy')
        .select('child_id')
        .eq('parent_id', organization.id);
      if (children) {
        visibleOrgIds.push(...children.map((c: { child_id: string }) => c.child_id));
      }
    } else if (organization) {
      // Associate sees only own org
      visibleOrgIds = [organization.id];
    }

    // Load profiles with their roles via user_roles → roles join
    let query = supabase
      .from('profiles')
      .select('*, user_roles(role_id, roles(name, display_name))')
      .order('created_at', { ascending: false });

    if (!isPlatform && visibleOrgIds.length > 0) {
      query = query.in('org_id', visibleOrgIds);
    }

    const { data } = await query;

    // Also load org names if platform or aggregator (to show which org each user belongs to)
    let orgMap: Record<string, string> = {};
    if (isPlatform || isAggregator) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name');
      orgMap = Object.fromEntries((orgs ?? []).map((o: { id: string; name: string }) => [o.id, o.name]));
    }

    const mapped: UserWithRole[] = (data ?? []).map((u) => {
      const record = u as Record<string, unknown>;
      const userRoles = record.user_roles as { role_id: string; roles: { name: string; display_name: string } | null }[] | null;
      const firstRole = userRoles?.[0];
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

  const loadFormData = async () => {
    // Load roles filtered by what the current user can assign
    let roleQuery = supabase.from('roles').select('*').order('org_type').order('name');

    if (!isPlatform && !isAggregator) {
      roleQuery = roleQuery.eq('org_type', 'associate');
    } else if (isAggregator) {
      roleQuery = roleQuery.in('org_type', ['aggregator', 'associate']);
    }

    const { data: roles } = await roleQuery;
    setAvailableRoles((roles as Role[]) ?? []);

    if (isPlatform) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .eq('status', 'active')
        .order('name');
      setAvailableOrgs((orgs as Organization[]) ?? []);
    } else if (isAggregator && organization) {
      const { data: children } = await supabase
        .from('org_hierarchy')
        .select('child_id, organizations!org_hierarchy_child_id_fkey(id, name, type, status)')
        .eq('parent_id', organization.id);

      const childOrgs = (children ?? [])
        .map((c: Record<string, unknown>) => c.organizations as Organization | null)
        .filter((o): o is Organization => o !== null && o.status === 'active');

      setAvailableOrgs([organization, ...childOrgs]);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (showCreate) {
      loadFormData();
      setCreateError('');
      setCreateSuccess('');
      setCreateForm((f) => ({
        ...f,
        org_id: organization?.id ?? '',
      }));
    }
  }, [showCreate]);

  // Load form data when opening edit modal too (for role selector)
  useEffect(() => {
    if (editUser) {
      loadFormData();
      setEditError('');
      setEditForm({
        full_name: editUser.full_name,
        phone: editUser.phone ?? '',
        role_id: editUser.role_id ?? '',
        is_active: editUser.is_active,
      });
    }
  }, [editUser]);

  // Filter roles based on selected org's type
  const selectedOrg = availableOrgs.find((o) => o.id === createForm.org_id);
  const selectedOrgType = selectedOrg?.type ?? organization?.type ?? 'associate';
  const filteredRoles = availableRoles.filter((r) => r.org_type === selectedOrgType);

  // For edit: filter roles based on the user's org type
  const editUserOrg = editUser ? availableOrgs.find((o) => o.id === editUser.org_id) : null;
  const editOrgType = editUserOrg?.type ?? organization?.type ?? 'associate';
  const editFilteredRoles = availableRoles.filter((r) => r.org_type === editOrgType);

  // Reset role when org changes and role doesn't match
  useEffect(() => {
    if (createForm.role_id) {
      const roleStillValid = filteredRoles.some((r) => r.id === createForm.role_id);
      if (!roleStillValid) {
        setCreateForm((f) => ({ ...f, role_id: '' }));
      }
    }
  }, [createForm.org_id, filteredRoles]);

  const filteredUsers = users.filter(
    (u) =>
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.role_display ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Create User Handler ─────────────────────────────────
  const handleCreateUser = async () => {
    setCreateLoading(true);
    setCreateError('');
    setCreateSuccess('');

    const targetOrgId = createForm.org_id || organization?.id;
    if (!targetOrgId) {
      setCreateError('Selecciona una organización');
      setCreateLoading(false);
      return;
    }

    if (!createForm.role_id) {
      setCreateError('Selecciona un rol');
      setCreateLoading(false);
      return;
    }

    let fnData: { error?: string; success?: boolean; message?: string; user_id?: string };
    try {
      fnData = await callEdgeFunction<typeof fnData>('create-user', {
        email: createForm.email,
        full_name: createForm.full_name,
        phone: createForm.phone || null,
        org_id: targetOrgId,
        role_id: createForm.role_id,
      });
    } catch (err) {
      setCreateError((err as Error).message);
      setCreateLoading(false);
      return;
    }

    if (fnData?.error) {
      setCreateError(fnData.error);
      setCreateLoading(false);
      if (fnData.user_id) loadUsers();
      return;
    }

    setCreateSuccess(fnData?.message || `Invitación enviada a ${createForm.email}`);
    setCreateLoading(false);
    setCreateForm({ full_name: '', email: '', phone: '', role_id: '', org_id: organization?.id ?? '' });
    loadUsers();

    setTimeout(() => {
      setShowCreate(false);
      setCreateSuccess('');
    }, 3000);
  };

  // ── Edit User Handler ─────────────────────────────────
  const handleEditUser = async () => {
    if (!editUser) return;
    setEditLoading(true);
    setEditError('');

    // Update profile
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name,
        phone: editForm.phone || null,
        is_active: editForm.is_active,
      })
      .eq('id', editUser.id);

    if (profileErr) {
      setEditError(`Error al actualizar perfil: ${profileErr.message}`);
      setEditLoading(false);
      return;
    }

    // Update role if changed
    if (editForm.role_id && editForm.role_id !== editUser.role_id) {
      // Delete old role assignment
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', editUser.id);

      // Insert new role
      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({ user_id: editUser.id, role_id: editForm.role_id });

      if (roleErr) {
        setEditError(`Perfil actualizado, pero error al cambiar rol: ${roleErr.message}`);
        setEditLoading(false);
        loadUsers();
        return;
      }
    }

    setEditLoading(false);
    setEditUser(null);
    loadUsers();
  };

  // ── Resend Invitation Handler ─────────────────────────────────
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

  // ── Delete User Handler ─────────────────────────────────
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

  const showOrgSelector = isPlatform || isAggregator;
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

      {/* Resend notification toast */}
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
                      <span className="rh-badge" style={{
                        backgroundColor: user.role_name?.includes('viewer')
                          ? '#F0F0EF'
                          : user.role_name?.includes('admin') || user.role_name?.includes('owner')
                            ? 'rgba(211, 1, 10, 0.08)'
                            : 'rgba(99, 102, 241, 0.08)',
                        color: user.role_name?.includes('viewer')
                          ? '#8A8886'
                          : user.role_name?.includes('admin') || user.role_name?.includes('owner')
                            ? '#D3010A'
                            : '#6366F1',
                      }}>
                        {user.role_display}
                      </span>
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

      {/* ── Create User Modal ──────────────────────────────── */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setCreateError('');
          setCreateSuccess('');
        }}
        title="Invitar Usuario"
        width="560px"
        footer={
          createSuccess ? (
            <button
              onClick={() => {
                setShowCreate(false);
                setCreateSuccess('');
              }}
              className="rh-btn rh-btn-primary"
            >
              Cerrar
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setCreateError('');
                }}
                className="rh-btn rh-btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                disabled={createLoading || !createForm.full_name || !createForm.email || !createForm.role_id}
                className="rh-btn rh-btn-primary"
              >
                {createLoading ? 'Enviando invitación...' : 'Enviar Invitación'}
              </button>
            </>
          )
        }
      >
        {createSuccess ? (
          <div className="rh-alert rh-alert-success">
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 500, marginBottom: 4 }}>Invitación enviada</p>
            <p className="rh-hint">{createSuccess}</p>
          </div>
        ) : (
          <>
            {createError && (
              <div className="rh-alert rh-alert-error mb-4">
                {createError}
              </div>
            )}

            <p className="rh-hint" style={{ marginBottom: 16 }}>
              El usuario recibirá un correo electrónico con un enlace para establecer su contraseña y acceder al sistema.
            </p>

            <div className="rh-form-grid">
              {/* Name - full width */}
              <div className="col-span-2">
                <div className="rh-field">
                  <label className="rh-label">Nombre completo *</label>
                  <input
                    type="text"
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
                    className="rh-input"
                    placeholder="Juan Pérez"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="rh-field">
                <label className="rh-label">Email *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  className="rh-input"
                  placeholder="juan@empresa.com"
                />
              </div>

              {/* Phone */}
              <div className="rh-field">
                <label className="rh-label">Teléfono</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  className="rh-input"
                  placeholder="+58 412 1234567"
                />
              </div>

              {/* Organization selector - only for platform/aggregator */}
              {showOrgSelector && (
                <div className="rh-field">
                  <label className="rh-label">Organización *</label>
                  <select
                    value={createForm.org_id}
                    onChange={(e) => setCreateForm((f) => ({ ...f, org_id: e.target.value }))}
                    className="rh-select"
                  >
                    <option value="">Seleccionar organización</option>
                    {availableOrgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.type === 'platform' ? 'Plataforma' : org.type === 'aggregator' ? 'Agregador' : 'Asociado'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Role selector */}
              <div className="rh-field">
                <label className="rh-label">Rol *</label>
                <select
                  value={createForm.role_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role_id: e.target.value }))}
                  className="rh-select"
                  disabled={showOrgSelector && !createForm.org_id}
                >
                  <option value="">
                    {showOrgSelector && !createForm.org_id
                      ? 'Selecciona organización primero'
                      : 'Seleccionar rol'}
                  </option>
                  {filteredRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.display_name}
                      {role.description ? ` — ${role.description}` : ''}
                    </option>
                  ))}
                </select>
                {createForm.role_id && (
                  <p className="rh-hint">
                    {filteredRoles.find((r) => r.id === createForm.role_id)?.description ?? ''}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* ── Edit User Modal ──────────────────────────────── */}
      <Modal
        open={!!editUser}
        onClose={() => {
          setEditUser(null);
          setEditError('');
        }}
        title="Editar Usuario"
        width="500px"
        footer={
          <>
            <button
              onClick={() => {
                setEditUser(null);
                setEditError('');
              }}
              className="rh-btn rh-btn-ghost"
            >
              Cancelar
            </button>
            <button
              onClick={handleEditUser}
              disabled={editLoading || !editForm.full_name}
              className="rh-btn rh-btn-primary"
            >
              {editLoading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </>
        }
      >
        {editError && (
          <div className="rh-alert rh-alert-error mb-4">
            {editError}
          </div>
        )}

        {editUser && (
          <div className="rh-form-grid">
            {/* Name */}
            <div className="col-span-2">
              <div className="rh-field">
                <label className="rh-label">Nombre completo *</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="rh-input"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="rh-field">
              <label className="rh-label">Email</label>
              <input
                type="email"
                value={editUser.email}
                disabled
                className="rh-input"
                style={{ opacity: 0.6 }}
              />
              <p className="rh-hint">El email no se puede cambiar</p>
            </div>

            {/* Phone */}
            <div className="rh-field">
              <label className="rh-label">Teléfono</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                className="rh-input"
                placeholder="+58 412 1234567"
              />
            </div>

            {/* Role selector */}
            <div className="rh-field">
              <label className="rh-label">Rol</label>
              <select
                value={editForm.role_id}
                onChange={(e) => setEditForm((f) => ({ ...f, role_id: e.target.value }))}
                className="rh-select"
              >
                <option value="">Sin rol</option>
                {editFilteredRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.display_name}
                    {role.description ? ` — ${role.description}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Status toggle */}
            <div className="rh-field">
              <label className="rh-label">Estado</label>
              <select
                value={editForm.is_active ? 'active' : 'inactive'}
                onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.value === 'active' }))}
                className="rh-select"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo (suspendido)</option>
              </select>
              <p className="rh-hint">
                {getUserStatus(editUser) === 'pending'
                  ? 'Este usuario aún no ha iniciado sesión. Se activará automáticamente cuando lo haga.'
                  : 'Desactiva al usuario para revocar su acceso al sistema.'}
              </p>
            </div>

            {/* Info section */}
            <div className="col-span-2" style={{ borderTop: '1px solid #E2E0DE', paddingTop: 12, marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#8A8886' }}>
                <div>
                  <strong>Organización:</strong> {editUser.org_name ?? organization?.name ?? '—'}
                </div>
                <div>
                  <strong>Creado:</strong> {new Date(editUser.created_at).toLocaleDateString('es-VE')}
                </div>
                <div>
                  <strong>Último login:</strong> {editUser.last_login ? new Date(editUser.last_login).toLocaleDateString('es-VE') : 'Nunca'}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ──────────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar Usuario"
        width="440px"
        footer={
          <>
            <button
              onClick={() => setDeleteTarget(null)}
              className="rh-btn rh-btn-ghost"
              disabled={deleteLoading}
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteUser}
              disabled={deleteLoading}
              className="rh-btn"
              style={{ backgroundColor: '#DC2626', color: '#fff', border: 'none' }}
            >
              {deleteLoading ? 'Eliminando...' : 'Sí, Eliminar'}
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontWeight: 500, marginBottom: 8 }}>
              ¿Estás seguro que deseas eliminar a este usuario?
            </p>
            <p style={{ color: '#8A8886', fontSize: 14, marginBottom: 16 }}>
              <strong>{deleteTarget.full_name}</strong> ({deleteTarget.email})
            </p>
            <p style={{ color: '#DC2626', fontSize: 13 }}>
              Esta acción es irreversible. Se eliminará el usuario, su perfil y todos sus roles.
            </p>
          </div>
        )}
      </Modal>

      {/* ── Roles & Permissions Matrix (admin only) ──────────────── */}
      {(userRoles.includes('platform_owner') || userRoles.includes('platform_support') || userRoles.includes('aggregator_admin') || userRoles.includes('associate_admin')) && (
        <RolesPermissionsPanel />
      )}
    </div>
  );
}
