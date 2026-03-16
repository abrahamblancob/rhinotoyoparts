import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Package, MapPin } from 'lucide-react';
import type { StockAuditItem } from '@/types/warehouse.ts';

interface AuditConfirmationProps {
  items: StockAuditItem[];
  onUpdateItem: (itemId: string, actualQuantity: number) => Promise<void>;
  onComplete: () => void;
  completing: boolean;
}

export function AuditConfirmation({ items, onUpdateItem, onComplete, completing }: AuditConfirmationProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const matchCount = items.filter((i) => i.status === 'match').length;
  const discrepancyCount = items.filter((i) => i.status === 'discrepancy').length;
  const emptyCount = items.filter((i) => i.status === 'empty').length;
  const allAudited = pendingCount === 0;

  const handleStartEdit = (item: StockAuditItem) => {
    setEditingId(item.id);
    setEditValue(item.actual_quantity != null ? String(item.actual_quantity) : String(item.expected_quantity));
  };

  const handleSave = async (itemId: string) => {
    const qty = parseInt(editValue, 10);
    if (isNaN(qty) || qty < 0) return;
    setSaving(true);
    await onUpdateItem(itemId, qty);
    setEditingId(null);
    setSaving(false);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'match': return { bg: '#ECFDF5', border: '#10B981', text: '#059669', label: 'Coincide', icon: <CheckCircle2 size={14} color="#10B981" /> };
      case 'discrepancy': return { bg: '#FEF2F2', border: '#EF4444', text: '#DC2626', label: 'Discrepancia', icon: <AlertTriangle size={14} color="#EF4444" /> };
      case 'empty': return { bg: '#F8FAFC', border: '#94A3B8', text: '#64748B', label: 'Vacío', icon: <Package size={14} color="#94A3B8" /> };
      default: return { bg: '#FFFBEB', border: '#F59E0B', text: '#D97706', label: 'Pendiente', icon: <MapPin size={14} color="#F59E0B" /> };
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', marginBottom: 16 }}>
        Confirmación de Auditoría
      </h3>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#64748B' }}>
          Total: <strong>{items.length}</strong>
        </span>
        <span style={{ fontSize: 13, color: '#F59E0B' }}>
          Pendientes: <strong>{pendingCount}</strong>
        </span>
        <span style={{ fontSize: 13, color: '#10B981' }}>
          Coinciden: <strong>{matchCount}</strong>
        </span>
        <span style={{ fontSize: 13, color: '#EF4444' }}>
          Discrepancias: <strong>{discrepancyCount}</strong>
        </span>
        {emptyCount > 0 && (
          <span style={{ fontSize: 13, color: '#94A3B8' }}>
            Vacíos: <strong>{emptyCount}</strong>
          </span>
        )}
      </div>

      {/* Items list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item) => {
          const s = getStatusStyle(item.status);
          const isEditing = editingId === item.id;
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                backgroundColor: s.bg,
                borderLeft: `4px solid ${s.border}`,
                borderRadius: 8,
                transition: 'background-color 0.2s',
              }}
            >
              {/* Status icon */}
              <div style={{ flexShrink: 0 }}>{s.icon}</div>

              {/* Location info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', fontFamily: 'monospace' }}>
                    {item.location?.code ?? '-'}
                  </span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>
                    Estante: {item.rack?.code ?? '-'}
                  </span>
                </div>
                {item.product_name && (
                  <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>
                    {item.product_name} {item.product_sku ? `(${item.product_sku})` : ''}
                  </p>
                )}
                {!item.product_name && (
                  <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>Sin producto asignado</p>
                )}
              </div>

              {/* Expected qty */}
              <div style={{ textAlign: 'center', minWidth: 70 }}>
                <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>Esperado</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#475569', margin: 0 }}>{item.expected_quantity}</p>
              </div>

              {/* Actual qty / input */}
              <div style={{ textAlign: 'center', minWidth: 90 }}>
                <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>Real</p>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input
                      type="number"
                      min={0}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(item.id); }}
                      autoFocus
                      style={{
                        width: 50,
                        padding: '2px 4px',
                        fontSize: 14,
                        fontWeight: 700,
                        textAlign: 'center',
                        border: '2px solid #3B82F6',
                        borderRadius: 4,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleSave(item.id)}
                      disabled={saving}
                      style={{
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: '#3B82F6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                      }}
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <p
                    onClick={() => handleStartEdit(item)}
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: item.actual_quantity != null ? s.text : '#CBD5E1',
                      margin: 0,
                      cursor: 'pointer',
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: item.status === 'pending' ? '1px dashed #CBD5E1' : '1px solid transparent',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {item.actual_quantity != null ? item.actual_quantity : '—'}
                  </p>
                )}
              </div>

              {/* Status badge */}
              <div
                style={{
                  padding: '3px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: s.border + '15',
                  color: s.text,
                  minWidth: 80,
                  textAlign: 'center',
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete button */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onComplete}
          disabled={!allAudited || completing}
          className="rh-btn rh-btn-primary"
          style={{
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: !allAudited || completing ? 0.5 : 1,
          }}
        >
          <CheckCircle2 size={16} />
          {completing ? 'Finalizando...' : 'Finalizar Auditoría'}
        </button>
        {!allAudited && (
          <p style={{ fontSize: 11, color: '#F59E0B', marginLeft: 12, alignSelf: 'center' }}>
            Audita todas las ubicaciones para finalizar
          </p>
        )}
      </div>
    </div>
  );
}
