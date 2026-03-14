import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollapsibleSection } from '@/components/hub/shared/CollapsibleSection.tsx';
import { PhotoLightbox } from '@/components/hub/shared/PhotoLightbox.tsx';
import { StatusBadge } from '@/components/hub/shared/StatusBadge.tsx';
import { formatDateTime } from '@/utils/dateUtils.ts';
import { RETURN_REASON_LABELS } from '@/lib/statusConfig.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import * as returnService from '@/services/returnService.ts';
import type { ReturnOrder, ReturnOrderItem } from '@/types/warehouse.ts';

interface OrderReturnSectionProps {
  orderId: string;
}

export function OrderReturnSection({ orderId }: OrderReturnSectionProps) {
  const navigate = useNavigate();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const returnFetcher = useCallback(
    () => returnService.getReturnOrderForOrder(orderId),
    [orderId],
  );

  const { data: returnOrder, loading } = useAsyncData<ReturnOrder>(returnFetcher, [orderId]);

  const itemsFetcher = useCallback(
    () =>
      returnOrder?.id
        ? returnService.getReturnOrderItems(returnOrder.id)
        : Promise.resolve({ data: null, error: null }),
    [returnOrder?.id],
  );

  const { data: items } = useAsyncData<ReturnOrderItem[]>(itemsFetcher, [returnOrder?.id]);

  if (loading || !returnOrder) return null;

  const allItems = items ?? [];
  const photos = returnOrder.photo_urls ?? [];
  const isCompleted = returnOrder.status === 'completed';
  const replenishCount = allItems.filter((i) => i.disposition === 'replenish').length;
  const defectiveCount = allItems.filter((i) => i.disposition === 'defective' || i.disposition === 'damaged').length;

  const subtitle = [
    `${allItems.length} items`,
    returnOrder.receiver?.full_name,
    isCompleted && returnOrder.completed_at ? formatDateTime(returnOrder.completed_at) : undefined,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <CollapsibleSection
        title={isCompleted ? 'Devolucion Completada' : `Devolucion — ${returnOrder.status === 'inspecting' ? 'En inspeccion' : 'Pendiente'}`}
        subtitle={subtitle}
        icon={isCompleted ? '✅' : '🔄'}
        variant={isCompleted ? 'completed' : 'pending'}
      >
        <div style={{ padding: 20, background: '#fff' }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Bultos</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: '4px 0 0' }}>
                {returnOrder.package_count}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Reposicion</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#10B981', margin: '4px 0 0' }}>
                {replenishCount}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Defectuoso</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#EF4444', margin: '4px 0 0' }}>
                {defectiveCount}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#605E5C', margin: 0 }}>Recibido por</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', margin: '4px 0 0' }}>
                {returnOrder.receiver?.full_name ?? 'Sin asignar'}
              </p>
            </div>
          </div>

          {/* Items summary */}
          {allItems.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {allItems.map((item) => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid #F1F5F9',
                }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#323130' }}>
                      {item.product?.name ?? '-'}
                    </span>
                    <span style={{ fontSize: 12, color: '#8A8886', marginLeft: 8 }}>
                      x{item.quantity} — {RETURN_REASON_LABELS[item.return_reason] ?? item.return_reason}
                    </span>
                  </div>
                  <StatusBadge status={item.disposition} />
                </div>
              ))}
            </div>
          )}

          {/* Photo thumbnails */}
          {photos.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', margin: '0 0 8px' }}>
                Fotos ({photos.length})
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {photos.slice(0, 4).map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxUrl(url)}
                    style={{
                      display: 'block', width: 80, height: 80,
                      borderRadius: 8, overflow: 'hidden',
                      border: '1px solid #E2E8F0', cursor: 'pointer',
                      padding: 0, background: 'none',
                    }}
                  >
                    <img src={url} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
                {photos.length > 4 && (
                  <span style={{ fontSize: 12, color: '#8A8886', alignSelf: 'center' }}>
                    +{photos.length - 4} mas
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            className="rh-btn rh-btn-primary"
            onClick={() => navigate(`/hub/returns/${returnOrder.id}`)}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            Ver Devolucion Completa →
          </button>
        </div>
      </CollapsibleSection>

      <PhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </>
  );
}
