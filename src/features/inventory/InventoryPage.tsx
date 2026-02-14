import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import type { Product } from '@/lib/database.types.ts';

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { canWrite, isPlatform } = usePermissions();
  const organization = useAuthStore((s) => s.organization);
  const navigate = useNavigate();

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
                onClick={() => {/* TODO: open product create modal */}}
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
          actionLabel="Agregar Producto"
          onAction={() => {}}
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
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="cursor-pointer">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
