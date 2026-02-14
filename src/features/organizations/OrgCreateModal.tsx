import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import { supabase } from '@/lib/supabase.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import type { Organization } from '@/lib/database.types.ts';

interface OrgCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  editOrg?: Organization | null;
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
};

export function OrgCreateModal({ open, onClose, onCreated, editOrg }: OrgCreateModalProps) {
  const { isPlatform } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);

  const isEditing = !!editOrg;
  const orgTypeLabel = isPlatform ? 'Agregador' : 'Asociado';
  const orgType = isPlatform ? 'aggregator' : 'associate';

  // Populate form when editing
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
    setLoading(true);
    setError('');

    const payload = {
      name: form.name,
      type: editOrg?.type ?? orgType,
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

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from('organizations')
        .insert(payload);

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
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
      title={isEditing ? `Editar ${orgTypeLabel}` : `Crear ${orgTypeLabel}`}
      width="600px"
      footer={
        <>
          <button onClick={onClose} className="rh-btn rh-btn-ghost">
            Cancelar
          </button>
          <button
            onClick={(e) => handleSubmit(e as unknown as FormEvent)}
            disabled={loading || !form.name}
            className="rh-btn rh-btn-primary"
          >
            {loading
              ? (isEditing ? 'Guardando...' : 'Creando...')
              : (isEditing ? 'Guardar Cambios' : `Crear ${orgTypeLabel}`)}
          </button>
        </>
      }
    >
      {error && (
        <div className="rh-alert rh-alert-error mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="rh-form-grid">
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
                className="rh-input"
                placeholder={`Nombre del ${orgTypeLabel.toLowerCase()}`}
              />
            </div>
          </div>

          <div className="rh-field">
            <label className="rh-label">RIF</label>
            <input
              type="text"
              value={form.rif}
              onChange={(e) => updateField('rif', e.target.value)}
              className="rh-input"
              placeholder="J-12345678-9"
            />
          </div>

          <div className="rh-field">
            <label className="rh-label">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="rh-input"
              placeholder="contacto@empresa.com"
            />
          </div>

          <div className="rh-field">
            <label className="rh-label">Teléfono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="rh-input"
              placeholder="+58 412 1234567"
            />
          </div>

          <div className="rh-field">
            <label className="rh-label">WhatsApp</label>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => updateField('whatsapp', e.target.value)}
              className="rh-input"
              placeholder="+58 412 1234567"
            />
          </div>

          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Dirección</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="rh-input"
                placeholder="Av. Principal, Local 1"
              />
            </div>
          </div>

          <div className="rh-field">
            <label className="rh-label">Estado</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => updateField('state', e.target.value)}
              className="rh-input"
              placeholder="Miranda"
            />
          </div>

          <div className="rh-field">
            <label className="rh-label">Ciudad</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => updateField('city', e.target.value)}
              className="rh-input"
              placeholder="Caracas"
            />
          </div>

          <div className="rh-field">
            <label className="rh-label">Comisión (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.commission_pct}
              onChange={(e) => updateField('commission_pct', parseFloat(e.target.value) || 0)}
              className="rh-input"
            />
          </div>

          {/* Status selector - only in edit mode */}
          {isEditing && (
            <div className="rh-field">
              <label className="rh-label">Estado</label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="rh-select"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
