import { useState, useCallback } from 'react';
import { ChevronDown, Camera } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { getInventorySnapshots } from '@/services/receivingService.ts';
import type { InventorySnapshot } from '@/services/receivingService.ts';
import { supabase } from '@/lib/supabase.ts';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTime() + (-4 * 60 * 60 * 1000 - d.getTimezoneOffset() * 60000);
  const local = new Date(offset);
  return local.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + local.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

const SNAPSHOT_ROLES = ['platform_owner', 'aggregator_admin', 'warehouse_manager'];

interface InventoryLogProps {
  orgId: string | undefined;
  warehouseId?: string;
}

export function InventoryLog({ orgId, warehouseId }: InventoryLogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { roles } = usePermissions();

  const canSnapshot = roles.some((r) => SNAPSHOT_ROLES.includes(r));

  const fetcher = useCallback(() => {
    if (!orgId) return Promise.resolve({ data: [] as InventorySnapshot[], error: null });
    return getInventorySnapshots({
      orgId,
      warehouseId: warehouseId !== 'all' ? warehouseId : undefined,
    });
  }, [orgId, warehouseId]);

  const { data: snapshots, loading, reload } = useAsyncData<InventorySnapshot[]>(fetcher, [orgId, warehouseId]);

  const items = snapshots ?? [];

  const handleSnapshot = async () => {
    if (!orgId || !user || snapshotLoading) return;

    // Resolve warehouse_id: if specific warehouse selected use it, otherwise find first for this org
    let whId = warehouseId !== 'all' ? warehouseId : undefined;
    if (!whId) {
      const { data: wh } = await supabase
        .from('warehouses')
        .select('id')
        .eq('org_id', orgId)
        .limit(1)
        .single();
      whId = wh?.id;
    }
    if (!whId) return;

    setSnapshotLoading(true);
    await supabase.rpc('create_inventory_snapshot', {
      p_warehouse_id: whId,
      p_org_id: orgId,
      p_receiving_order_id: null,
      p_user_id: user.id,
    });
    await reload();
    setSnapshotLoading(false);
  };

  return (
    <div>
      {/* Header with snapshot button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          Log de Auditoría de Inventario
        </h2>
        {canSnapshot && orgId && (
          <button
            onClick={handleSnapshot}
            disabled={snapshotLoading}
            className="rh-btn-primary"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', fontSize: 13, fontWeight: 600,
              opacity: snapshotLoading ? 0.6 : 1,
            }}
          >
            <Camera size={15} />
            {snapshotLoading ? 'Registrando...' : 'Realizar Snapshot'}
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#94A3B8', padding: 24 }}>Cargando historial...</p>
      ) : items.length === 0 ? (
        <div className="rh-card" style={{ padding: 32, textAlign: 'center' }}>
          <span style={{ fontSize: 32 }}>📜</span>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', margin: '12px 0 4px' }}>
            Sin registros de auditoría
          </h3>
          <p style={{ fontSize: 14, color: '#94A3B8' }}>
            Los snapshots se generan automáticamente cada vez que se completa una recepción
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((snap) => {
            const isExpanded = expandedId === snap.id;
            const matrix = snap.position_matrix ?? [];

            return (
              <div key={snap.id} className="rh-card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : snap.id)}
                  style={{
                    width: '100%', padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
                        {formatDate(snap.created_at)}
                      </span>
                      {snap.receiving?.reference_number && (
                        <span className="rh-badge" style={{ backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontSize: 11 }}>
                          Ref: {snap.receiving.reference_number}
                        </span>
                      )}
                      {snap.receiving?.supplier_name && (
                        <span style={{ fontSize: 12, color: '#64748B' }}>
                          {snap.receiving.supplier_name}
                        </span>
                      )}
                      {!snap.triggered_by_receiving_id && (
                        <span className="rh-badge" style={{ backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', fontSize: 11 }}>
                          Manual
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                      <Stat label="Disponible" value={snap.total_available} color="#10B981" />
                      <Stat label="Posiciones" value={snap.total_positions} color="#6366F1" />
                      <Stat label="En Despacho" value={snap.total_in_dispatch} color="#3B82F6" />
                      <Stat label="En Tránsito" value={snap.total_in_transit} color="#F59E0B" />
                      <Stat label="Sin Ubicar" value={snap.total_unlocated} color="#EF4444" />
                    </div>
                  </div>
                  <ChevronDown size={18} style={{
                    color: '#94A3B8', transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    flexShrink: 0, marginLeft: 12,
                  }} />
                </button>

                {/* Expanded matrix */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #E2E8F0' }}>
                    <div style={{ padding: '12px 20px', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                        Matriz de Posiciones ({matrix.length} registros)
                      </span>
                      {snap.creator?.full_name && (
                        <span style={{ fontSize: 12, color: '#94A3B8' }}>
                          Registrado por: {snap.creator.full_name}
                        </span>
                      )}
                    </div>
                    {matrix.length > 0 ? (
                      <div className="rh-table-wrapper">
                        <table className="rh-table" style={{ fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th>Posición</th>
                              <th>SKU</th>
                              <th>Producto</th>
                              <th className="text-right">Cantidad</th>
                              <th className="text-right">Reservado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matrix.map((row, i) => (
                              <tr key={i}>
                                <td className="cell-mono" style={{ fontWeight: 600 }}>{row.position}</td>
                                <td className="cell-mono">{row.sku}</td>
                                <td className="cell-muted" style={{ fontSize: 12 }}>{row.product_name}</td>
                                <td className="text-right cell-bold">{row.quantity}</td>
                                <td className="text-right" style={{ color: row.reserved > 0 ? '#F59E0B' : '#94A3B8' }}>
                                  {row.reserved}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ padding: 20, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                        Almacén vacío al momento del registro
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 16, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 11, color: '#94A3B8' }}>{label}</span>
    </div>
  );
}
