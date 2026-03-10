import type { WarehouseLocation, InventoryStock } from '@/types/warehouse.ts';

export function getOccupancyColor(location: WarehouseLocation, stock?: InventoryStock | null): string {
  if (!location.is_active) return '#E2E8F0';       // gray - inactive
  if (!stock || stock.quantity === 0) return '#D1FAE5'; // green - empty
  if (stock.reserved_quantity > 0 && stock.reserved_quantity < stock.quantity) return '#FEF3C7'; // yellow - partial
  if (stock.quantity > 0 && stock.reserved_quantity >= stock.quantity) return '#FEE2E2'; // red - full/reserved
  if (stock.quantity > 0) return '#FEF3C7'; // yellow - has stock
  return '#D1FAE5'; // green - empty
}

export function getOccupancyBorderColor(location: WarehouseLocation, stock?: InventoryStock | null): string {
  if (!location.is_active) return '#CBD5E1';
  if (!stock || stock.quantity === 0) return '#6EE7B7';
  if (stock.reserved_quantity > 0 && stock.reserved_quantity < stock.quantity) return '#FCD34D';
  if (stock.quantity > 0 && stock.reserved_quantity >= stock.quantity) return '#FCA5A5';
  if (stock.quantity > 0) return '#FCD34D';
  return '#6EE7B7';
}
