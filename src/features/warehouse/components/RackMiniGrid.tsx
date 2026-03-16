import { useMemo } from 'react';
import { MapPin, CheckCircle2 } from 'lucide-react';
import type { WarehouseRack, WarehouseLocation, InventoryStock } from '@/types/warehouse.ts';

/* ── Hex color helpers ─────────────────────────────── */

/** Convert hex (#RRGGBB) to rgba with alpha */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Darken a hex color by a factor (0 = same, 1 = black) */
function darkenHex(hex: string, factor: number): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - factor));
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - factor));
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - factor));
  return `rgb(${r},${g},${b})`;
}

/* ── Data modes ────────────────────────────────────── */

interface OccupancyData {
  mode: 'occupancy';
  /** All locations belonging to this rack */
  locations: WarehouseLocation[];
  /** Map of location_id → InventoryStock (warehouse-wide is fine) */
  stockByLocation: Map<string, InventoryStock>;
}

interface PickingData {
  mode: 'picking';
  /** Only the pick-target locations for this rack */
  targetLocations: WarehouseLocation[];
  /** Set of location IDs already picked */
  pickedSet: Set<string>;
}

interface AuditData {
  mode: 'audit';
  /** Set of location IDs selected for audit */
  selectedLocationIds: Set<string>;
  /** Set of location IDs currently animating (jackpot) */
  animatingLocationIds?: Set<string>;
  /** Set of location IDs already audited */
  auditedLocationIds?: Set<string>;
  /** Set of location IDs that have stock (products) */
  stockLocationIds?: Set<string>;
  /** Click handler for a location cell */
  onLocationClick?: (locationId: string, rackId: string) => void;
}

/* ── Props ─────────────────────────────────────────── */

interface RackMiniGridProps {
  rack: WarehouseRack;
  data: OccupancyData | PickingData | AuditData;
  /** All locations for this rack (used in audit mode) */
  allLocations?: WarehouseLocation[];
  /** Per-rack color (hex) – used in occupancy mode for rack identity */
  rackColor?: string;
  /** Pixel size per cell – defaults to { width: 18, height: 16 } */
  cellSize?: { width: number; height: number };
  /** Cap visible levels (default: all) */
  maxLevels?: number;
  /** Cap visible positions (default: all) */
  maxPositions?: number;
  /** Show level letters (left) and position numbers (bottom) */
  showLabels?: boolean;
  /** Optional: show rack name/code header */
  showHeader?: boolean;
}

/* ── Component ─────────────────────────────────────── */

