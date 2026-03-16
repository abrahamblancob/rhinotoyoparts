import { useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { toast } from '@/stores/toastStore.ts';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import { ConfirmDeleteModal } from '@/components/hub/shared/ConfirmDeleteModal.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import type { Supplier } from '@/lib/database.types.ts';
import * as supplierService from '@/services/supplierService.ts';

const emptyForm = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  notes: '',
  status: 'active' as 'active' | 'inactive',
};

export function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Supplier | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { canWrite, canDelete } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  const fetcher = useCallback(
    () =>
      supplierService.getSuppliers({
        orgId: organization?.id,
        isPlatform: false,
      }),
    [organization?.id],
  );

  const { data: suppliers, loading, reload } = useAsyncData<Supplier[]>(fetcher, [
    organization?.id,
  ]);

  const items = suppliers ?? [];

  const isEditMode = Boolean(editSupplier);

  // ── Filtered list ──
  const filtered = items.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contact_person ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q)
    );
  });

  // ── Open create modal ──
  const openCreate = () => {
    setEditSupplier(null);
    setForm({ ...emptyForm });
    setSaveError('');
    setShowModal(true);
  };

  // ── Open edit modal ──
  const openEdit = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setForm({
      name: supplier.name,
      contact_person: supplier.contact_person ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
      city: supplier.city ?? '',
      state: supplier.state ?? '',
      notes: supplier.notes ?? '',
      status: supplier.status,
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
      contact_person: form.contact_person || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      notes: form.notes || null,
      status: form.status,
    };

    if (isEditMode && editSupplier) {
      const result = await supplierService.saveSupplier(payload, editSupplier.id);
      if (result.error) {
        setSaveError(result.error);
        setSaveLoading(false);
        return;
      }
      toast('success', 'Proveedor actualizado correctamente');
    } else {
      const orgId = organization?.id;
      if (!orgId) {
        setSaveError('No se pudo determinar la organizacion');
        setSaveLoading(false);
        return;
      }
      const result = await supplierService.saveSupplier({ ...payload, org_id: orgId });
      if (result.error) {
        setSaveError(result.error);
        setSaveLoading(false);
        return;
      }
      toast('success', 'Proveedor creado correctamente');
    }

    setSaveLoading(false);
    setShowModal(false);
    setEditSupplier(null);
    setForm({ ...emptyForm });
    reload();
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);

    const result = await supplierService.deleteSupplier(deleteConfirm.id);
    if (result.error) {
      toast('error', result.error);
    } else {
      toast('success', 'Proveedor eliminado');
    }

    setDeleteLoading(false);
    setDeleteConfirm(null);
    reload();
  };

  // ── Close modal ──
  const closeModal = () => {
    setShowModal(false);
    setEditSupplier(null);
    setForm({ ...emptyForm });
    setSaveError('');
  };

  return (
    <div>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Proveedores</h1>
          <p style={{ color: '#8A8886', fontSize: 14, marginTop: 4 }}>
            Gestiona los proveedores de tu organizacion
          </p>
        </div>
        <div className="rh-page-actions">
          <div style={{ position: 'relative', maxWidth: 320 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }}
            />
            <input
              type="text"
              placeholder="Buscar por nombre, contacto, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rh-input"
              style={{ paddingLeft: 36 }}
            />
          </div>
          {canWrite('suppliers') && (
            <button onClick={openCreate} className="rh-btn rh-btn-primary">
              <Plus size={16} style={{ marginRight: 4 }} />
              Nuevo Proveedor
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🏭"
          title="No hay proveedores"
          description="Agrega proveedores para gestionar tus compras"
          actionLabel={canWrite('suppliers') ? 'Agregar Proveedor' : undefined}
          onAction={canWrite('suppliers') ? openCreate : undefined}
        />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Persona de Contacto</th>
                <th>Email</th>
                <th>Telefono</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((supplier) => (
                <tr
                  key={supplier.id}
                  className="cursor-pointer"
                  onClick={() => openEdit(supplier)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="cell-primary">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={14} style={{ color: '#8A8886', flexShrink: 0 }} />
                      {supplier.name}
                    </div>
                  </td>
                  <td className="cell-muted">
                    {supplier.contact_person ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <User size={13} style={{ color: '#8A8886' }} />
                        {supplier.contact_person}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="cell-muted">
                    {supplier.email ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={13} style={{ color: '#8A8886' }} />
                        {supplier.email}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="cell-muted">
                    {supplier.phone ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={13} style={{ color: '#8A8886' }} />
                        {supplier.phone}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="cell-muted">
                    {supplier.city ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={13} style={{ color: '#8A8886' }} />
                        {supplier.city}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span
                      className="rh-badge"
                      style={{
                        backgroundColor: supplier.status === 'active' ? '#10B98115' : '#8A888615',
                        color: supplier.status === 'active' ? '#10B981' : '#8A8886',
                      }}
                    >
                      {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canWrite('suppliers') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(supplier);
                          }}
                          className="rh-btn rh-btn-ghost"
                          style={{ padding: '4px 6px' }}
                          title="Editar proveedor"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {canDelete('suppliers') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(supplier);
                          }}
                          className="rh-btn rh-btn-ghost"
                          style={{ color: '#EF4444', padding: '4px 6px' }}
                          title="Eliminar proveedor"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
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
        title={isEditMode ? `Editar Proveedor — ${editSupplier?.name}` : 'Nuevo Proveedor'}
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
              {saveLoading ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Crear Proveedor'}
            </button>
          </>
        }
      >
        {saveError && (
          <div className="rh-alert rh-alert-error mb-4">{saveError}</div>
        )}
        <div className="rh-form-grid">
          {/* Nombre */}
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rh-input"
                placeholder="Nombre del proveedor"
              />
            </div>
          </div>

          {/* Persona de contacto */}
          <div className="rh-field">
            <label className="rh-label">Persona de contacto</label>
            <input
              type="text"
              value={form.contact_person}
              onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
              className="rh-input"
              placeholder="Juan Perez"
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
              placeholder="proveedor@email.com"
            />
          </div>

          {/* Telefono */}
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

          {/* Estado (status) */}
          <div className="rh-field">
            <label className="rh-label">Estado</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
              className="rh-input"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>

          {/* Direccion */}
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Direccion</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="rh-input"
                placeholder="Direccion del proveedor"
              />
            </div>
          </div>

          {/* Ciudad */}
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

          {/* Estado (geographic) */}
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

          {/* Notas */}
          <div className="col-span-2">
            <div className="rh-field">
              <label className="rh-label">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="rh-input resize-none"
                rows={3}
                placeholder="Notas adicionales sobre el proveedor"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmDeleteModal
        open={Boolean(deleteConfirm)}
        title="Eliminar Proveedor"
        loading={deleteLoading}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
      >
        <p style={{ fontWeight: 500, marginBottom: 8 }}>
          ¿Estas seguro de eliminar al proveedor <strong>{deleteConfirm?.name}</strong>?
        </p>
        {deleteConfirm?.contact_person && (
          <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 8 }}>
            Contacto: {deleteConfirm.contact_person}
          </p>
        )}
        <p style={{ color: '#F59E0B', fontSize: 13 }}>
          Esta accion no se puede deshacer.
        </p>
      </ConfirmDeleteModal>
    </div>
  );
}
