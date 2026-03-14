import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { callEdgeFunction } from '@/lib/edgeFunction.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import type { Role, Organization } from '@/lib/database.types.ts';

interface UserCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function UserCreateModal({ open, onClose, onCreated }: UserCreateModalProps) {
  const { isPlatform, isAggregator } = usePermissions();
  const organization = useAuthStore((s) => s.organization);
  const showOrgSelector = isPlatform || isAggregator;

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role_id: '',
    org_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    if (open) {
      loadFormData();
      setError('');
      setSuccess('');
      setForm({ full_name: '', email: '', phone: '', role_id: '', org_id: organization?.id ?? '' });
    }
  }, [open]);

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

  // Filter roles based on selected org type
  // Aggregator admins can assign both aggregator and associate roles
  const selectedOrg = availableOrgs.find((o) => o.id === form.org_id);
  const selectedOrgType = selectedOrg?.type ?? organization?.type ?? 'associate';
  const filteredRoles = (isPlatform || isAggregator) && selectedOrgType === 'aggregator'
    ? availableRoles.filter((r) => ['aggregator', 'associate'].includes(r.org_type))
    : availableRoles.filter((r) => r.org_type === selectedOrgType);

  // Reset role when org changes and role doesn't match
  useEffect(() => {
    if (form.role_id) {
      const roleStillValid = filteredRoles.some((r) => r.id === form.role_id);
      if (!roleStillValid) {
        setForm((f) => ({ ...f, role_id: '' }));
      }
    }
  }, [form.org_id, filteredRoles]);

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    const targetOrgId = form.org_id || organization?.id;
    if (!targetOrgId) {
      setError('Selecciona una organización');
      setLoading(false);
      return;
    }

    if (!form.role_id) {
      setError('Selecciona un rol');
      setLoading(false);
      return;
    }

    let fnData: { error?: string; success?: boolean; message?: string; user_id?: string };
    try {
      fnData = await callEdgeFunction<typeof fnData>('create-user', {
        email: form.email,
        full_name: form.full_name,
        phone: form.phone || null,
        org_id: targetOrgId,
        role_id: form.role_id,
      });
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
      return;
    }

    if (fnData?.error) {
      setError(fnData.error);
      setLoading(false);
      if (fnData.user_id) onCreated();
      return;
    }

    setSuccess(fnData?.message || `Invitación enviada a ${form.email}`);
    setLoading(false);
    setForm({ full_name: '', email: '', phone: '', role_id: '', org_id: organization?.id ?? '' });
    onCreated();

    setTimeout(() => {
      onClose();
      setSuccess('');
    }, 3000);
  };

  const handleClose = () => {
    onClose();
    setError('');
    setSuccess('');
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Invitar Usuario"
      width="560px"
      footer={
        success ? (
          <button onClick={handleClose} className="rh-btn rh-btn-primary">
            Cerrar
          </button>
        ) : (
          <>
            <button onClick={handleClose} className="rh-btn rh-btn-ghost">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !form.full_name || !form.email || !form.role_id}
              className="rh-btn rh-btn-primary"
            >
              {loading ? 'Enviando invitación...' : 'Enviar Invitación'}
            </button>
          </>
        )
      }
    >
      {success ? (
        <div className="rh-alert rh-alert-success">
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <p style={{ fontWeight: 500, marginBottom: 4 }}>Invitación enviada</p>
          <p className="rh-hint">{success}</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="rh-alert rh-alert-error mb-4">{error}</div>
          )}

          <p className="rh-hint" style={{ marginBottom: 16 }}>
            El usuario recibirá un correo electrónico con un enlace para establecer su contraseña y acceder al sistema.
          </p>

          <div className="rh-form-grid">
            <div className="col-span-2">
              <div className="rh-field">
                <label className="rh-label">Nombre completo *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="rh-input"
                  placeholder="Juan Perez"
                />
              </div>
            </div>

            <div className="rh-field">
              <label className="rh-label">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="rh-input"
                placeholder="juan@empresa.com"
              />
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

            {showOrgSelector && (
              <div className="rh-field">
                <label className="rh-label">Organización *</label>
                <select
                  value={form.org_id}
                  onChange={(e) => setForm((f) => ({ ...f, org_id: e.target.value }))}
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

            <div className="rh-field">
              <label className="rh-label">Rol *</label>
              <select
                value={form.role_id}
                onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
                className="rh-select"
                disabled={showOrgSelector && !form.org_id}
              >
                <option value="">
                  {showOrgSelector && !form.org_id
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
              {form.role_id && (
                <p className="rh-hint">
                  {filteredRoles.find((r) => r.id === form.role_id)?.description ?? ''}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
