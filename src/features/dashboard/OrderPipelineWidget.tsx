import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { PIPELINE_STAGES } from '@/lib/statusConfig.ts';

interface PipelineCounts {
  draft: number;
  confirmed: number;
  picking: number;
  packing: number;
  packed: number;
  assigned: number;
  picked: number;
  shipped: number;
  in_transit: number;
  delivered: number;
  cancelled: number;
}

interface FulfillmentMetrics {
  avgFulfillmentHours: number;
  completedToday: number;
  cancelRate: number;
}

interface OrderPipelineWidgetProps {
  orgId?: string;
}

export function OrderPipelineWidget({ orgId }: OrderPipelineWidgetProps = {}) {
  const organization = useAuthStore((s) => s.organization);
  const { isPlatform, isAggregator } = usePermissions();
  const [counts, setCounts] = useState<PipelineCounts>({
    draft: 0, confirmed: 0, picking: 0, packing: 0, packed: 0,
    assigned: 0, picked: 0, shipped: 0, in_transit: 0, delivered: 0, cancelled: 0,
  });
  const [metrics, setMetrics] = useState<FulfillmentMetrics>({
    avgFulfillmentHours: 0, completedToday: 0, cancelRate: 0,
  });

  const loadData = useCallback(async () => {
    if (!organization) return;

    let query = supabase.from('orders').select('status, created_at, delivered_at, cancelled_at');

    if (orgId) {
      // Filter by specific org (platform user selected an org)
      query = query.eq('org_id', orgId);
    } else if (!isPlatform) {
      if (isAggregator) {
        // Aggregator sees orders from child associates
        const { data: hierarchy } = await supabase
          .from('org_hierarchy')
          .select('child_id')
          .eq('parent_id', organization.id);
        const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);
        childIds.push(organization.id);
        query = query.in('org_id', childIds);
      } else {
        query = query.eq('org_id', organization.id);
      }
    }

    const { data: orders } = await query;
    if (!orders) return;

    const newCounts: PipelineCounts = {
      draft: 0, confirmed: 0, picking: 0, packing: 0, packed: 0,
      assigned: 0, picked: 0, shipped: 0, in_transit: 0, delivered: 0, cancelled: 0,
    };

    let totalFulfillmentMs = 0;
    let completedCount = 0;
    let todayCount = 0;
    let cancelledCount = 0;
    const today = new Date().toDateString();

    for (const o of orders as { status: string; created_at: string; delivered_at: string | null; cancelled_at: string | null }[]) {
      if (o.status in newCounts) {
        newCounts[o.status as keyof PipelineCounts]++;
      }
      if (o.status === 'delivered' && o.delivered_at) {
        const diff = new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime();
        totalFulfillmentMs += diff;
        completedCount++;
        if (new Date(o.delivered_at).toDateString() === today) todayCount++;
      }
      if (o.status === 'cancelled') cancelledCount++;
    }

    setCounts(newCounts);
    setMetrics({
      avgFulfillmentHours: completedCount > 0 ? totalFulfillmentMs / completedCount / 3600000 : 0,
      completedToday: todayCount,
      cancelRate: orders.length > 0 ? (cancelledCount / orders.length) * 100 : 0,
    });
  }, [organization, isPlatform, isAggregator, orgId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('pipeline-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
      }, () => { loadData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const maxCount = Math.max(...Object.values(counts), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Pipeline */}
      <div className="rh-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="rh-card-title" style={{ margin: 0 }}>Pipeline de Pedidos</h3>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
            Tiempo real
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 160 }}>
          {PIPELINE_STAGES.map(({ key, label, color }) => {
            const count = counts[key as keyof PipelineCounts] ?? 0;
            const height = count > 0 ? Math.max((count / maxCount) * 120, 20) : 4;
            return (
              <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>{count}</span>
                <div style={{
                  width: '100%', maxWidth: 48, height, background: color,
                  borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease',
                  minHeight: 4,
                }} />
                <span style={{ fontSize: 10, color: '#64748B', marginTop: 6, textAlign: 'center', lineHeight: 1.2 }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div className="rh-card" style={{ padding: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Tiempo promedio</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: '4px 0 0' }}>
            {metrics.avgFulfillmentHours > 0 ? `${metrics.avgFulfillmentHours.toFixed(1)}h` : '-'}
          </p>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>de fulfillment</p>
        </div>
        <div className="rh-card" style={{ padding: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Completadas hoy</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#10B981', margin: '4px 0 0' }}>
            {metrics.completedToday}
          </p>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>órdenes entregadas</p>
        </div>
        <div className="rh-card" style={{ padding: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Tasa cancelación</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: metrics.cancelRate > 10 ? '#D3010A' : '#1E293B', margin: '4px 0 0' }}>
            {metrics.cancelRate.toFixed(1)}%
          </p>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>del total</p>
        </div>
      </div>
    </div>
  );
}
