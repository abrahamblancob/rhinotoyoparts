interface TrackingItem {
  name: string;
  quantity: number;
}

interface TrackingItemsListProps {
  items: TrackingItem[];
}

export function TrackingItemsList({ items }: TrackingItemsListProps) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 16 }}>
        Tu pedido
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderBottom: i < items.length - 1 ? '1px solid #F1F5F9' : 'none',
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}>
              🔧
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#1E293B', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </p>
            </div>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#64748B',
              background: '#F1F5F9',
              padding: '2px 10px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
            }}>
              x{item.quantity}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
        {items.length} {items.length === 1 ? 'producto' : 'productos'} en tu pedido
      </div>
    </div>
  );
}
