import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import type { Customer } from '@/lib/database.types.ts';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const { canWrite } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  const [form, setForm] = useState({ name: '', rif: '', email: '', phone: '', whatsapp: '', address: '', city: '', state: '', notes: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadCustomers = async () => {
    setLoading(true);
    let query = supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (organization) {
      query = query.eq('org_id', organization.id);
    }
    const { data } = await query;
    setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadCustomers(); }, []);

  const filtered = customers.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.rif ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!organization) return;
    setCreateLoading(true);
    setCreateError('');

    const { error } = await supabase.from('customers').insert({
      org_id: organization.id,
      name: form.name,
      rif: form.rif || null,
      email: form.email || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      notes: form.notes || null,
    });

    if (error) {
      setCreateError(error.message);
      setCreateLoading(false);
      return;
    }

    setCreateLoading(false);
    setForm({ name: '', rif: '', email: '', phone: '', whatsapp: '', address: '', city: '', state: '', notes: '' });
    setShowCreate(false);
    loadCustomers();
  };

  return (
    <div>
      <div className="rh-page-header">
        <h1 className="rh-page-title">Clientes</h1>
        <div className="rh-page-actions">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rh-search"
          />
          {canWrite('customers') && (
            <button
              onClick={() => setShowCreate(true)}
              className="rh-btn rh-btn-primary"
            >
              + Nuevo Cliente
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="👤"
          title="No hay clientes"
          description="Agrega clientes para gestionar tus ventas"
          actionLabel="Agregar Cliente"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RIF</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Ciudad</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id} className="cursor-pointer">
                  <td className="cell-primary">{customer.name}</td>
                  <td className="cell-muted">{customer.rif ?? '—'}</td>
                  <td className="cell-muted">{customer.email ?? '—'}</td>
                  <td className="cell-muted">{customer.phone ?? '—'}</td>
                  <td className="cell-muted">{customer.city ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nuevo Cliente"
        width="600px"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="rh-btn rh-btn-ghost">
              Cancelar
            </button>
            <button onClick={handleCreate} disabled={createLoading || !form.name} className="rh-btn rh-btn-primary">
              {createLoading ? 'Creando...' : 'Crear Cliente'}
            </button>
          </>
        }
      >
        {createError && (
          <div className="rh-alert rh-alert-error mb-4">{createError}</div>
        )}
        <div className="rh-form-grid">
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Nombre *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rh-input" placeholder="Nombre del cliente" />
            </div>
          </div>
          <div className="rh-field">
            <label className="rh-label">RIF</label>
            <input type="text" value={form.rif} onChange={(e) => setForm((f) => ({ ...f, rif: e.target.value }))} className="rh-input" placeholder="J-12345678-9" />
          </div>
          <div className="rh-field">
            <label className="rh-label">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="rh-input" placeholder="cliente@email.com" />
          </div>
          <div className="rh-field">
            <label className="rh-label">Teléfono</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="rh-input" placeholder="+58 412 1234567" />
          </div>
          <div className="rh-field">
            <label className="rh-label">WhatsApp</label>
            <input type="tel" value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} className="rh-input" placeholder="+58 412 1234567" />
          </div>
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Dirección</label>
              <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="rh-input" placeholder="Dirección completa" />
            </div>
          </div>
          <div className="rh-field">
            <label className="rh-label">Estado</label>
            <input type="text" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="rh-input" placeholder="Miranda" />
          </div>
          <div className="rh-field">
            <label className="rh-label">Ciudad</label>
            <input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="rh-input" placeholder="Caracas" />
          </div>
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Notas</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="rh-input resize-none" rows={3} placeholder="Notas adicionales" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
