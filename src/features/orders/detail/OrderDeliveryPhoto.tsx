import type { Order } from '@/lib/database.types.ts';

interface OrderDeliveryPhotoProps {
  order: Order;
}

export function OrderDeliveryPhoto({ order }: OrderDeliveryPhotoProps) {
  if (order.status !== 'delivered' || !order.delivery_photo_url) return null;

  return (
    <div className="rh-card" style={{ padding: 20 }}>
      <h3 className="rh-card-title" style={{ marginBottom: 12 }}>Foto de Entrega</h3>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
        Evidencia fotográfica tomada por el despachador al momento de la entrega.
      </p>
      <div style={{
        borderRadius: 12, overflow: 'hidden',
        border: '2px solid #E2E8F0', background: '#F8FAFC', maxWidth: 480,
      }}>
        <img
          src={order.delivery_photo_url}
          alt="Foto de entrega"
          style={{ width: '100%', height: 'auto', display: 'block', cursor: 'pointer' }}
          onClick={() => window.open(order.delivery_photo_url!, '_blank')}
          title="Clic para ver en tamaño completo"
        />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
        padding: '8px 12px', background: '#ECFDF5', borderRadius: 8, fontSize: 13,
      }}>
        <span style={{ fontSize: 16 }}>✅</span>
        <div>
          <div style={{ fontWeight: 600, color: '#059669' }}>Entrega verificada con foto</div>
          {order.actual_delivery_at && (
            <div style={{ fontSize: 12, color: '#64748B' }}>
              {new Date(order.actual_delivery_at).toLocaleString('es-VE')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
