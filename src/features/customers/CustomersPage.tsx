import { useEffect, useState, useCallback } from 'react';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { useAggregatorNav } from '@/hooks/useAggregatorNav.ts';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { OrgSelectorGrid } from '@/components/hub/shared/OrgSelectorGrid.tsx';
import { Breadcrumbs } from '@/components/hub/shared/Breadcrumbs.tsx';
import { AssociateFilterCards } from '@/components/hub/shared/AssociateFilterCards.tsx';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import { ConfirmDeleteModal } from '@/components/hub/shared/ConfirmDeleteModal.tsx';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete.tsx';
import type { Customer } from '@/lib/database.types.ts';
import * as customerService from '@/services/customerService.ts';
import { logActivity } from '@/services/activityLogService.ts';
import { getOrgCustomerSummaries } from '@/services/dashboardService.ts';
import type { OrgCustomerSummary } from '@/services/dashboardService.ts';

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

  const nav = useAggregatorNav<OrgCustomerSummary>(getOrgCustomerSummaries, isPlatformOwner);

  const [form, setForm] = useState({ ...emptyForm });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  const isEditMode = Boolean(editCustomer);

  const orgId = isPlatformOwner ? nav.effectiveOrgId ?? undefined : organization?.id;
  const shouldIncludeChildren = isPlatformOwner && nav.includeChildren && !!nav.selectedAggregatorId;

  const loadCustomers = useCallback(async () => {
    if (nav.navState !== 'list' && isPlatformOwner) return;
    setLoading(true);
    const result = await customerService.getCustomers({
      orgId,
      isPlatform: false,
      includeChildren: shouldIncludeChildren,
    });
    setCustomers(result.data ?? []);
    setLoading(false);
  }, [isPlatformOwner, orgId, nav.navState, shouldIncludeChildren]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

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

  const openCreate = () => {
    setEditCustomer(null);
    setForm({ ...emptyForm });
    setSaveError('');
    setShowModal(true);
  };

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
      const result = await customerService.updateCustomer(editCustomer.id, payload);
      if (result.error) {
        setSaveError(result.error);
        setSaveLoading(false);
        return;
      }
      logActivity({ action: 'update', entityType: 'customer', entityId: editCustomer.id, description: `Actualizó cliente ${payload.name}` });
    } else {
      const customerOrgId = organization?.id;
      if (!customerOrgId) {
        setSaveError('No se pudo determinar la organizacion');
        setSaveLoading(false);
        return;
      }
      const result = await customerService.createCustomer({ ...payload, org_id: customerOrgId });
      if (result.error) {
        setSaveError(result.error);
        setSaveLoading(false);
        return;
      }
      logActivity({ action: 'create', entityType: 'customer', entityId: result.data?.id, description: `Creó cliente ${payload.name}` });
    }

    setSaveLoading(false);
    setShowModal(false);
    setEditCustomer(null);
    setForm({ ...emptyForm });
    loadCustomers();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    await customerService.deleteCustomer(deleteConfirm.id);
    logActivity({ action: 'delete', entityType: 'customer', entityId: deleteConfirm.id, description: `Eliminó cliente ${deleteConfirm.name}` });
    setDeleteLoading(false);
    setDeleteConfirm(null);
    loadCustomers();
  };

  const closeModal = () => {
    setShowModal(false);
    setEditCustomer(null);
    setForm({ ...emptyForm });
    setSaveError('');
  };

  // Level 1: Aggregator grid
  if (nav.navState === 'aggregators') {
    const totalCustomers = nav.summaries.reduce((s, o) => s + o.customerCount, 0);
    const totalWithEmail = nav.summaries.reduce((s, o) => s + o.withEmail, 0);
    const totalWithPhone = nav.summaries.reduce((s, o) => s + o.withPhone, 0);

    return (
      <OrgSelectorGrid<OrgCustomerSummary>
        summaries={nav.summaries}
        loading={nav.loading}
        onSelect={nav.selectAggregator}
        pageTitle="Clientes"
        pageSubtitle="Selecciona un agregador para ver sus clientes"
        globalStats={[
          { title: 'Total Clientes', value: totalCustomers, icon: '👤', color: '#6366F1' },
          { title: 'Con Email', value: totalWithEmail, icon: '📧', color: '#10B981' },
          { title: 'Con Teléfono', value: totalWithPhone, icon: '📱', color: '#3B82F6' },
          { title: 'Agregadores', value: nav.summaries.length, icon: '🏢', color: '#8B5CF6' },
        ]}
        statFields={[
          { key: 'customerCount', label: 'Clientes', color: '#6366F1' },
          { key: 'withEmail', label: 'Con Email', color: '#10B981' },
          { key: 'withPhone', label: 'Con Teléfono', color: '#3B82F6' },
        ]}
      />
    );
  }

  // List view
  const showAssociateCol = isPlatformOwner && nav.selectedAggregatorId && nav.includeChildren;

  return (
    <div>
      <div className="rh-page-header">
        <div>
          {isPlatformOwner && nav.breadcrumbs.length > 0 && <Breadcrumbs items={nav.breadcrumbs} />}
          <h1 className="rh-page-title">Clientes</h1>
        </div>
        <div className="rh-page-actions">
          <input
            type="text"
            placeholder="Buscar por nombre, RIF, email, teléfono..."
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

      {isPlatformOwner && nav.childOrgs.length > 0 && (
        <AssociateFilterCards
          childOrgs={nav.childOrgs}
          filterChildOrgId={nav.filterChildOrgId}
          onFilter={nav.setFilterChildOrgId}
        />
      )}

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
                {showAssociateCol && <th>Asociado</th>}
                <th>RIF / Cédula</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Ciudad</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const org = (customer as unknown as { organization: { name: string; type: string } | null }).organization;
                const isAssoc = org?.type === 'associate';
                return (
                  <tr
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(customer)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="cell-primary">{customer.name}</td>
                    {showAssociateCol && (
                      <td>
                        {isAssoc ? (
                          <span style={{ fontSize: 12, background: '#EDE9FE', color: '#7C3AED', padding: '2px 8px', borderRadius: 10 }}>{org?.name}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Directa</span>
                        )}
                      </td>
                    )}
                    <td className="cell-muted">{customer.rif ?? '—'}</td>
                    <td className="cell-muted">{customer.phone ?? '—'}</td>
                    <td className="cell-muted">{customer.email ?? '—'}</td>
                    <td className="cell-muted">{customer.city ?? '—'}</td>
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
                );
              })}
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
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Nombre *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rh-input" placeholder="Nombre del cliente o empresa" />
            </div>
          </div>
          <div className="rh-field">
            <label className="rh-label">RIF / Cédula</label>
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
              <label className="rh-label">Dirección de envío</label>
              <GooglePlacesAutocomplete
                className="rh-input"
                placeholder="Escribe la dirección y selecciona de las sugerencias..."
                value={form.address}
                onChange={(addr) => setForm((f) => ({ ...f, address: addr, lat: null, lng: null }))}
                onPlaceSelect={(place) => {
                  const parts = place.address.split(',').map((p) => p.trim());
                  const extractedCity = parts.length >= 3 ? parts[parts.length - 3] : '';
                  const extractedState = parts.length >= 2 ? parts[parts.length - 2] : '';
                  setForm((f) => ({ ...f, address: place.address, lat: place.lat, lng: place.lng, city: extractedCity || f.city, state: extractedState || f.state }));
                }}
              />
              {form.address && form.lat && form.lng ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                  <span style={{ fontSize: 11, color: '#10B981' }}>Dirección verificada por Google Maps ({form.lat.toFixed(4)}, {form.lng.toFixed(4)})</span>
                </div>
              ) : form.address ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
                  <span style={{ fontSize: 11, color: '#D97706' }}>Selecciona una dirección de las sugerencias de Google Maps para guardar las coordenadas</span>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, display: 'block' }}>Escribe y selecciona una dirección de las sugerencias de Google Maps</span>
              )}
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
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="rh-input resize-none" rows={3} placeholder="Notas adicionales sobre el cliente" />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDeleteModal
        open={Boolean(deleteConfirm)}
        title="Eliminar Cliente"
        loading={deleteLoading}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
      >
        <p style={{ fontWeight: 500, marginBottom: 8 }}>
          ¿Estás seguro de eliminar al cliente <strong>{deleteConfirm?.name}</strong>?
        </p>
        {deleteConfirm?.rif && (
          <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 8 }}>RIF: {deleteConfirm.rif}</p>
        )}
        <p style={{ color: '#F59E0B', fontSize: 13 }}>Esta acción no se puede deshacer.</p>
      </ConfirmDeleteModal>
    </div>
  );
}