export function RackMiniGrid({
  rack,
  data,
  allLocations,
  rackColor,
  cellSize = { width: 18, height: 16 },
  maxLevels,
  maxPositions,
  showLabels = false,
  showHeader = false,
}: RackMiniGridProps) {
  const levels = maxLevels ? Math.min(rack.levels, maxLevels) : rack.levels;
  const positions = maxPositions ? Math.min(rack.positions_per_level, maxPositions) : rack.positions_per_level;

  /* ── Build lookup maps ─────────────────────────── */

  const locationMap = useMemo(() => {
    const map = new Map<string, WarehouseLocation>();
    const locs =
      data.mode === 'occupancy' ? data.locations
      : data.mode === 'picking' ? data.targetLocations
      : allLocations ?? [];
    for (const loc of locs) {
      map.set(`${loc.level}-${loc.position}`, loc);
    }
    return map;
  }, [data, allLocations]);

  /* ── Build grid rows (level 1 = top, levels = bottom) ── */

  const grid = useMemo(() => {
    const rows: { level: number; cells: { position: number; location: WarehouseLocation | null }[] }[] = [];
    for (let level = 1; level <= levels; level++) {
      const cells: { position: number; location: WarehouseLocation | null }[] = [];
      for (let pos = 1; pos <= positions; pos++) {
        cells.push({ position: pos, location: locationMap.get(`${level}-${pos}`) ?? null });
      }
      rows.push({ level, cells });
    }
    return rows;
  }, [levels, positions, locationMap]);

  /* ── Cell renderer ─────────────────────────────── */

  const renderCell = (level: number, position: number, location: WarehouseLocation | null) => {
    let bg: string;
    let border: string;
    let icon: React.ReactNode = null;
    let title: string;
    const color = rackColor ?? '#3B82F6'; // fallback blue

    if (data.mode === 'occupancy') {
      if (!location) {
        // No location record generated yet — show as light empty
        bg = hexToRgba(color, 0.08);
        border = hexToRgba(color, 0.2);
        title = `${String.fromCharCode(64 + level)}-${position} (sin ubicacion)`;
      } else if (!location.is_active) {
        // Inactive
        bg = '#E2E8F0';
        border = '#CBD5E1';
        title = `${location.code} | Inactiva`;
      } else {
        const stock = data.stockByLocation.get(location.id) ?? null;
        const qty = stock?.quantity ?? 0;

        if (qty > 0) {
          // Has stock → darker tone of rack color
          const reserved = stock?.reserved_quantity ?? 0;
          if (reserved >= qty) {
            // Fully reserved → even darker
            bg = darkenHex(color, 0.15);
            border = darkenHex(color, 0.3);
          } else {
            // Partial or with stock
            bg = hexToRgba(color, 0.7);
            border = darkenHex(color, 0.1);
          }
          const productName = stock?.product?.name ?? '';
          title = `${location.code} | Cant: ${qty}${reserved > 0 ? ` (Res: ${reserved})` : ''}${productName ? ` | ${productName}` : ''}`;
        } else {
          // Empty → light tint of rack color
          bg = hexToRgba(color, 0.15);
          border = hexToRgba(color, 0.3);
          title = `${location.code} | Vacio`;
        }
      }
    } else if (data.mode === 'picking') {
      // picking mode
      const isTarget = location !== null;
      const isPicked = location ? data.pickedSet.has(location.id) : false;

      if (isTarget && isPicked) {
        bg = '#10B981';
        border = '#059669';
        icon = cellSize.width >= 30 ? <CheckCircle2 size={14} color="#fff" /> : null;
      } else if (isTarget) {
        bg = '#F97316';
        border = '#EA580C';
        icon = cellSize.width >= 30 ? <MapPin size={14} color="#fff" /> : null;
      } else {
        bg = '#F3F2F1';
        border = '#E1DFDD';
      }
      title = location
        ? `${location.code} — ${isPicked ? 'Recogido' : 'Pendiente'}`
        : `${String.fromCharCode(64 + level)}-${position}`;
    } else {
      // audit mode
      const isSelected = location ? data.selectedLocationIds.has(location.id) : false;
      const isAnimating = location ? (data.animatingLocationIds?.has(location.id) ?? false) : false;
      const isAudited = location ? (data.auditedLocationIds?.has(location.id) ?? false) : false;
      const hasStock = location ? (data.stockLocationIds?.has(location.id) ?? false) : false;

      if (isAudited) {
        bg = '#10B981';
        border = '#059669';
        icon = cellSize.width >= 30 ? <CheckCircle2 size={14} color="#fff" /> : null;
      } else if (isSelected) {
        bg = '#F97316';
        border = '#EA580C';
        icon = cellSize.width >= 30 ? <MapPin size={14} color="#fff" /> : null;
      } else if (isAnimating) {
        bg = '#FBBF24';
        border = '#F59E0B';
      } else if (location && hasStock) {
        // Location with product — blue tint
        bg = '#DBEAFE';
        border = '#3B82F6';
      } else if (location) {
        // Empty location
        bg = '#F3F2F1';
        border = '#E1DFDD';
      } else {
        bg = '#F9FAFB';
        border = '#E5E7EB';
      }
      title = location
        ? `${location.code}${hasStock ? ' — Con producto' : ' — Vacio'}${isSelected ? ' — Seleccionado' : isAudited ? ' — Auditado' : ''}`
        : `${String.fromCharCode(64 + level)}-${position}`;
    }

    const isClickable = data.mode === 'audit' && location && data.onLocationClick;

    return (
      <div
        key={position}
        title={title}
        onClick={isClickable ? () => data.onLocationClick!(location!.id, rack.id) : undefined}
        style={{
          width: cellSize.width,
          height: cellSize.height,
          borderRadius: Math.min(4, cellSize.width * 0.2),
          backgroundColor: bg,
          border: `1px solid ${border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.15s, transform 0.15s',
          cursor: isClickable ? 'pointer' : undefined,
          ...(data.mode === 'audit' && location && (data.animatingLocationIds?.has(location.id))
            ? { animation: 'auditPulse 0.4s ease-in-out infinite alternate' }
            : {}),
        }}
      >
        {icon}
      </div>
    );
  };

  /* ── Render ─────────────────────────────────────── */

  const labelWidth = 20;
  const gap = 2;

  return (
    <div>
      {showHeader && (
        <div style={{ fontSize: 13, fontWeight: 600, color: '#323130', marginBottom: 8, fontFamily: 'monospace' }}>
          {rack.code} — {rack.name}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {grid.map((row) => (
          <div key={row.level} style={{ display: 'flex', gap, alignItems: 'center' }}>
            {showLabels && (
              <span
                style={{
                  fontSize: 10,
                  color: '#8A8886',
                  width: labelWidth,
                  textAlign: 'right',
                  marginRight: 4,
                  fontWeight: 700,
                }}
              >
                {String.fromCharCode(64 + row.level)}
              </span>
            )}
            {row.cells.map((cell) => renderCell(row.level, cell.position, cell.location))}
          </div>
        ))}

        {/* Position labels at bottom */}
        {showLabels && (
          <div style={{ display: 'flex', gap, marginLeft: labelWidth + 4 }}>
            {Array.from({ length: positions }, (_, i) => (
              <span
                key={i}
                style={{
                  width: cellSize.width,
                  textAlign: 'center',
                  fontSize: 10,
                  color: '#8A8886',
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
