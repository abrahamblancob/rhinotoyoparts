import type { Customer, Organization } from '@/lib/database.types.ts';
import type { OrderItem } from './types.ts';
import type { Order } from '@/lib/database.types.ts';

interface OrderConfirmStepProps {
  isEditMode: boolean;
  editOrder?: Order | null;
  inventoryOrg: Organization | null;
  selectedOrg: Organization | null;
  selectedCustomer: Customer | null;
  showNewCustomer: boolean;
  newCustomerName: string;
  customerPhone: string;
  shippingAddress: string;
  items: OrderItem[];
  notes: string;
  shippingCost: number;
  subtotal: number;
  total: number;
}

export function OrderConfirmStep({
  isEditMode, editOrder, inventoryOrg, selectedOrg,
  selectedCustomer, showNewCustomer, newCustomerName,
  customerPhone, shippingAddress,
  items, notes, shippingCost, subtotal, total,
}: OrderConfirmStepProps) {
  return (
    <div>
      {/* Warning banner */}
      <div style={{
        padding: '12px 16px', background: '#FFFBEB', borderRadius: 8,
        border: '1px solid #FDE68A', marginBottom: 20, fontSize: 13, color: '#92400E',
      }}>
        {isEditMode
          ? <>Revisa los cambios antes de guardar la orden <strong>{editOrder?.order_number}</strong>.</>
          : <>Revisa los datos antes de confirmar. Los productos se descontarán del inventario de <strong>{inventoryOrg?.name}</strong>.</>
        }
      </div>

      {/* Organization */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8886', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
          Organización / Tienda
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#D3010A' }}>
          {inventoryOrg?.name}
        </div>
        <div style={{ fontSize: 12, color: '#64748B' }}>
          {inventoryOrg?.type === 'aggregator' ? 'Agregador' : 'Asociado'}
          {selectedOrg && inventoryOrg?.id !== selectedOrg.id && ` · Agregador: ${selectedOrg.name}`}
          {inventoryOrg?.rif && ` · RIF: ${inventoryOrg.rif}`}
        </div>
      </div>

      {/* Customer */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8886', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
          Cliente
        </div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          {selectedCustomer?.name
            ?? (showNewCustomer && newCustomerName ? `${newCustomerName} (nuevo)` : null)
            ?? (customerPhone ? `Cliente: ${customerPhone}` : null)
            ?? <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Sin cliente registrado</span>}
        </div>
        {customerPhone && <div style={{ fontSize: 13, color: '#64748B' }}>{customerPhone}</div>}
        {shippingAddress && <div style={{ fontSize: 13, color: '#64748B', wordBreak: 'break-all' }}>{shippingAddress}</div>}
      </div>

      {/* Products */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8886', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          Productos ({items.length})
        </div>
        <div style={{ border: '1px solid #E2E0DE', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748B' }}>Producto</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#64748B', width: 50 }}>Qty</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748B', width: 90 }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.product.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ fontWeight: 500 }}>{item.product.name}</div>
                    <div style={{ fontSize: 11, color: '#8A8886' }}>SKU: {item.product.sku}</div>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                    ${(Number(item.product.price) * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
          <span style={{ color: '#64748B' }}>Subtotal:</span>
          <span style={{ fontWeight: 500, minWidth: 70, textAlign: 'right' }}>${subtotal.toFixed(2)}</span>
        </div>
        {shippingCost > 0 && (
          <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
            <span style={{ color: '#64748B' }}>Envío:</span>
            <span style={{ fontWeight: 500, minWidth: 70, textAlign: 'right' }}>${shippingCost.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, fontSize: 16, fontWeight: 700, borderTop: '2px solid #E2E0DE', paddingTop: 8, marginTop: 4 }}>
          <span>TOTAL:</span>
          <span style={{ color: '#D3010A', minWidth: 70, textAlign: 'right' }}>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8886', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            Notas
          </div>
          <div style={{ fontSize: 13, color: '#475569' }}>{notes}</div>
        </div>
      )}
    </div>
  );
}
