import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import type { Product } from '@/lib/database.types.ts';

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

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { canWrite, isPlatform } = usePermissions();
  const organization = useAuthStore((s) => s.organization);
  const navigate = useNavigate();

  // Create / Edit product state
  const [showProduct, setShowProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ ...EMPTY_FORM });
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState('');
  const [productSuccess, setProductSuccess] = useState('');

  // Delete product state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [statusFilter]);

  const loadProducts = async () => {
    setLoading(true);
    let query = supabase.from('products').select('*').order('created_at', { ascending: false });

    if (!isPlatform && organization) {
      query = query.eq('org_id', organization.id);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setProductForm({ ...EMPTY_FORM });
    setProductError('');
    setProductSuccess('');
    setShowProduct(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
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
    });
    setProductError('');
    setProductSuccess('');
    setShowProduct(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) {
      setProductError('El nombre del producto es requerido');
      return;
    }

    setProductLoading(true);
    setProductError('');

    const orgId = organization?.id;
    if (!orgId && !isPlatform) {
      setProductError('No se pudo determinar la organización');
      setProductLoading(false);
      return;
    }

    const productData = {
      org_id: editingProduct?.org_id ?? orgId,
      sku: productForm.sku.trim() || `SKU-${Date.now()}`,
      name: productForm.name.trim(),
      description: productForm.description.trim() || null,
      brand: productForm.brand.trim() || null,
      oem_number: productForm.oem_number.trim() || null,
      price: parseFloat(productForm.price) || 0,
      cost: productForm.cost ? parseFloat(productForm.cost) : null,
      stock: parseInt(productForm.stock) || 0,
      min_stock: parseInt(productForm.min_stock) || 5,
      status: productForm.status,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        setProductError(`Error al actualizar: ${error.message}`);
        setProductLoading(false);
        return;
      }
      setProductSuccess('Producto actualizado exitosamente');
    } else {
      const { error } = await supabase
        .from('products')
        .insert(productData);

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          setProductError('Ya existe un producto con ese SKU en tu organización');
        } else {
          setProductError(`Error al crear: ${error.message}`);
        }
        setProductLoading(false);
        return;
      }
      setProductSuccess('Producto creado exitosamente');
    }

    setProductLoading(false);
    loadProducts();
    setTimeout(() => {
      setShowProduct(false);
      setProductSuccess('');
      setEditingProduct(null);
    }, 1500);
  };

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      setDeleteLoading(false);
      setDeleteTarget(null);
      setProductError(`Error al eliminar: ${error.message}`);
      return;
    }

    setDeleteLoading(false);
    setDeleteTarget(null);
    // Close edit modal if open
    setShowProduct(false);
    setEditingProduct(null);
    loadProducts();
  };

  const filteredProducts = products.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.oem_number ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.min_stock).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  return (
    <div>
      <div className="rh-page-header">
        <h1 className="rh-page-title">Inventario</h1>
        <div className="rh-page-actions">
          {canWrite('inventory') && (
            <>
              <button
                onClick={() => navigate('/hub/inventory/upload')}
                className="rh-btn rh-btn-outline"
              >
                📤 Carga Masiva
              </button>
              <button
                onClick={openCreateModal}
                className="rh-btn rh-btn-primary"
              >
                + Nuevo Producto
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="rh-stats-grid mb-6">
        <StatsCard title="Total Productos" value={products.length} icon="📦" color="#6366F1" />
        <StatsCard title="Stock Total" value={totalStock.toLocaleString()} icon="🏷️" color="#10B981" />
        <StatsCard title="Stock Bajo" value={lowStock} icon="⚠️" color="#F59E0B" />
        <StatsCard title="Agotados" value={outOfStock} icon="🚫" color="#D3010A" />
      </div>

      {/* Filters */}
      <div className="rh-filters">
        <input
          type="text"
          placeholder="Buscar por nombre, SKU o OEM..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rh-search"
        />
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'active', label: 'Activos' },
            { key: 'inactive', label: 'Inactivos' },
            { key: 'out_of_stock', label: 'Agotados' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rh-filter-pill ${statusFilter === f.key ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No hay productos"
          description="Agrega productos a tu inventario para comenzar a gestionar"
          actionLabel={canWrite('inventory') ? 'Agregar Producto' : undefined}
          onAction={canWrite('inventory') ? openCreateModal : undefined}
        />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Marca</th>
                <th className="text-right">Precio</th>
                <th className="text-right">Stock</th>
                <th>Estado</th>
                {canWrite('inventory') && <th className="text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="cursor-pointer" onClick={() => canWrite('inventory') && openEditModal(product)}>
                  <td>
                    <div>
                      <p className="cell-primary">{product.name}</p>
                      {product.oem_number && (
                        <p className="cell-muted text-xs mt-0.5">OEM: {product.oem_number}</p>
                      )}
                    </div>
                  </td>
                  <td className="cell-mono cell-muted">{product.sku}</td>
                  <td className="cell-muted">{product.brand ?? '—'}</td>
                  <td className="text-right cell-bold">
                    ${product.price.toFixed(2)}
                  </td>
                  <td className="text-right">
                    <span
                      className="font-semibold"
                      style={{
                        color: product.stock === 0 ? '#D3010A' : product.stock <= product.min_stock ? '#F59E0B' : '#10B981',
                      }}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={product.status} />
                  </td>
                  {canWrite('inventory') && (
                    <td className="text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(product);
                        }}
                        className="rh-btn rh-btn-ghost"
                        style={{ color: '#D3010A', padding: '4px 8px', fontSize: 13 }}
                        title="Eliminar producto"
                      >
                        🗑️
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Product Modal ──────────────────────────────── */}
      <Modal
        open={showProduct}
        onClose={() => {
          setShowProduct(false);
          setEditingProduct(null);
          setProductError('');
          setProductSuccess('');
        }}
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        width="600px"
        footer={
          productSuccess ? (
            <button
              onClick={() => {
                setShowProduct(false);
                setProductSuccess('');
                setEditingProduct(null);
              }}
              className="rh-btn rh-btn-primary"
            >
              Cerrar
            </button>
          ) : (
            <div style={{ display: 'flex', justifyContent: editingProduct ? 'space-between' : 'flex-end', width: '100%', alignItems: 'center' }}>
              {editingProduct && canWrite('inventory') && (
                <button
                  onClick={() => setDeleteTarget(editingProduct)}
                  className="rh-btn rh-btn-ghost"
                  style={{ color: '#D3010A' }}
                >
                  🗑️ Eliminar
                </button>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setShowProduct(false);
                    setEditingProduct(null);
                    setProductError('');
                  }}
                  className="rh-btn rh-btn-ghost"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProduct}
                  disabled={productLoading || !productForm.name}
                  className="rh-btn rh-btn-primary"
                >
                  {productLoading ? 'Guardando...' : editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </div>
          )
        }
      >
        {productSuccess ? (
          <div className="rh-alert rh-alert-success">
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 500 }}>{productSuccess}</p>
          </div>
        ) : (
          <>
            {productError && (
              <div className="rh-alert rh-alert-error mb-4">{productError}</div>
            )}

            <div className="rh-form-grid">
              {/* Name - full width */}
              <div className="col-span-2">
                <div className="rh-field">
                  <label className="rh-label">Nombre del producto *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                    className="rh-input"
                    placeholder="Pastillas de freno Toyota Hilux"
                  />
                </div>
              </div>

              {/* SKU */}
              <div className="rh-field">
                <label className="rh-label">SKU</label>
                <input
                  type="text"
                  value={productForm.sku}
                  onChange={(e) => setProductForm((f) => ({ ...f, sku: e.target.value }))}
                  className="rh-input"
                  placeholder="TOY-04465-001"
                />
                <p className="rh-hint">Se genera automáticamente si se deja vacío</p>
              </div>

              {/* OEM */}
              <div className="rh-field">
                <label className="rh-label">Número OEM</label>
                <input
                  type="text"
                  value={productForm.oem_number}
                  onChange={(e) => setProductForm((f) => ({ ...f, oem_number: e.target.value }))}
                  className="rh-input"
                  placeholder="04465-33471"
                />
              </div>

              {/* Brand */}
              <div className="rh-field">
                <label className="rh-label">Marca</label>
                <input
                  type="text"
                  value={productForm.brand}
                  onChange={(e) => setProductForm((f) => ({ ...f, brand: e.target.value }))}
                  className="rh-input"
                  placeholder="Toyota, Denso, KYB..."
                />
              </div>

              {/* Status */}
              <div className="rh-field">
                <label className="rh-label">Estado</label>
                <select
                  value={productForm.status}
                  onChange={(e) => setProductForm((f) => ({ ...f, status: e.target.value as 'active' }))}
                  className="rh-select"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="out_of_stock">Agotado</option>
                </select>
              </div>

              {/* Price */}
              <div className="rh-field">
                <label className="rh-label">Precio (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.price}
                  onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                  className="rh-input"
                  placeholder="25.50"
                />
              </div>

              {/* Cost */}
              <div className="rh-field">
                <label className="rh-label">Costo (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.cost}
                  onChange={(e) => setProductForm((f) => ({ ...f, cost: e.target.value }))}
                  className="rh-input"
                  placeholder="15.00"
                />
              </div>

              {/* Stock */}
              <div className="rh-field">
                <label className="rh-label">Stock</label>
                <input
                  type="number"
                  min="0"
                  value={productForm.stock}
                  onChange={(e) => setProductForm((f) => ({ ...f, stock: e.target.value }))}
                  className="rh-input"
                  placeholder="100"
                />
              </div>

              {/* Min Stock */}
              <div className="rh-field">
                <label className="rh-label">Stock mínimo</label>
                <input
                  type="number"
                  min="0"
                  value={productForm.min_stock}
                  onChange={(e) => setProductForm((f) => ({ ...f, min_stock: e.target.value }))}
                  className="rh-input"
                  placeholder="5"
                />
                <p className="rh-hint">Alerta cuando el stock esté por debajo</p>
              </div>

              {/* Description - full width */}
              <div className="col-span-2">
                <div className="rh-field">
                  <label className="rh-label">Descripción</label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                    className="rh-input"
                    rows={3}
                    placeholder="Descripción detallada del producto..."
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ──────────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        title="Eliminar Producto"
        width="460px"
        footer={
          <>
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
              className="rh-btn rh-btn-ghost"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteProduct}
              disabled={deleteLoading}
              className="rh-btn"
              style={{ background: '#D3010A', color: '#fff' }}
            >
              {deleteLoading ? 'Eliminando...' : 'Sí, Eliminar'}
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <p style={{ fontWeight: 500, marginBottom: 8 }}>
            ¿Estás seguro de que deseas eliminar este producto?
          </p>
          {deleteTarget && (
            <p style={{ color: '#94A3B8', fontSize: 14 }}>
              <strong>{deleteTarget.name}</strong> (SKU: {deleteTarget.sku})
            </p>
          )}
          <p style={{ color: '#F59E0B', fontSize: 13, marginTop: 12 }}>
            Esta acción no se puede deshacer.
          </p>
        </div>
      </Modal>
    </div>
  );
}
