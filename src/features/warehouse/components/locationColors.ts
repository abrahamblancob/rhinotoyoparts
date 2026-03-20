import type { WarehouseLocation, InventoryStock } from '@/types/warehouse.ts';

function getAvailableQty(stocks?: InventoryStock[]): number {
  if (!stocks || stocks.length === 0) return 0;
  return stocks.reduce((sum, s) => sum + Math.max(0, s.quantity - s.reserved_quantity), 0);
}

export function getOccupancyColor(location: WarehouseLocation, stocks?: InventoryStock[]): string {
  if (!location.is_active) return '#E2E8F0';       // gray - inactive
  const available = getAvailableQty(stocks);
  if (available === 0) return '#D1FAE5'; // green - empty/available
  return '#FEF3C7'; // yellow - has stock
}

export function getOccupancyBorderColor(location: WarehouseLocation, stocks?: InventoryStock[]): string {
  if (!location.is_active) return '#CBD5E1';
  const available = getAvailableQty(stocks);
  if (available === 0) return '#6EE7B7';
  return '#FCD34D';
}
