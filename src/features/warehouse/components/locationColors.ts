import type { WarehouseLocation, InventoryStock } from '@/types/warehouse.ts';

function aggregateStocks(stocks?: InventoryStock[]): { totalQty: number; totalReserved: number } {
  if (!stocks || stocks.length === 0) return { totalQty: 0, totalReserved: 0 };
  return stocks.reduce(
    (acc, s) => ({ totalQty: acc.totalQty + s.quantity, totalReserved: acc.totalReserved + s.reserved_quantity }),
    { totalQty: 0, totalReserved: 0 },
  );
}

export function getOccupancyColor(location: WarehouseLocation, stocks?: InventoryStock[]): string {
  if (!location.is_active) return '#E2E8F0';       // gray - inactive
  const { totalQty, totalReserved } = aggregateStocks(stocks);
  if (totalQty === 0) return '#D1FAE5'; // green - empty
  if (totalReserved > 0 && totalReserved < totalQty) return '#FEF3C7'; // yellow - partial
  if (totalReserved >= totalQty) return '#FEE2E2'; // red - full/reserved
  return '#FEF3C7'; // yellow - has stock
}

export function getOccupancyBorderColor(location: WarehouseLocation, stocks?: InventoryStock[]): string {
  if (!location.is_active) return '#CBD5E1';
  const { totalQty, totalReserved } = aggregateStocks(stocks);
  if (totalQty === 0) return '#6EE7B7';
  if (totalReserved > 0 && totalReserved < totalQty) return '#FCD34D';
  if (totalReserved >= totalQty) return '#FCA5A5';
  return '#FCD34D';
}
