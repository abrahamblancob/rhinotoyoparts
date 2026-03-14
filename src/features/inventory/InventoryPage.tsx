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
import { getOrgSummaries } from '@/services/dashboardService.ts';
import type { OrgInventorySummary } from '@/services/dashboardService.ts';

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

  // Platform org selector
  const [orgSummaries, setOrgSummaries] = useState<OrgInventorySummary[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loadingSummaries, setLoadingSummaries] = useState(false);

  const selectedOrg = orgSummaries.find((o) => o.id === selectedOrgId);

  useEffect(() => {
    if (isPlatform && !selectedOrgId) {
      setLoadingSummaries(true);
      getOrgSummaries().then((data) => {
        setOrgSummaries(data);
        setLoadingSummaries(false);
      });
    }
  }, [isPlatform, selectedOrgId]);

  useEffect(() => {
    if (isPlatform && !selectedOrgId) return; // Don't load products until org is selected
    loadProducts();
  }, [statusFilter, selectedOrgId]);

  const loadProducts = async () => {
    setLoading(true);
    const orgId = isPlatform ? selectedOrgId ?? undefined : organization?.id;
    const result = await productService.getProducts({
      orgId,
      isPlatform: false, // Always filter by org now
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

  // Platform user without org selected → show org cards
  if (isPlatform && !selectedOrgId) {
    const totalProducts = orgSummaries.reduce((s, o) => s + o.productCount, 0);
    const totalStockAll = orgSummaries.reduce((s, o) => s + o.totalStock, 0);

    return (
      <div>
        <div className="rh-page-header">
          <div>
            <h1 className="rh-page-title">Inventario</h1>
            <p className="rh-page-subtitle">Selecciona una organización para ver su inventario</p>
          </div>
          <div className="rh-page-actions">
            {canWrite('inventory') && (
              <button
                onClick={() => navigate('/hub/inventory/upload')}
                className="rh-btn rh-btn-outline"
              >
                📤 Carga Masiva
              </button>
            )}
          </div>
        </div>

        {/* Global totals */}
        <div className="rh-stats-grid mb-6">
          <StatsCard title="Inventario Total" value={totalProducts.toLocaleString()} icon="📦" color="#6366F1" />
          <StatsCard title="Stock Total" value={totalStockAll.toLocaleString()} icon="🏷️" color="#10B981" />
          <StatsCard title="Organizaciones" value={orgSummaries.length} icon="🏢" color="#8B5CF6" />
        </div>

        {loadingSummaries ? (
          <p className="rh-loading">Cargando organizaciones...</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}>
            {orgSummaries.map((org) => (
              <div
                key={org.id}
                onClick={() => setSelectedOrgId(org.id)}
                className="rh-card"
                style={{
                  padding: '20px 24px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: '1px solid #E2E0DE',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#D3010A';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(211,1,10,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E0DE';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                      {org.name}
                    </h3>
                    <span style={{
                      display: 'inline-block',
                      marginTop: 4,
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: org.type === 'aggregator' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)',
                      color: org.type === 'aggregator' ? '#6366F1' : '#10B981',
                    }}>
                      {org.type === 'aggregator' ? 'Agregador' : 'Asociado'}
                    </span>
                  </div>
                  <span style={{ fontSize: 24, opacity: 0.3 }}>→</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ textAlign: 'center', padding: '8px 0', backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#6366F1', margin: 0 }}>
                      {org.productCount.toLocaleString()}
                    </p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Productos</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 0', backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#10B981', margin: 0 }}>
                      {org.totalStock.toLocaleString()}
                    </p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Stock Total</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 0', backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: org.lowStock > 0 ? '#D3010A' : '#94A3B8', margin: 0 }}>
                      {org.lowStock}
                    </p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Stock Bajo</p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 0', backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B', margin: 0 }}>
                      {org.orderCount}
                    </p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Órdenes</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">
            {isPlatform && selectedOrg
              ? `Inventario — ${selectedOrg.name}`
              : 'Inventario'}
          </h1>
        </div>
        <div className="rh-page-actions">
          {isPlatform && selectedOrgId && (
            <button
              onClick={() => { setSelectedOrgId(null); setProducts([]); }}
              className="rh-btn rh-btn-ghost"
            >
              ← Todas las organizaciones
            </button>
          )}
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
        orgId={isPlatform ? selectedOrgId ?? undefined : organization?.id}
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
