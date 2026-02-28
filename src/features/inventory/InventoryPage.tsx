import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { ConfirmDeleteModal } from '@/components/hub/shared/ConfirmDeleteModal.tsx';
import { Pagination } from '@/features/inventory/upload/components/Pagination.tsx';
import { ProductFormModal } from './ProductFormModal.tsx';
import type { Product } from '@/lib/database.types.ts';
import * as productService from '@/services/productService.ts';

const PAGE_SIZE = 20;

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<'price' | 'stock' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const { canWrite, isPlatform } = usePermissions();
  const organization = useAuthStore((s) => s.organization);
  const navigate = useNavigate();

  // Modal state
  const [showProduct, setShowProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [statusFilter]);

  const loadProducts = async () => {
    setLoading(true);
    const result = await productService.getProducts({
      orgId: organization?.id,
      isPlatform,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
    setProducts(result.data ?? []);
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setShowProduct(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setShowProduct(true);
  };

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    await productService.deleteProduct(deleteTarget.id);

    setDeleteLoading(false);
    setDeleteTarget(null);
    setShowProduct(false);
    setEditingProduct(null);
    loadProducts();
  };

  const toggleSort = (col: 'price' | 'stock') => {
    if (sortColumn === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  const sortIndicator = (col: 'price' | 'stock') =>
    sortColumn === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const filteredProducts = products.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.oem_number ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const sortedProducts = sortColumn
    ? [...filteredProducts].sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        return sortDir === 'asc' ? valA - valB : valB - valA;
      })
    : filteredProducts;

  const totalPages = Math.ceil(sortedProducts.length / PAGE_SIZE);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.min_stock).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  const brandData = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const brand = p.brand?.trim() || 'Sin marca';
      map.set(brand, (map.get(brand) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [products]);

  const maxBrandCount = brandData.length > 0 ? brandData[0][1] : 1;

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

      {/* Brand distribution chart */}
      {brandData.length > 0 && (
        <div className="rh-card mb-6" style={{ padding: '20px 24px' }}>
          <h3 className="rh-card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            📊 Productos por Marca
            <span style={{ fontSize: 12, fontWeight: 400, color: '#94A3B8' }}>
              (Top {brandData.length})
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {brandData.map(([brand, count]) => (
              <div key={brand} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    width: 100,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1E293B',
                    textAlign: 'right',
                    flexShrink: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={brand}
                >
                  {brand}
                </span>
                <div style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 6, height: 24, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(count / maxBrandCount) * 100}%`,
                      height: '100%',
                      backgroundColor: '#10B981',
                      borderRadius: 6,
                      minWidth: 2,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    width: 40,
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#10B981',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rh-filters" style={{ marginTop: 24 }}>
        <input
          type="text"
          placeholder="Buscar por nombre, SKU o OEM..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
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
              onClick={() => { setStatusFilter(f.key); setCurrentPage(1); }}
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
                <th
                  className="text-right"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleSort('price')}
                >
                  Precio{sortIndicator('price')}
                </th>
                <th
                  className="text-right"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleSort('stock')}
                >
                  Stock{sortIndicator('stock')}
                </th>
                <th>Estado</th>
                {canWrite('inventory') && <th className="text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => (
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedProducts.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Product Form Modal */}
      <ProductFormModal
        open={showProduct}
        product={editingProduct}
        orgId={organization?.id}
        isPlatform={isPlatform}
        onClose={() => {
          setShowProduct(false);
          setEditingProduct(null);
        }}
        onSaved={loadProducts}
        onRequestDelete={setDeleteTarget}
        canDelete={canWrite('inventory')}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Eliminar Producto"
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteProduct}
      >
        <p style={{ fontWeight: 500, marginBottom: 8 }}>
          ¿Estas seguro de que deseas eliminar este producto?
        </p>
        {deleteTarget && (
          <p style={{ color: '#94A3B8', fontSize: 14 }}>
            <strong>{deleteTarget.name}</strong> (SKU: {deleteTarget.sku})
          </p>
        )}
        <p style={{ color: '#F59E0B', fontSize: 13, marginTop: 12 }}>
          Esta accion no se puede deshacer.
        </p>
      </ConfirmDeleteModal>
    </div>
  );
}
