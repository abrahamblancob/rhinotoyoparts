import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete.tsx';
import type { Customer, Organization } from '@/lib/database.types.ts';

const emptyForm = { name: '', rif: '', email: '', phone: '', whatsapp: '', address: '', city: '', state: '', notes: '', lat: null as number | null, lng: null as number | null };

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { canWrite, isPlatformOwner } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  const [form, setForm] = useState({ ...emptyForm });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Org name cache for Super Admin view
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});

  const isEditMode = Boolean(editCustomer);

  // ── Load customers ──
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    // Regular users: filter by their org. Super Admin: RLS returns all.
    if (!isPlatformOwner && organization) {
      query = query.eq('org_id', organization.id);
    }

    const { data } = await query;
    const list = (data as Customer[]) ?? [];
    setCustomers(list);
    setLoading(false);

    // Load org names for Super Admin
    if (isPlatformOwner && list.length > 0) {
      const uniqueOrgIds = [...new Set(list.map((c) => c.org_id))];
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', uniqueOrgIds);
      if (orgs) {
        const map: Record<string, string> = {};
        (orgs as Organization[]).forEach((o) => { map[o.id] = o.name; });
        setOrgNames(map);
      }
    }
  }, [isPlatformOwner, organization]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  // ── Filtered list ──
  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.rif ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(search) ||
      (c.city ?? '').toLowerCase().includes(q)
    );
  });

  // ── Open create modal ──
  const openCreate = () => {
    setEditCustomer(null);
    setForm({ ...emptyForm });
    setSaveError('');
    setShowModal(true);
  };

  // ── Open edit modal ──
  const openEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setForm({
      name: customer.name,
      rif: customer.rif ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      whatsapp: customer.whatsapp ?? '',
      address: customer.address ?? '',
      city: customer.city ?? '',
      state: customer.state ?? '',
      notes: customer.notes ?? '',
      lat: customer.lat ?? null,
      lng: customer.lng ?? null,
    });
    setSaveError('');
    setShowModal(true);
  };

  // ── Save (create or edit) ──
  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaveLoading(true);
    setSaveError('');

    const payload = {
      name: form.name.trim(),
      rif: form.rif || null,
      email: form.email || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      notes: form.notes || null,
      lat: form.lat,
      lng: form.lng,
    };

    if (isEditMode && editCustomer) {
      // UPDATE
      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', editCustomer.id);

      if (error) {
        setSaveError(error.message);
        setSaveLoading(false);
        return;
      }
    } else {
      // INSERT — need org_id
      const orgId = organization?.id;
      if (!orgId) {
        setSaveError('No se pudo determinar la organizacion');
        setSaveLoading(false);
        return;
      }

      const { error } = await supabase
        .from('customers')
        .insert({ ...payload, org_id: orgId });

      if (error) {
        setSaveError(error.message);
        setSaveLoading(false);
        return;
      }
    }

    setSaveLoading(false);
    setShowModal(false);
    setEditCustomer(null);
    setForm({ ...emptyForm });
    loadCustomers();
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);

    await supabase.from('customers').delete().eq('id', deleteConfirm.id);

    setDeleteLoading(false);
    setDeleteConfirm(null);
    loadCustomers();
  };

  // ── Close modal ──
  const closeModal = () => {
    setShowModal(false);
    setEditCustomer(null);
    setForm({ ...emptyForm });
    setSaveError('');
  };

  return (
    <div>
      <div className="rh-page-header">
        <h1 className="rh-page-title">Clientes</h1>
        <div className="rh-page-actions">
          <input
            type="text"
            placeholder="Buscar por nombre, RIF, email, telefono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rh-search"
          />
          {canWrite('customers') && (
            <button onClick={openCreate} className="rh-btn rh-btn-primary">
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
          onAction={openCreate}
        />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RIF / Cedula</th>
                <th>Telefono</th>
                <th>Email</th>
                <th>Ciudad</th>
                {isPlatformOwner && <th>Organizacion</th>}
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => openEdit(customer)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="cell-primary">{customer.name}</td>
                  <td className="cell-muted">{customer.rif ?? '—'}</td>
                  <td className="cell-muted">{customer.phone ?? '—'}</td>
                  <td className="cell-muted">{customer.email ?? '—'}</td>
                  <td className="cell-muted">{customer.city ?? '—'}</td>
                  {isPlatformOwner && (
                    <td className="cell-muted" style={{ fontSize: 12, color: '#64748B' }}>
                      {orgNames[customer.org_id] ?? '—'}
                    </td>
                  )}
                  <td>
                    {canWrite('customers') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(customer); }}
                        className="rh-btn rh-btn-ghost"
                        style={{ color: '#EF4444', padding: '4px 10px', fontSize: 13 }}
                        title="Eliminar cliente"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={isEditMode ? `Editar Cliente — ${editCustomer?.name}` : 'Nuevo Cliente'}
        width="640px"
        footer={
          <>
            <button onClick={closeModal} className="rh-btn rh-btn-ghost">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saveLoading || !form.name.trim()}
              className="rh-btn rh-btn-primary"
            >
              {saveLoading ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
          </>
        }
      >
        {saveError && (
          <div className="rh-alert rh-alert-error mb-4">{saveError}</div>
        )}
        <div className="rh-form-grid">
          {/* Name */}
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rh-input"
                placeholder="Nombre del cliente o empresa"
              />
            </div>
          </div>

          {/* RIF */}
          <div className="rh-field">
            <label className="rh-label">RIF / Cedula</label>
            <input
              type="text"
              value={form.rif}
              onChange={(e) => setForm((f) => ({ ...f, rif: e.target.value }))}
              className="rh-input"
              placeholder="J-12345678-9"
            />
          </div>

          {/* Email */}
          <div className="rh-field">
            <label className="rh-label">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="rh-input"
              placeholder="cliente@email.com"
            />
          </div>

          {/* Phone */}
          <div className="rh-field">
            <label className="rh-label">Telefono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="rh-input"
              placeholder="+58 412 1234567"
            />
          </div>

          {/* WhatsApp */}
          <div className="rh-field">
            <label className="rh-label">WhatsApp</label>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
              className="rh-input"
              placeholder="+58 412 1234567"
            />
          </div>

          {/* Address — Google Maps Autocomplete */}
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Direccion</label>
              <GooglePlacesAutocomplete
                className="rh-input"
                placeholder="Escribe la direccion del cliente..."
                value={form.address}
                onChange={(addr) => setForm((f) => ({ ...f, address: addr }))}
                onPlaceSelect={(place) => {
                  setForm((f) => ({
                    ...f,
                    address: place.address,
                    lat: place.lat,
                    lng: place.lng,
                  }));
                  // Try to extract city and state from address
                  const parts = place.address.split(',').map((p) => p.trim());
                  if (parts.length >= 3) {
                    setForm((prev) => ({
                      ...prev,
                      address: place.address,
                      lat: place.lat,
                      lng: place.lng,
                      city: prev.city || parts[parts.length - 3] || '',
                      state: prev.state || parts[parts.length - 2] || '',
                    }));
                  }
                }}
              />
              {form.lat && form.lng && (
                <p style={{ fontSize: 11, color: '#10B981', marginTop: 4, margin: 0 }}>
                  Coordenadas guardadas ({form.lat.toFixed(4)}, {form.lng.toFixed(4)})
                </p>
              )}
            </div>
          </div>

          {/* State */}
          <div className="rh-field">
            <label className="rh-label">Estado</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              className="rh-input"
              placeholder="Miranda"
            />
          </div>

          {/* City */}
          <div className="rh-field">
            <label className="rh-label">Ciudad</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="rh-input"
              placeholder="Caracas"
            />
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="rh-input resize-none"
                rows={3}
                placeholder="Notas adicionales sobre el cliente"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        title="Eliminar Cliente"
        width="440px"
        footer={
          <>
            <button onClick={() => setDeleteConfirm(null)} className="rh-btn rh-btn-ghost">
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="rh-btn"
              style={{ background: '#EF4444', color: '#fff' }}
            >
              {deleteLoading ? 'Eliminando...' : 'Eliminar'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: '#475569', margin: 0 }}>
          ¿Estas seguro de eliminar al cliente <strong>{deleteConfirm?.name}</strong>?
          Esta accion no se puede deshacer.
        </p>
        {deleteConfirm?.rif && (
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
            RIF: {deleteConfirm.rif}
          </p>
        )}
      </Modal>
    </div>
  );
}
