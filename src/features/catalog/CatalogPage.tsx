import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import type { Product } from '@/lib/database.types.ts';

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const organization = useAuthStore((s) => s.organization);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase.from('products').select('*').eq('status', 'active').order('name');
      if (organization) {
        query = query.eq('org_id', organization.id);
      }
      const { data } = await query;
      setProducts((data as Product[]) ?? []);
      setLoading(false);
    }
    load();
  }, [organization]);

  const filtered = products.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="rh-page-header">
        <h1 className="rh-page-title">Catálogo</h1>
        <div className="rh-page-actions">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rh-search"
          />
          <div className="rh-view-toggle">
            <button
              onClick={() => setView('grid')}
              className={`rh-view-toggle-btn ${view === 'grid' ? 'active' : ''}`}
            >
              ▦
            </button>
            <button
              onClick={() => setView('list')}
              className={`rh-view-toggle-btn ${view === 'list' ? 'active' : ''}`}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="rh-loading">Cargando catálogo...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="Catálogo vacío"
          description="No hay productos activos para mostrar en el catálogo"
        />
      ) : view === 'grid' ? (
        <div className="rh-catalog-grid">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="rh-product-card"
            >
              <div className="rh-product-card-img">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-4xl">📦</span>
                )}
              </div>
              <p className="rh-product-card-name">{product.name}</p>
              <p className="rh-product-card-meta">{product.brand ?? 'Sin marca'} &middot; {product.sku}</p>
              <div className="rh-product-card-footer">
                <span className="rh-product-card-price">${product.price.toFixed(2)}</span>
                <span className={`rh-stock-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                  {product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}
                </span>
              </div>
            </div>
          ))}
        </div>
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td className="cell-primary">{product.name}</td>
                  <td className="cell-mono cell-muted">{product.sku}</td>
                  <td className="cell-muted">{product.brand ?? '—'}</td>
                  <td className="text-right cell-bold">${product.price.toFixed(2)}</td>
                  <td className="text-right">
                    <span className="font-semibold" style={{ color: product.stock > 0 ? '#10B981' : '#D3010A' }}>
                      {product.stock}
                    </span>
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
