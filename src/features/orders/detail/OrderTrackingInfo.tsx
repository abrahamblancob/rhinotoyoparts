import type { Order, Customer } from '@/lib/database.types.ts';
import type { OrderItemWithProduct } from './types.ts';
import { WhatsAppShareButton } from '@/components/orders/WhatsAppShareButton.tsx';

interface OrderTrackingInfoProps {
  order: Order;
  customer: Customer | null;
  items: OrderItemWithProduct[];
}

export function OrderTrackingInfo({ order, customer, items }: OrderTrackingInfoProps) {
  return (
    <>
      {/* Shipping info */}
      {order.tracking_number && (
        <div className="rh-card" style={{ padding: 20 }}>
          <h3 className="rh-card-title" style={{ marginBottom: 12 }}>Información de Envío</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
            <div><span style={{ color: '#64748B' }}>Guía:</span> <strong>{order.tracking_number}</strong></div>
            {order.shipped_at && (
              <div><span style={{ color: '#64748B' }}>Despachado:</span> {new Date(order.shipped_at).toLocaleString('es-VE')}</div>
            )}
          </div>
        </div>
      )}

      {/* Delivery metrics */}
      {(order.estimated_distance_km || order.actual_pickup_at || order.actual_delivery_at) && (
        <div className="rh-card" style={{ padding: 20 }}>
          <h3 className="rh-card-title" style={{ marginBottom: 12 }}>Métricas de Entrega</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {order.estimated_distance_km != null && (
              <div style={{ textAlign: 'center', padding: 12, background: '#F8FAFC', borderRadius: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#D3010A' }}>{Number(order.estimated_distance_km).toFixed(1)} km</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Distancia estimada</div>
              </div>
            )}
            {order.actual_pickup_at && (
              <div style={{ textAlign: 'center', padding: 12, background: '#F8FAFC', borderRadius: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{new Date(order.actual_pickup_at).toLocaleString('es-VE')}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Recogida real</div>
              </div>
            )}
            {order.actual_delivery_at && (
              <div style={{ textAlign: 'center', padding: 12, background: '#F8FAFC', borderRadius: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{new Date(order.actual_delivery_at).toLocaleString('es-VE')}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Entrega real</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp share + tracking link */}
      {order.tracking_code && (
        <div className="rh-card" style={{ padding: 20 }}>
          <h3 className="rh-card-title" style={{ marginBottom: 8 }}>Tracking Público</h3>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
            Código: <strong style={{ fontFamily: 'monospace', fontSize: 15, color: '#1E293B' }}>{order.tracking_code}</strong>
          </div>
          <WhatsAppShareButton
            trackingCode={order.tracking_code}
            receiverName={order.receiver_name ?? customer?.name ?? null}
            customerPhone={order.customer_phone ?? customer?.phone ?? null}
            items={items.map((i) => ({ name: i.products?.name ?? 'Producto', quantity: i.quantity }))}
            orderStatus={order.status}
          />
        </div>
      )}
    </>
  );
}
