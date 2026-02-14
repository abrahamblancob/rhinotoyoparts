import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';

export function SettingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const organization = useAuthStore((s) => s.organization);
  const { canManage, isPlatform, isAggregator } = usePermissions();

  const [orgForm, setOrgForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    state: '',
    city: '',
    commission_pct: 0,
  });
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (organization) {
      setOrgForm({
        name: organization.name ?? '',
        email: organization.email ?? '',
        phone: organization.phone ?? '',
        whatsapp: organization.whatsapp ?? '',
        address: organization.address ?? '',
        state: organization.state ?? '',
        city: organization.city ?? '',
        commission_pct: organization.commission_pct ?? 0,
      });
    }
    if (profile) {
      setProfileForm({
        full_name: profile.full_name ?? '',
        phone: profile.phone ?? '',
      });
    }
  }, [organization, profile]);

  const saveOrgSettings = async () => {
    if (!organization) return;
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('organizations')
      .update({
        name: orgForm.name,
        email: orgForm.email || null,
        phone: orgForm.phone || null,
        whatsapp: orgForm.whatsapp || null,
        address: orgForm.address || null,
        state: orgForm.state || null,
        city: orgForm.city || null,
        commission_pct: orgForm.commission_pct,
      })
      .eq('id', organization.id);

    setSaving(false);
    setMessage(error ? `Error: ${error.message}` : 'Configuración guardada correctamente');
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileForm.full_name,
        phone: profileForm.phone || null,
      })
      .eq('id', profile.id);

    setSaving(false);
    setMessage(error ? `Error: ${error.message}` : 'Perfil actualizado correctamente');
  };

  return (
    <div className="max-w-3xl">
      <div className="rh-page-header">
        <h1 className="rh-page-title">Configuración</h1>
        <p className="rh-page-subtitle">Gestiona la configuración de tu organización y perfil</p>
      </div>

      {message && (
        <div
          className={`rh-alert ${message.startsWith('Error') ? 'rh-alert-error' : 'rh-alert-success'} mb-6`}
        >
          {message}
        </div>
      )}

      {/* Profile section */}
      <div className="rh-settings-section">
        <h2 className="rh-settings-section-title">Mi Perfil</h2>
        <div className="rh-form-grid">
          <div className="rh-field">
            <label className="rh-label">Nombre completo</label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
              className="rh-input"
            />
          </div>
          <div className="rh-field">
            <label className="rh-label">Teléfono</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
              className="rh-input"
            />
          </div>
          <div className="rh-field">
            <label className="rh-label-muted">Email</label>
            <input
              type="email"
              value={profile?.email ?? ''}
              disabled
              className="rh-input opacity-60"
            />
          </div>
        </div>
        <button
          onClick={saveProfile}
          disabled={saving}
          className="rh-btn rh-btn-primary mt-4"
        >
          {saving ? 'Guardando...' : 'Guardar Perfil'}
        </button>
      </div>

      {/* Organization section */}
      {canManage('settings') && (
        <div className="rh-settings-section">
          <h2 className="rh-settings-section-title">
            {isPlatform ? 'Plataforma' : isAggregator ? 'Mi Agregador' : 'Mi Empresa'}
          </h2>
          <div className="rh-form-grid">
            <div className="col-span-2">
              <div className="rh-field">
                <label className="rh-label">Nombre</label>
                <input type="text" value={orgForm.name} onChange={(e) => setOrgForm((f) => ({ ...f, name: e.target.value }))} className="rh-input" />
              </div>
            </div>
            <div className="rh-field">
              <label className="rh-label">Email</label>
              <input type="email" value={orgForm.email} onChange={(e) => setOrgForm((f) => ({ ...f, email: e.target.value }))} className="rh-input" />
            </div>
            <div className="rh-field">
              <label className="rh-label">Teléfono</label>
              <input type="tel" value={orgForm.phone} onChange={(e) => setOrgForm((f) => ({ ...f, phone: e.target.value }))} className="rh-input" />
            </div>
            <div className="rh-field">
              <label className="rh-label">WhatsApp</label>
              <input type="tel" value={orgForm.whatsapp} onChange={(e) => setOrgForm((f) => ({ ...f, whatsapp: e.target.value }))} className="rh-input" />
            </div>
            <div className="col-span-2">
              <div className="rh-field">
                <label className="rh-label">Dirección</label>
                <input type="text" value={orgForm.address} onChange={(e) => setOrgForm((f) => ({ ...f, address: e.target.value }))} className="rh-input" />
              </div>
            </div>
            <div className="rh-field">
              <label className="rh-label">Estado</label>
              <input type="text" value={orgForm.state} onChange={(e) => setOrgForm((f) => ({ ...f, state: e.target.value }))} className="rh-input" />
            </div>
            <div className="rh-field">
              <label className="rh-label">Ciudad</label>
              <input type="text" value={orgForm.city} onChange={(e) => setOrgForm((f) => ({ ...f, city: e.target.value }))} className="rh-input" />
            </div>
            {(isPlatform || isAggregator) && (
              <div className="rh-field">
                <label className="rh-label">Comisión (%)</label>
                <input type="number" min={0} max={100} step={0.5} value={orgForm.commission_pct} onChange={(e) => setOrgForm((f) => ({ ...f, commission_pct: parseFloat(e.target.value) || 0 }))} className="rh-input" />
              </div>
            )}
          </div>
          <button
            onClick={saveOrgSettings}
            disabled={saving}
            className="rh-btn rh-btn-primary mt-4"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      )}
    </div>
  );
}
