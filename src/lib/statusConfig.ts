import type { OrderStatus } from './constants';

export interface StatusStyle {
  bg: string;
  text: string;
  label: string;
}

// Single source of truth for all status display metadata
export const STATUS_STYLES: Record<string, StatusStyle> = {
  // Order statuses
  draft: { bg: '#8A888615', text: '#8A8886', label: 'Borrador' },
  pending: { bg: '#6366F115', text: '#6366F1', label: 'Pendiente' },
  confirmed: { bg: '#10B98115', text: '#10B981', label: 'Confirmada' },
  assigned: { bg: '#8B5CF615', text: '#8B5CF6', label: 'Asignada' },
  preparing: { bg: '#F59E0B15', text: '#F59E0B', label: 'Preparando' },
  ready_to_ship: { bg: '#06B6D415', text: '#06B6D4', label: 'Lista para envío' },
  processing: { bg: '#6366F115', text: '#6366F1', label: 'Procesando' },
  shipped: { bg: '#F59E0B15', text: '#F59E0B', label: 'Despachada' },
  in_transit: { bg: '#3B82F615', text: '#3B82F6', label: 'En tránsito' },
  delivered: { bg: '#10B98115', text: '#10B981', label: 'Entregada' },
  cancelled: { bg: '#D3010A15', text: '#D3010A', label: 'Cancelada' },
  returned: { bg: '#EF444415', text: '#EF4444', label: 'Devuelta' },
  // Product statuses
  active: { bg: '#10B98115', text: '#10B981', label: 'Activo' },
  inactive: { bg: '#8A888615', text: '#8A8886', label: 'Inactivo' },
  out_of_stock: { bg: '#D3010A15', text: '#D3010A', label: 'Agotado' },
  suspended: { bg: '#F59E0B15', text: '#F59E0B', label: 'Suspendido' },
  // Invoice statuses
  issued: { bg: '#6366F115', text: '#6366F1', label: 'Emitida' },
  paid: { bg: '#10B98115', text: '#10B981', label: 'Pagada' },
  overdue: { bg: '#D3010A15', text: '#D3010A', label: 'Vencida' },
};

export const DEFAULT_STATUS_STYLE: StatusStyle = { bg: '#8A888615', text: '#8A8886', label: '' };

export function getStatusStyle(status: string): StatusStyle {
  return STATUS_STYLES[status] ?? { ...DEFAULT_STATUS_STYLE, label: status };
}

export function getStatusLabel(status: string): string {
  return STATUS_STYLES[status]?.label ?? status;
}

// Canonical order status labels map (for filters, dropdowns, etc.)
export const ORDER_STATUS_LABELS: Record<string, string> = {
  all: 'Todas',
  draft: 'Borrador',
  pending: 'Pendientes',
  confirmed: 'Confirmadas',
  assigned: 'Asignadas',
  preparing: 'Preparando',
  ready_to_ship: 'Listas',
  processing: 'En proceso',
  shipped: 'Enviadas',
  in_transit: 'En tránsito',
  delivered: 'Entregadas',
  cancelled: 'Canceladas',
  returned: 'Devueltas',
};

// Canonical status flow for order progression
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'draft', 'confirmed', 'assigned', 'preparing',
  'ready_to_ship', 'shipped', 'in_transit', 'delivered',
];

// Pipeline stages derived from status config
export const PIPELINE_STAGES: { key: OrderStatus; label: string; color: string }[] =
  ORDER_STATUS_FLOW.map((key) => ({
    key,
    label: STATUS_STYLES[key]?.label ?? key,
    color: STATUS_STYLES[key]?.text ?? '#8A8886',
  }));

// Role badge styles
export function getRoleBadgeStyle(roleName: string): { bg: string; color: string } {
  if (roleName?.includes('viewer')) return { bg: '#F0F0EF', color: '#8A8886' };
  if (roleName?.includes('admin') || roleName?.includes('owner')) return { bg: 'rgba(211, 1, 10, 0.08)', color: '#D3010A' };
  return { bg: 'rgba(99, 102, 241, 0.08)', color: '#6366F1' };
}

// Org type labels
export const ORG_TYPE_LABELS: Record<string, string> = {
  platform: 'Plataforma',
  aggregator: 'Agregador',
  associate: 'Asociado',
};

// Source labels
export const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  rhino_vision: 'Rhino Vision',
  manual: 'Manual',
  catalog: 'Catálogo',
};
