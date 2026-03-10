import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Hand,
  MapPin,
  Package,
  Play,
  User,
  Hash,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { toast } from '@/stores/toastStore.ts';
import * as pickingService from '@/services/pickingService.ts';
import { PickingMiniMap } from './PickingMiniMap.tsx';
import type { PickList, PickListItem, PickListStatus, PickItemStatus } from '@/types/warehouse.ts';

const STATUS_LABELS: Record<PickListStatus, string> = {
  pending: 'Pendiente',
  assigned: 'Asignado',
  in_progress: 'En Progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

const STATUS_COLORS: Record<PickListStatus, { bg: string; text: string }> = {
  pending: { bg: '#F59E0B15', text: '#F59E0B' },
  assigned: { bg: '#3B82F615', text: '#3B82F6' },
  in_progress: { bg: '#F9731615', text: '#F97316' },
  completed: { bg: '#10B98115', text: '#10B981' },
  cancelled: { bg: '#8A888615', text: '#8A8886' },
  expired: { bg: '#D3010A15', text: '#D3010A' },
};

const ITEM_STATUS_LABELS: Record<PickItemStatus, string> = {
  pending: 'Pendiente',
  picked: 'Recogido',
  short: 'Faltante',
  substituted: 'Sustituido',
};

const ITEM_STATUS_COLORS: Record<PickItemStatus, { bg: string; text: string }> = {
  pending: { bg: '#F59E0B15', text: '#F59E0B' },
  picked: { bg: '#10B98115', text: '#10B981' },
  short: { bg: '#D3010A15', text: '#D3010A' },
  substituted: { bg: '#8B5CF615', text: '#8B5CF6' },
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function PickListDetail() {
  const { pickListId } = useParams<{ pickListId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { roles } = usePermissions();
  const [actionLoading, setActionLoading] = useState(false);
  const isPicker = roles.includes('warehouse_picker') || roles.includes('warehouse_manager') || roles.includes('platform_owner');

  const pickListFetcher = useCallback(
    () =>
      pickListId
        ? pickingService.getPickList(pickListId)
        : Promise.resolve({ data: null, error: null }),
    [pickListId],
  );

  const itemsFetcher = useCallback(
    () =>
      pickListId
        ? pickingService.getPickListItems(pickListId)
        : Promise.resolve({ data: null, error: null }),
    [pickListId],
  );

  const {
    data: pickList,
    loading: plLoading,
    reload: reloadPickList,
  } = useAsyncData<PickList>(pickListFetcher, [pickListId]);

  const {
    data: items,
    loading: itemsLoading,
    reload: reloadItems,
  } = useAsyncData<PickListItem[]>(itemsFetcher, [pickListId]);

  const loading = plLoading || itemsLoading;
  const allItems = items ?? [];

  const pct =
    pickList && pickList.total_items > 0
      ? Math.round((pickList.picked_items / pickList.total_items) * 100)
      : 0;

  // Compute location IDs for the mini-map
  const sourceLocationIds = useMemo(
    () => [...new Set(allItems.map((i) => i.source_location_id).filter(Boolean))],
    [allItems],
  );
  const pickedLocationIds = useMemo(
    () => [...new Set(allItems.filter((i) => i.status === 'picked').map((i) => i.source_location_id).filter(Boolean))],
    [allItems],
  );

  const handleClaimPickList = async () => {
    if (!pickListId || !user) return;
    setActionLoading(true);
    try {
      const { data, error } = await pickingService.claimPickList(pickListId, user.id);
      if (error || !data) {
        toast('error', 'No se pudo tomar la lista. Puede que otro almacenista ya la haya tomado.');
      } else {
        toast('success', 'Lista tomada exitosamente');
        await reloadPickList();
      }
    } catch {
      toast('error', 'Error al tomar la lista de picking');
    }
    setActionLoading(false);
  };

  const handleStartPicking = async () => {
    if (!pickListId) return;
    setActionLoading(true);
    await pickingService.startPicking(pickListId);
    await reloadPickList();
    setActionLoading(false);
  };

  const handlePickItem = async (itemId: string, qtyRequired: number) => {
    if (!user) return;
    setActionLoading(true);
    await pickingService.pickItem(itemId, qtyRequired, user.id);
    await Promise.all([reloadItems(), reloadPickList()]);
    setActionLoading(false);
  };

  const handleComplete = async () => {
    if (!pickListId) return;
    setActionLoading(true);
    await pickingService.completePickList(pickListId);
    await reloadPickList();
    setActionLoading(false);
  };

  if (loading) {
    return <p className="rh-loading">Cargando...</p>;
  }

  if (!pickList) {
    return (
      <div>
        <button className="rh-btn" onClick={() => navigate('/hub/picking')}>
          <ArrowLeft size={16} style={{ marginRight: 4 }} /> Volver
        </button>
        <p style={{ marginTop: 16, color: '#8A8886' }}>Lista de picking no encontrada.</p>
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[pickList.status];

  return (
    <div>
      {/* Back button */}
      <button
        className="rh-btn"
        onClick={() => navigate('/hub/picking')}
        style={{ marginBottom: 16 }}
      >
        <ArrowLeft size={16} style={{ marginRight: 4 }} /> Volver a Picking
      </button>

      {/* Header */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: '1px solid #E1DFDD',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#323130', marginBottom: 8 }}>
              Orden {pickList.order?.order_number ?? '-'}
            </h1>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', color: '#605E5C', fontSize: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={14} />
                {pickList.assignee?.full_name ?? 'Sin asignar'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={14} />
                Creado: {formatDateTime(pickList.created_at)}
              </span>
              {pickList.started_at && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Play size={14} />
                  Iniciado: {formatDateTime(pickList.started_at)}
                </span>
              )}
              {pickList.completed_at && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={14} />
                  Completado: {formatDateTime(pickList.completed_at)}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              className="rh-badge"
              style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, fontSize: 14, padding: '6px 14px' }}
            >
              {STATUS_LABELS[pickList.status]}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#605E5C' }}>
            <span>Progreso de recoleccion</span>
            <span>{pickList.picked_items} / {pickList.total_items} items ({pct}%)</span>
          </div>
          <div
            style={{
              width: '100%',
              height: 10,
              borderRadius: 5,
              backgroundColor: '#E1DFDD',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 5,
                backgroundColor: pct === 100 ? '#10B981' : '#F97316',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pickList.status === 'pending' && isPicker && (
            <button
              className="rh-btn rh-btn-primary"
              disabled={actionLoading}
              onClick={handleClaimPickList}
              style={{ backgroundColor: '#F97316' }}
            >
              <Hand size={16} style={{ marginRight: 4 }} />
              {actionLoading ? 'Tomando...' : 'Tomar esta lista'}
            </button>
          )}
          {(pickList.status === 'assigned') && (
            <button
              className="rh-btn rh-btn-primary"
              disabled={actionLoading}
              onClick={handleStartPicking}
            >
              <Play size={16} style={{ marginRight: 4 }} />
              Iniciar Picking
            </button>
          )}
          {pickList.status === 'in_progress' && pct === 100 && (
            <button
              className="rh-btn rh-btn-primary"
              disabled={actionLoading}
              onClick={handleComplete}
              style={{ backgroundColor: '#10B981' }}
            >
              <CheckCircle2 size={16} style={{ marginRight: 4 }} />
              Completar Pick List
            </button>
          )}
        </div>
      </div>

      {/* Mini-map — show full warehouse layout with pick targets highlighted */}
      {pickList.warehouse_id && (
        <PickingMiniMap
          warehouseId={pickList.warehouse_id}
          locationIds={sourceLocationIds}
          pickedLocationIds={pickedLocationIds}
        />
      )}

      {/* Route / Items list */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 24,
          border: '1px solid #E1DFDD',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#323130', marginBottom: 16 }}>
          Ruta de Recoleccion
        </h2>

        {allItems.length === 0 ? (
          <p style={{ color: '#8A8886' }}>No hay items en esta lista de picking.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allItems.map((item, idx) => {
              const itemStatusStyle = ITEM_STATUS_COLORS[item.status];
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: 16,
                    borderRadius: 8,
                    border: '1px solid #E1DFDD',
                    backgroundColor: item.status === 'picked' ? '#F0FDF4' : '#fff',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Sequence number */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: item.status === 'picked' ? '#10B981' : '#E1DFDD',
                      color: item.status === 'picked' ? '#fff' : '#605E5C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {item.sequence_order ?? idx + 1}
                  </div>

                  {/* Location */}
                  <div style={{ minWidth: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#605E5C', fontSize: 12 }}>
                      <MapPin size={12} /> Ubicacion
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, fontFamily: 'monospace' }}>
                      {item.location?.code ?? '-'}
                    </div>
                  </div>

                  {/* Product */}
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#605E5C', fontSize: 12 }}>
                      <Package size={12} /> Producto
                    </div>
                    <div style={{ fontWeight: 500, fontSize: 14, color: '#323130' }}>
                      {item.product?.name ?? '-'}
                    </div>
                    <div style={{ fontSize: 12, color: '#8A8886' }}>
                      SKU: {item.product?.sku ?? '-'}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div style={{ minWidth: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#605E5C', fontSize: 12 }}>
                      <Hash size={12} /> Cantidad
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {item.quantity_picked} / {item.quantity_required}
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{ minWidth: 90 }}>
                    <span
                      className="rh-badge"
                      style={{ backgroundColor: itemStatusStyle.bg, color: itemStatusStyle.text }}
                    >
                      {ITEM_STATUS_LABELS[item.status]}
                    </span>
                  </div>

                  {/* Action */}
                  <div>
                    {item.status === 'pending' && pickList.status === 'in_progress' && (
                      <button
                        className="rh-btn rh-btn-primary"
                        style={{ fontSize: 12, padding: '4px 12px' }}
                        disabled={actionLoading}
                        onClick={() => handlePickItem(item.id, item.quantity_required)}
                      >
                        <CheckCircle2 size={14} style={{ marginRight: 4 }} />
                        Marcar como recogido
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
