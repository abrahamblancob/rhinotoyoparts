import type { Order, Customer } from '@/lib/database.types.ts';

interface OrderCustomerCardProps {
  order: Order;
  customer: Customer | null;
}

export function OrderCustomerCard({ order, customer }: OrderCustomerCardProps) {
  const address = (order.shipping_address as Record<string, string> | null)?.address;

  return (
    <div className="rh-card" style={{ padding: 20 }}>
      <h3 className="rh-card-title" style={{ marginBottom: 12 }}>Cliente</h3>
      {customer ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
          <div><span style={{ color: '#64748B' }}>Nombre:</span> <strong>{customer.name}</strong></div>
          <div><span style={{ color: '#64748B' }}>Teléfono:</span> {customer.phone ?? order.customer_phone ?? '-'}</div>
          <div><span style={{ color: '#64748B' }}>Email:</span> {customer.email ?? '-'}</div>
          <div><span style={{ color: '#64748B' }}>Ciudad:</span> {customer.city ?? '-'}</div>
          {address && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: '#64748B' }}>Dirección de envío:</span> {address}
            </div>
          )}
          {(order.receiver_name || order.receiver_phone || order.receiver_id_number) && (
            <>
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #F1F5F9', paddingTop: 8, marginTop: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>Receptor</span>
              </div>
              {order.receiver_name && (
                <div><span style={{ color: '#64748B' }}>Nombre:</span> <strong>{order.receiver_name}</strong></div>
              )}
              {order.receiver_phone && (
                <div><span style={{ color: '#64748B' }}>Teléfono:</span> {order.receiver_phone}</div>
              )}
              {order.receiver_id_number && (
                <div><span style={{ color: '#64748B' }}>Cédula:</span> {order.receiver_id_number}</div>
              )}
            </>
          )}
        </div>
      ) : (
        <p style={{ color: '#94A3B8', fontSize: 14 }}>Sin cliente asignado</p>
      )}
    </div>
  );
}
