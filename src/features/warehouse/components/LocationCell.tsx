import type { WarehouseLocation, InventoryStock } from '@/types/warehouse.ts';
import { getOccupancyColor, getOccupancyBorderColor } from './locationColors.ts';

interface LocationCellProps {
  location: WarehouseLocation;
  stocks?: InventoryStock[];
  onClick: (location: WarehouseLocation) => void;
}

function abbreviateCode(code: string): string {
  // Show last segment after last dash, or last 6 chars
  const parts = code.split('-');
  if (parts.length >= 3) {
    return parts.slice(-2).join('-');
  }
  return code.length > 8 ? code.slice(-8) : code;
}

export function LocationCell({ location, stocks = [], onClick }: LocationCellProps) {
  const bgColor = getOccupancyColor(location, stocks);
  const borderColor = getOccupancyBorderColor(location, stocks);
  const availableStocks = stocks.filter((s) => (s.quantity - s.reserved_quantity) > 0);
  const totalAvailable = availableStocks.reduce((sum, s) => sum + (s.quantity - s.reserved_quantity), 0);
  const productCount = availableStocks.length;
  const hasStock = totalAvailable > 0;

  const tooltipLines = [location.code];
  if (hasStock) {
    for (const s of availableStocks) {
      tooltipLines.push(`${s.product?.sku ?? '?'}: ${s.quantity - s.reserved_quantity} uds`);
    }
  } else {
    tooltipLines.push('Vacío');
  }

  return (
    <div
      onClick={() => onClick(location)}
      style={{
        backgroundColor: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        padding: '6px 8px',
        cursor: location.is_active ? 'pointer' : 'default',
        opacity: location.is_active ? 1 : 0.5,
        minWidth: 72,
        minHeight: 52,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (location.is_active) {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      title={tooltipLines.join('\n')}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#475569',
          textAlign: 'center',
          lineHeight: 1.2,
          wordBreak: 'break-all',
        }}
      >
        {abbreviateCode(location.code)}
      </span>

      {hasStock && (
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#FFFFFF',
              backgroundColor: '#10B981',
              borderRadius: 10,
              padding: '1px 6px',
              lineHeight: 1.4,
              minWidth: 20,
              textAlign: 'center',
            }}
          >
            {totalAvailable}
          </span>
          {productCount > 1 && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: '#6366F1',
                borderRadius: 8,
                padding: '0px 4px',
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              {productCount}
            </span>
          )}
        </div>
      )}

      {!location.is_active && (
        <span style={{ fontSize: 9, color: '#94A3B8', fontStyle: 'italic' }}>
          Inactiva
        </span>
      )}
    </div>
  );
}
