const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: '#10B98115', text: '#10B981', label: 'Activo' },
  inactive: { bg: '#8A888615', text: '#8A8886', label: 'Inactivo' },
  suspended: { bg: '#F59E0B15', text: '#F59E0B', label: 'Suspendido' },
  pending: { bg: '#6366F115', text: '#6366F1', label: 'Pendiente' },
  confirmed: { bg: '#10B98115', text: '#10B981', label: 'Confirmado' },
  processing: { bg: '#6366F115', text: '#6366F1', label: 'Procesando' },
  shipped: { bg: '#F59E0B15', text: '#F59E0B', label: 'Enviado' },
  delivered: { bg: '#10B98115', text: '#10B981', label: 'Entregado' },
  cancelled: { bg: '#D3010A15', text: '#D3010A', label: 'Cancelado' },
  out_of_stock: { bg: '#D3010A15', text: '#D3010A', label: 'Agotado' },
  draft: { bg: '#8A888615', text: '#8A8886', label: 'Borrador' },
  issued: { bg: '#6366F115', text: '#6366F1', label: 'Emitida' },
  paid: { bg: '#10B98115', text: '#10B981', label: 'Pagada' },
  overdue: { bg: '#D3010A15', text: '#D3010A', label: 'Vencida' },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? { bg: '#8A888615', text: '#8A8886', label: status };
  return (
    <span
      className="rh-badge"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {label ?? style.label}
    </span>
  );
}
