import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import { supabase } from '@/lib/supabase.ts';
import type { Organization } from '@/lib/database.types.ts';
import { logActivity } from '@/services/activityLogService.ts';

interface AssociateCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  editOrg?: (Organization & { parent_id?: string | null }) | null;
  aggregators: { id: string; name: string }[];
}

const emptyForm = {
  name: '',
  rif: '',
  email: '',
  phone: '',
  whatsapp: '',
  address: '',
  state: '',
  city: '',
  commission_pct: 15,
  status: 'active' as string,
  aggregator_id: '',
};

export function AssociateCreateModal({ open, onClose, onCreated, editOrg, aggregators }: AssociateCreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);

  const isEditing = !!editOrg;

  useEffect(() => {
    if (open && editOrg) {
      setForm({
        name: editOrg.name ?? '',
        rif: editOrg.rif ?? '',
        email: editOrg.email ?? '',
        phone: editOrg.phone ?? '',
        whatsapp: editOrg.whatsapp ?? '',
        address: editOrg.address ?? '',
        state: editOrg.state ?? '',
        city: editOrg.city ?? '',
        commission_pct: editOrg.commission_pct ?? 15,
        status: editOrg.status ?? 'active',
        aggregator_id: (editOrg as { parent_id?: string | null }).parent_id ?? '',
      });
      setError('');
    } else if (open && !editOrg) {
      setForm(emptyForm);
      setError('');
    }
  }, [open, editOrg]);

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.aggregator_id) {
      setError('Debes seleccionar un agregador');
      return;
    }
    setLoading(true);
    setError('');

    const payload = {
      name: form.name,
      type: 'associate' as const,
      rif: form.rif || null,
      email: form.email || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      address: form.address || null,
      state: form.state || null,
      city: form.city || null,
      commission_pct: form.commission_pct,
      status: form.status,
    };

    if (isEditing) {
      const { error: updateError } = await supabase
        .from('organizations')
        .update(payload)
        .eq('id', editOrg.id);

      if (updateError) { setError(updateError.message); setLoading(false); return; }

      // Update hierarchy if aggregator changed
      const oldParent = (editOrg as { parent_id?: string | null }).parent_id;
      if (oldParent !== form.aggregator_id) {
        // Remove old hierarchy
        if (oldParent) {
          await supabase.from('org_hierarchy').delete()
            .eq('child_id', editOrg.id).eq('parent_id', oldParent);
        }
        // Insert new hierarchy
        await supabase.from('org_hierarchy').upsert({
          parent_id: form.aggregator_id,
          child_id: editOrg.id,
        }, { onConflict: 'parent_id,child_id' });
      }

      logActivity({
        action: 'update', entityType: 'organization', entityId: editOrg.id,
        description: `Actualizó asociado ${payload.name}`,
      });
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('organizations')
        .insert(payload)
        .select('id')
        .single();

      if (insertError) { setError(insertError.message); setLoading(false); return; }

      // Create hierarchy link
      await supabase.from('org_hierarchy').insert({
        parent_id: form.aggregator_id,
        child_id: inserted.id,
      });

      logActivity({
        action: 'create', entityType: 'organization', entityId: inserted.id,
        description: `Creó asociado ${payload.name}`,
      });
    }

    setLoading(false);
    setForm(emptyForm);
    onCreated();
    onClose();
  };

  const statusOptions = [
    { value: 'active', label: 'Activo' },
    { value: 'suspended', label: 'Suspendido' },
    { value: 'pending', label: 'Pendiente' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar Asociado' : 'Crear Asociado'}
      width="600px"
      footer={
        <>
          <button onClick={onClose} className="rh-btn rh-btn-ghost">Cancelar</button>
          <button
            onClick={(e) => handleSubmit(e as unknown as FormEvent)}
            disabled={loading || !form.name || !form.aggregator_id}
            className="rh-btn rh-btn-primary"
          >
            {loading
              ? (isEditing ? 'Guardando...' : 'Creando...')
              : (isEditing ? 'Guardar Cambios' : 'Crear Asociado')}
          </button>
        </>
      }
    >
      {error && <div className="rh-alert rh-alert-error mb-4">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="rh-form-grid">
          {/* Aggregator selector */}
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Agregador *</label>
              <select
                value={form.aggregator_id}
                onChange={(e) => updateField('aggregator_id', e.target.value)}
                className="rh-select"
                required
              >
                <option value="">Seleccionar agregador...</option>
                {aggregators.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
                className="rh-input"
                placeholder="Nombre del asociado"
              />
            </div>
          </div>

          <div className="rh-field">
            <label className="rh-label">RIF</label>
            <input type="text" value={form.rif} onChange={(e) => updateField('rif', e.target.value)} className="rh-input" placeholder="J-12345678-9" />
          </div>

          <div className="rh-field">
            <label className="rh-label">Email</label>
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="rh-input" placeholder="contacto@empresa.com" />
          </div>

          <div className="rh-field">
            <label className="rh-label">Teléfono</label>
            <input type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="rh-input" placeholder="+58 412 1234567" />
          </div>

          <div className="rh-field">
            <label className="rh-label">WhatsApp</label>
            <input type="tel" value={form.whatsapp} onChange={(e) => updateField('whatsapp', e.target.value)} className="rh-input" placeholder="+58 412 1234567" />
          </div>

          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Dirección</label>
              <input type="text" value={form.address} onChange={(e) => updateField('address', e.target.value)} className="rh-input" placeholder="Av. Principal, Local 1" />
            </div>
          </div>

          <div className="rh-field">
            <label className="rh-label">Estado</label>
            <input type="text" value={form.state} onChange={(e) => updateField('state', e.target.value)} className="rh-input" placeholder="Miranda" />
          </div>

          <div className="rh-field">
            <label className="rh-label">Ciudad</label>
            <input type="text" value={form.city} onChange={(e) => updateField('city', e.target.value)} className="rh-input" placeholder="Caracas" />
          </div>

          <div className="rh-field">
            <label className="rh-label">Comisión (%)</label>
            <input type="number" min={0} max={100} step={0.5} value={form.commission_pct} onChange={(e) => updateField('commission_pct', parseFloat(e.target.value) || 0)} className="rh-input" />
          </div>

          {isEditing && (
            <div className="rh-field">
              <label className="rh-label">Estado</label>
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className="rh-select">
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
