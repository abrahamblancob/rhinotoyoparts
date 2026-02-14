import { useEffect, useState } from 'react';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';

export function DashboardPage() {
  const { isPlatform, isAggregator } = usePermissions();
  const organization = useAuthStore((s) => s.organization);
  const [stats, setStats] = useState({ orgs: 0, users: 0, products: 0, orders: 0 });

  useEffect(() => {
    async function loadStats() {
      const [orgsRes, productsRes, ordersRes] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        orgs: orgsRes.count ?? 0,
        users: 0,
        products: productsRes.count ?? 0,
        orders: ordersRes.count ?? 0,
      });
    }
    loadStats();
  }, []);

  return (
    <div>
      <div className="rh-page-header">
        <h1 className="rh-page-title">
          {isPlatform ? 'Dashboard de Plataforma' : isAggregator ? 'Dashboard de Agregador' : 'Dashboard'}
        </h1>
        <p className="rh-page-subtitle">
          Bienvenido, {organization?.name}
        </p>
      </div>

      <div className="rh-stats-grid mb-8">
        {isPlatform && (
          <StatsCard
            title="Total Organizaciones"
            value={stats.orgs}
            icon="🏢"
            color="#6366F1"
          />
        )}
        {isAggregator && (
          <StatsCard
            title="Mis Asociados"
            value={stats.orgs - 1}
            icon="🏢"
            color="#6366F1"
          />
        )}
        <StatsCard
          title="Productos"
          value={stats.products}
          icon="📦"
          color="#10B981"
        />
        <StatsCard
          title="Órdenes"
          value={stats.orders}
          icon="🛒"
          color="#F59E0B"
        />
        <StatsCard
          title="Ingresos del Mes"
          value="$0.00"
          icon="💰"
          color="#D3010A"
        />
      </div>

      {/* Activity placeholder */}
      <div className="rh-card">
        <h3 className="rh-card-title">
          Actividad Reciente
        </h3>
        <p className="rh-page-subtitle">
          No hay actividad reciente.
        </p>
      </div>
    </div>
  );
}
