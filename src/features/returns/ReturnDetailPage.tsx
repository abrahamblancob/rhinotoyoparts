import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  Package,
  ImageIcon,
  AlertTriangle,
} from 'lucide-react';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { getStatusStyle, getStatusLabel, RETURN_REASON_LABELS } from '@/lib/statusConfig.ts';
import { PhotoLightbox } from '@/components/hub/shared/PhotoLightbox.tsx';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { formatDateTime } from '@/utils/dateUtils.ts';
import * as returnService from '@/services/returnService.ts';
import type { ReturnOrder, ReturnOrderItem } from '@/types/warehouse.ts';

const DISPOSITION_ICONS: Record<string, { icon: string; color: string }> = {
  replenish: { icon: '♻️', color: '#10B981' },
  defective: { icon: '⚠️', color: '#EF4444' },
  damaged: { icon: '💔', color: '#DC2626' },
  pending: { icon: '⏳', color: '#F59E0B' },
};

export function ReturnDetailPage() {
  const { returnId } = useParams<{ returnId: string }>();
  const navigate = useNavigate();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const returnFetcher = useCallback(
    () =>
      returnId
        ? returnService.getReturnOrder(returnId)
        : Promise.resolve({ data: null, error: null }),
    [returnId],
  );

  const itemsFetcher = useCallback(
    () =>
      returnId
        ? returnService.getReturnOrderItems(returnId)
        : Promise.resolve({ data: null, error: null }),
    [returnId],
  );

  const { data: returnOrder, loading: returnLoading } = useAsyncData<ReturnOrder>(returnFetcher, [returnId]);
  const { data: items, loading: itemsLoading } = useAsyncData<ReturnOrderItem[]>(itemsFetcher, [returnId]);

  const loading = returnLoading || itemsLoading;
  const allItems = items ?? [];

  if (loading) return <p className="rh-loading">Cargando...</p>;

  if (!returnOrder) {
    return (
      <div>
        <button className="rh-btn" onClick={() => navigate('/hub/returns')}>
          <ArrowLeft size={16} style={{ marginRight: 4 }} /> Volver
        </button>
        <p style={{ marginTop: 16, color: '#8A8886' }}>Devolucion no encontrada.</p>
      </div>
    );
  }

  const statusStyle = getStatusStyle(returnOrder.status);
  const photos = returnOrder.photo_urls ?? [];
  const replenishCount = allItems.filter((i) => i.disposition === 'replenish').length;
  const defectiveCount = allItems.filter((i) => i.disposition === 'defective' || i.disposition === 'damaged').length;

  return (
    <div>
      <button
        className="rh-btn"
        onClick={() => navigate('/hub/returns')}
        style={{ marginBottom: 16 }}
      >
        <ArrowLeft size={16} style={{ marginRight: 4 }} /> Volver a Devoluciones
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
              Devolucion - Orden {returnOrder.order_number}
            </h1>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', color: '#605E5C', fontSize: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={14} />
                Recibido por: {returnOrder.receiver?.full_name ?? 'Sin asignar'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={14} />
                Creado: {formatDateTime(returnOrder.created_at)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Package size={14} />
                {returnOrder.package_count} bulto{returnOrder.package_count !== 1 ? 's' : ''}
              </span>
              {returnOrder.completed_at && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981', fontWeight: 600 }}>
                  <CheckCircle2 size={14} />
                  Completado: {formatDateTime(returnOrder.completed_at)}
                </span>
              )}
            </div>
          </div>
          <span
            className="rh-badge"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, fontSize: 14, padding: '6px 14px' }}
          >
            {getStatusLabel(returnOrder.status)}
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: 160, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16,
          border: '1px solid #BBF7D0',
        }}>
          <p style={{ fontSize: 12, color: '#15803D', margin: 0, fontWeight: 600 }}>Para Reposicion</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#15803D', margin: '4px 0 0' }}>{replenishCount}</p>
          <p style={{ fontSize: 12, color: '#16A34A', margin: '2px 0 0' }}>items vuelven al inventario</p>
        </div>
        <div style={{
          flex: 1, minWidth: 160, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16,
          border: '1px solid #FECACA',
        }}>
          <p style={{ fontSize: 12, color: '#991B1B', margin: 0, fontWeight: 600 }}>Defectuoso / Danado</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#DC2626', margin: '4px 0 0' }}>{defectiveCount}</p>
          <p style={{ fontSize: 12, color: '#EF4444', margin: '2px 0 0' }}>items en zona de devoluciones</p>
        </div>
        <div style={{
          flex: 1, minWidth: 160, backgroundColor: '#F5F5F4', borderRadius: 12, padding: 16,
          border: '1px solid #E2E0DE',
        }}>
          <p style={{ fontSize: 12, color: '#605E5C', margin: 0, fontWeight: 600 }}>Total Items</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#323130', margin: '4px 0 0' }}>{allItems.length}</p>
          <p style={{ fontSize: 12, color: '#8A8886', margin: '2px 0 0' }}>productos devueltos</p>
        </div>
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            border: '1px solid #E1DFDD',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <ImageIcon size={16} style={{ color: '#64748B' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#323130', margin: 0 }}>
              Fotos de la Devolucion ({photos.length})
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {photos.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setLightboxUrl(url)}
                style={{
                  display: 'block', width: 120, height: 120,
                  borderRadius: 10, overflow: 'hidden',
                  border: '1px solid #E2E8F0',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  cursor: 'pointer', padding: 0, background: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <img
                  src={url}
                  alt={`Foto devolucion ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: '1px solid #E1DFDD',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#323130', marginBottom: 16 }}>
          Productos Devueltos
        </h2>

        {allItems.length === 0 ? (
          <p style={{ color: '#8A8886' }}>No hay items en esta devolucion.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allItems.map((item) => {
              const disp = DISPOSITION_ICONS[item.disposition] ?? DISPOSITION_ICONS.pending;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid #E1DFDD',
                    backgroundColor: item.disposition === 'replenish' ? '#F0FDF4'
                      : item.disposition === 'defective' || item.disposition === 'damaged' ? '#FEF2F2'
                      : '#fff',
                  }}
                >
                  <div style={{ flexShrink: 0, fontSize: 20 }}>{disp.icon}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: '#323130' }}>
                      {item.product?.name ?? '-'}
                    </div>
                    <div style={{ fontSize: 12, color: '#8A8886' }}>
                      SKU: {item.product?.sku ?? '-'} | Cantidad: {item.quantity}
                    </div>
                    <div style={{ fontSize: 12, color: '#605E5C', marginTop: 2 }}>
                      Motivo: {RETURN_REASON_LABELS[item.return_reason] ?? item.return_reason}
                    </div>
                    {item.observation && (
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, fontStyle: 'italic' }}>
                        <AlertTriangle size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {item.observation}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <StatusBadge status={item.disposition} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      {returnOrder.notes && (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 24,
            border: '1px solid #E1DFDD',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#323130', marginBottom: 8 }}>
            Notas
          </h2>
          <p style={{ fontSize: 14, color: '#475569', margin: 0 }}>{returnOrder.notes}</p>
        </div>
      )}

      <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}
