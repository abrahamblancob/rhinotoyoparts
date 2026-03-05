import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import type { Role, Organization, Profile } from '@/lib/database.types.ts';

interface UserWithRole extends Profile {
  role_name?: string;
  role_display?: string;
  role_id?: string;
  org_name?: string;
}

function getUserStatus(user: UserWithRole): 'active' | 'pending' | 'inactive' {
  if (!user.is_active && !user.last_login) return 'pending';
  if (!user.is_active) return 'inactive';
  return 'active';
}

interface UserEditModalProps {
  user: UserWithRole | null;
  onClose: () => void;
  onSaved: () => void;
}

export function UserEditModal({ user, onClose, onSaved }: UserEditModalProps) {
  const { isPlatform, isAggregator } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    role_id: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    if (user) {
      loadFormData();
      setError('');
      setForm({
        full_name: user.full_name,
        phone: user.phone ?? '',
        role_id: user.role_id ?? '',
        is_active: user.is_active,
      });
    }
  }, [user]);

  const loadFormData = async () => {
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

  // Filter roles based on the user's org type
  const editUserOrg = user ? availableOrgs.find((o) => o.id === user.org_id) : null;
  const editOrgType = editUserOrg?.type ?? organization?.type ?? 'associate';
  const filteredRoles = availableRoles.filter((r) => r.org_type === editOrgType);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        is_active: form.is_active,
      })
      .eq('id', user.id);

    if (profileErr) {
      setError(`Error al actualizar perfil: ${profileErr.message}`);
      setLoading(false);
      return;
    }

    if (form.role_id && form.role_id !== user.role_id) {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role_id: form.role_id });

      if (roleErr) {
        setError(`Perfil actualizado, pero error al cambiar rol: ${roleErr.message}`);
        setLoading(false);
        onSaved();
        return;
      }
    }

    setLoading(false);
    onClose();
    onSaved();
  };

  const handleClose = () => {
    onClose();
    setError('');
  };

  return (
    <Modal
      open={!!user}
      onClose={handleClose}
      title="Editar Usuario"
      width="500px"
      footer={
        <>
          <button onClick={handleClose} className="rh-btn rh-btn-ghost">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !form.full_name}
            className="rh-btn rh-btn-primary"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </>
      }
    >
      {error && (
        <div className="rh-alert rh-alert-error mb-4">{error}</div>
      )}

      {user && (
        <div className="rh-form-grid">
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Nombre completo *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="rh-input"
              />
            </div>
          </div>

          <div className="rh-field">
            <label className="rh-label">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="rh-input"
              style={{ opacity: 0.6 }}
            />
            <p className="rh-hint">El email no se puede cambiar</p>
          </div>

          <div className="rh-field">
            <label className="rh-label">Teléfono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="rh-input"
              placeholder="+58 412 1234567"
            />
          </div>

          <div className="rh-field">
            <label className="rh-label">Rol</label>
            <select
              value={form.role_id}
              onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
              className="rh-select"
            >
              <option value="">Sin rol</option>
              {filteredRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.display_name}
                  {role.description ? ` — ${role.description}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="rh-field">
            <label className="rh-label">Estado</label>
            <select
              value={form.is_active ? 'active' : 'inactive'}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === 'active' }))}
              className="rh-select"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo (suspendido)</option>
            </select>
            <p className="rh-hint">
              {getUserStatus(user) === 'pending'
                ? 'Este usuario aún no ha iniciado sesión. Se activará automáticamente cuando lo haga.'
                : 'Desactiva al usuario para revocar su acceso al sistema.'}
            </p>
          </div>

          <div className="col-span-2" style={{ borderTop: '1px solid #E2E0DE', paddingTop: 12, marginTop: 4 }}>
            <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#8A8886' }}>
              <div>
                <strong>Organización:</strong> {user.org_name ?? organization?.name ?? '—'}
              </div>
              <div>
                <strong>Creado:</strong> {new Date(user.created_at).toLocaleDateString('es-VE')}
              </div>
              <div>
                <strong>Último login:</strong> {user.last_login ? new Date(user.last_login).toLocaleDateString('es-VE') : 'Nunca'}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export type { UserWithRole };
