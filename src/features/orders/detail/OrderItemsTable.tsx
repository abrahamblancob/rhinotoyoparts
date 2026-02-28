import type { OrderItemWithProduct } from './types.ts';

interface OrderItemsTableProps {
  items: OrderItemWithProduct[];
  total: number;
}

export function OrderItemsTable({ items, total }: OrderItemsTableProps) {
  return (
    <div className="rh-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
        <h3 className="rh-card-title" style={{ margin: 0 }}>Productos ({items.length})</h3>
      </div>
      <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#F8FAFC' }}>
            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Producto</th>
            <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#64748B' }}>Qty</th>
            <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#64748B' }}>P. Unit</th>
            <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#64748B' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderTop: '1px solid #F1F5F9' }}>
              <td style={{ padding: '10px 16px' }}>
                <div style={{ fontWeight: 500 }}>{item.products?.name ?? 'Producto'}</div>
                <div style={{ fontSize: 12, color: '#8A8886' }}>{item.products?.sku ?? ''}</div>
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ padding: '10px 16px', textAlign: 'right' }}>${Number(item.unit_price).toFixed(2)}</td>
              <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>${Number(item.total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #E2E0DE' }}>
            <td colSpan={3} style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Total:</td>
            <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: 16, color: '#D3010A' }}>
              ${Number(total).toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
