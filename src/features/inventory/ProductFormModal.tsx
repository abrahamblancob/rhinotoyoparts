import { useState, useEffect } from 'react';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import type { Product } from '@/lib/database.types.ts';
import * as productService from '@/services/productService.ts';

const EMPTY_FORM = {
  sku: '',
  name: '',
  description: '',
  brand: '',
  oem_number: '',
  price: '',
  cost: '',
  stock: '',
  min_stock: '5',
  status: 'active' as const,
};

type ProductForm = typeof EMPTY_FORM;

interface ProductFormModalProps {
  open: boolean;
  product: Product | null;
  orgId: string | undefined;
  isPlatform: boolean;
  onClose: () => void;
  onSaved: () => void;
  onRequestDelete: (product: Product) => void;
  canDelete: boolean;
}

function productToForm(product: Product): ProductForm {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description ?? '',
    brand: product.brand ?? '',
    oem_number: product.oem_number ?? '',
    price: String(product.price),
    cost: product.cost != null ? String(product.cost) : '',
    stock: String(product.stock),
    min_stock: String(product.min_stock),
    status: product.status as 'active',
  };
}

export function ProductFormModal({
  open,
  product,
  orgId,
  isPlatform,
  onClose,
  onSaved,
  onRequestDelete,
  canDelete,
}: ProductFormModalProps) {
  const isEditMode = Boolean(product);
  const [form, setForm] = useState<ProductForm>({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open) {
      setForm(product ? productToForm(product) : { ...EMPTY_FORM });
      setError('');
      setSuccess('');
    }
  }, [open, product]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('El nombre del producto es requerido');
      return;
    }

    setLoading(true);
    setError('');

    if (!orgId && !isPlatform) {
      setError('No se pudo determinar la organizacion');
      setLoading(false);
      return;
    }

    const productData = {
      org_id: product?.org_id ?? orgId,
      sku: form.sku.trim() || `SKU-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim() || null,
      brand: form.brand.trim() || null,
      oem_number: form.oem_number.trim() || null,
      price: parseFloat(form.price) || 0,
      cost: form.cost ? parseFloat(form.cost) : null,
      stock: parseInt(form.stock) || 0,
      min_stock: parseInt(form.min_stock) || 5,
      status: form.status,
    };

    const result = await productService.saveProduct(productData, product?.id);
    if (result.error) {
      if (result.error.includes('duplicate') || result.error.includes('unique')) {
        setError('Ya existe un producto con ese SKU en tu organizacion');
      } else {
        setError(`Error al ${isEditMode ? 'actualizar' : 'crear'}: ${result.error}`);
      }
      setLoading(false);
      return;
    }

    setSuccess(isEditMode ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
    setLoading(false);
    onSaved();

    setTimeout(() => {
      onClose();
      setSuccess('');
    }, 1500);
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
      title={isEditMode ? 'Editar Producto' : 'Nuevo Producto'}
      width="600px"
      footer={
        success ? (
          <button onClick={handleClose} className="rh-btn rh-btn-primary">
            Cerrar
          </button>
        ) : (
          <div style={{ display: 'flex', justifyContent: isEditMode ? 'space-between' : 'flex-end', width: '100%', alignItems: 'center' }}>
            {isEditMode && canDelete && product && (
              <button
                onClick={() => onRequestDelete(product)}
                className="rh-btn rh-btn-ghost"
                style={{ color: '#D3010A' }}
              >
                🗑️ Eliminar
              </button>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleClose} className="rh-btn rh-btn-ghost">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !form.name}
                className="rh-btn rh-btn-primary"
              >
                {loading ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
            </div>
          </div>
        )
      }
    >
      {success ? (
        <div className="rh-alert rh-alert-success">
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <p style={{ fontWeight: 500 }}>{success}</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="rh-alert rh-alert-error mb-4">{error}</div>
          )}

          <div className="rh-form-grid">
            <div className="col-span-2">
              <div className="rh-field">
                <label className="rh-label">Nombre del producto *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="rh-input"
                  placeholder="Pastillas de freno Toyota Hilux"
                />
              </div>
            </div>

            <div className="rh-field">
              <label className="rh-label">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                className="rh-input"
                placeholder="TOY-04465-001"
              />
              <p className="rh-hint">Se genera automaticamente si se deja vacio</p>
            </div>

            <div className="rh-field">
              <label className="rh-label">Numero OEM</label>
              <input
                type="text"
                value={form.oem_number}
                onChange={(e) => setForm((f) => ({ ...f, oem_number: e.target.value }))}
                className="rh-input"
                placeholder="04465-33471"
              />
            </div>

            <div className="rh-field">
              <label className="rh-label">Marca</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                className="rh-input"
                placeholder="Toyota, Denso, KYB..."
              />
            </div>

            <div className="rh-field">
              <label className="rh-label">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' }))}
                className="rh-select"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="out_of_stock">Agotado</option>
              </select>
            </div>

            <div className="rh-field">
              <label className="rh-label">Precio (USD) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="rh-input"
                placeholder="25.50"
              />
            </div>

            <div className="rh-field">
              <label className="rh-label">Costo (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                className="rh-input"
                placeholder="15.00"
              />
            </div>

            <div className="rh-field">
              <label className="rh-label">Stock</label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                className="rh-input"
                placeholder="100"
              />
            </div>

            <div className="rh-field">
              <label className="rh-label">Stock minimo</label>
              <input
                type="number"
                min="0"
                value={form.min_stock}
                onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
                className="rh-input"
                placeholder="5"
              />
              <p className="rh-hint">Alerta cuando el stock este por debajo</p>
            </div>

            <div className="col-span-2">
              <div className="rh-field">
                <label className="rh-label">Descripcion</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="rh-input"
                  rows={3}
                  placeholder="Descripcion detallada del producto..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
