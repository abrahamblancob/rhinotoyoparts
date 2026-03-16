/**
 * Reusable cenital (top-down) view of a warehouse layout.
 * Renders block-based aisles + racks using the same visual pattern as FloorPlanBuilder/ZonePainter.
 * Can be used at any size — just pass width/height.
 */
import { CELL_SIZE_M } from '../FloorPlanBuilder.tsx';

// ── Types ──

interface AisleInput {
  id: string;
  code: string;
  widthCells?: number;  // width in meters (named widthCells for wizard compat)
  width_m?: number;     // width in meters (DB format)
  orientation?: 'vertical' | 'horizontal';
}

interface RackInput {
  id: string;
  code: string;
  rack_width_m: number;
  rack_depth_m: number;
  aisleId?: string;
  aisle_id?: string | null;
}

interface PlacedAisleInput {
  aisleId: string;
  gridX: number;
  gridY: number;
  widthCells: number;
  lengthCells: number;
  orientation: 'vertical' | 'horizontal';
  mirrored?: boolean;
}

interface ZoneInput {
  id: string;
  name?: string;
  code?: string;
  color: string;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  position_x?: number | null;
  position_y?: number | null;
}

export interface WarehouseCenitalMiniProps {
  warehouseWidth: number;
  warehouseLength: number;
  aisles: AisleInput[];
  racks: RackInput[];
  placedAisles: PlacedAisleInput[];
  zones?: ZoneInput[];
  viewWidth?: number;
  viewHeight?: number;
  showZoneLabels?: boolean;
  showDimensionLabels?: boolean;
  /** Set of rack IDs to highlight (e.g. picking targets) */
  highlightRackIds?: Set<string>;
  /** Color for highlighted racks (default: '#F97316' orange) */
  highlightColor?: string;
  /** Dim non-highlighted racks when highlightRackIds is provided */
  dimNonHighlighted?: boolean;
  /** Click handler for a rack in the cenital view */
  onRackClick?: (rackId: string) => void;
}

// ── Constants ──

const AISLE_BG = '#1E293B';
const SHELF_UNIT_BORDER = '#16A34A';
const SHELF_BORDER = '#2563EB';

// ── Block layout (same as FloorPlanBuilder/ZonePainter) ──

interface Block {
  aisleId: string;
  aisle: AisleInput;
  racks: RackInput[];
  orientation: 'vertical' | 'horizontal';
  mirrored: boolean;
}

interface BlockLayout {
  widthCells: number;
  heightCells: number;
  aisleOffsetX: number;
  aisleOffsetY: number;
  aisleW: number;
  aisleH: number;
  rackColBounds: { x: number; y: number; w: number; h: number } | null;
  rackOffsets: { rackId: string; offsetX: number; offsetY: number; wCells: number; dCells: number }[];
}

function computeBlockLayout(block: Block): BlockLayout {
  const aisleWidthM = block.aisle.widthCells ?? block.aisle.width_m ?? 0.5;
  const aisleWCells = Math.max(1, Math.ceil(aisleWidthM / CELL_SIZE_M));
  const toRC = (r: RackInput) => ({
    wAlong: Math.max(1, Math.ceil(r.rack_width_m / CELL_SIZE_M)),
    dPerp: Math.max(1, Math.ceil(r.rack_depth_m / CELL_SIZE_M)),
  });
  const sortedRacks = [...block.racks].sort((a, b) => a.code.localeCompare(b.code));
  const maxDepth = sortedRacks.length > 0 ? Math.max(...sortedRacks.map((r) => toRC(r).dPerp)) : 0;
  const totalAlong = sortedRacks.reduce((s, r) => s + toRC(r).wAlong, 0);
  const blockPerp = maxDepth + aisleWCells;
  const blockAlong = Math.max(totalAlong, 1);

  const rackOffsets: BlockLayout['rackOffsets'] = [];
  let yAccum = 0;
  for (const r of sortedRacks) {
    const { wAlong, dPerp } = toRC(r);
    if (block.orientation === 'vertical') {
      const rackBaseX = block.mirrored ? aisleWCells : 0;
      rackOffsets.push({ rackId: r.id, offsetX: rackBaseX + (maxDepth - dPerp), offsetY: yAccum, wCells: dPerp, dCells: wAlong });
    } else {
      const rackBaseY = block.mirrored ? aisleWCells : 0;
      rackOffsets.push({ rackId: r.id, offsetX: yAccum, offsetY: rackBaseY + (maxDepth - dPerp), wCells: wAlong, dCells: dPerp });
    }
    yAccum += wAlong;
  }

  const rackColBounds = sortedRacks.length > 0
    ? (block.orientation === 'vertical'
      ? { x: block.mirrored ? aisleWCells : 0, y: 0, w: maxDepth, h: totalAlong }
      : { x: 0, y: block.mirrored ? aisleWCells : 0, w: totalAlong, h: maxDepth })
    : null;

  const isVert = block.orientation === 'vertical';
  if (isVert) {
    return { widthCells: blockPerp, heightCells: blockAlong, aisleOffsetX: block.mirrored ? 0 : maxDepth, aisleOffsetY: 0, aisleW: aisleWCells, aisleH: blockAlong, rackColBounds, rackOffsets };
  }
  return { widthCells: blockAlong, heightCells: blockPerp, aisleOffsetX: 0, aisleOffsetY: block.mirrored ? 0 : maxDepth, aisleW: blockAlong, aisleH: aisleWCells, rackColBounds, rackOffsets };
}

// ── Component ──

export function WarehouseCenitalMini({
  warehouseWidth,
  warehouseLength,
  aisles,
  racks,
  placedAisles,
  zones = [],
  viewWidth = 520,
  viewHeight = 420,
  showZoneLabels = false,
  showDimensionLabels = true,
  highlightRackIds,
  highlightColor = '#F97316',
  dimNonHighlighted = false,
  onRackClick,
}: WarehouseCenitalMiniProps) {
  // Build blocks from aisles + racks
  const sortedAisles = [...aisles].sort((a, b) => a.code.localeCompare(b.code));

  const blocks: Block[] = sortedAisles.map((aisle, idx) => {
    const pa = placedAisles.find((p) => p.aisleId === aisle.id);
    const aisleRacks = racks
      .filter((r) => (r.aisleId ?? r.aisle_id) === aisle.id)
      .sort((a, b) => a.code.localeCompare(b.code));
    return {
      aisleId: aisle.id,
      aisle,
      racks: aisleRacks,
      orientation: pa?.orientation ?? aisle.orientation ?? 'vertical',
      mirrored: pa?.mirrored ?? (idx % 2 === 0),
    };
  });

  // Compute block positions from placedAisles, or auto-arrange
  const blockPositions = new Map<string, { gridX: number; gridY: number }>();
  const hasPositions = placedAisles.length > 0;

  if (hasPositions) {
    for (const block of blocks) {
      const layout = computeBlockLayout(block);
      const pa = placedAisles.find((p) => p.aisleId === block.aisleId);
      if (pa) {
        blockPositions.set(block.aisleId, {
          gridX: pa.gridX - layout.aisleOffsetX,
          gridY: pa.gridY - layout.aisleOffsetY,
        });
      }
    }
  } else {
    // Auto-arrange flush
    let cursorX = 0;
    for (const block of blocks) {
      const layout = computeBlockLayout(block);
      blockPositions.set(block.aisleId, { gridX: cursorX, gridY: 0 });
      cursorX += layout.widthCells;
    }
  }

  // Scale: use warehouse dimensions (matching FloorPlanBuilder/ZonePainter)
  const gridW = Math.ceil(warehouseWidth / CELL_SIZE_M);
  const gridH = Math.ceil(warehouseLength / CELL_SIZE_M);
  const CELL_W = viewWidth / gridW;
  const CELL_H = viewHeight / gridH;

  // Normalize zone positions
  const getZoneX = (z: ZoneInput) => z.x ?? z.position_x ?? 0;
  const getZoneY = (z: ZoneInput) => z.y ?? z.position_y ?? 0;
  const getZoneW = (z: ZoneInput) => z.width ?? 0;
  const getZoneH = (z: ZoneInput) => z.height ?? 0;

  return (
    <div style={{ position: 'relative', paddingBottom: showDimensionLabels ? 22 : 0, paddingRight: showDimensionLabels ? 48 : 0 }}>
      <div
        style={{
          width: viewWidth,
          height: viewHeight,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          border: '2px solid #CBD5E1',
          borderRadius: 6,
        }}
      >
        {/* Zones (background) */}
        {zones.map((zone) => {
          const zx = getZoneX(zone);
          const zy = getZoneY(zone);
          const zw = getZoneW(zone);
          const zh = getZoneH(zone);
          const zLeft = (zx / CELL_SIZE_M) * CELL_W;
          const zTop = (zy / CELL_SIZE_M) * CELL_H;
          const zW = Math.min((zw / CELL_SIZE_M) * CELL_W, viewWidth - zLeft);
          const zH = Math.min((zh / CELL_SIZE_M) * CELL_H, viewHeight - zTop);
          if (zW <= 0 || zH <= 0) return null;
          const color = zone.color ?? '#6366F1';
          return (
            <div
              key={zone.id}
              style={{
                position: 'absolute',
                left: zLeft,
                top: zTop,
                width: zW,
                height: zH,
                backgroundColor: color + '15',
                border: `1px dashed ${color}60`,
                borderRadius: 3,
              }}
            >
              {showZoneLabels && (
                <span
                  style={{
                    position: 'absolute', top: 2, left: 3,
                    fontSize: 9, color, fontWeight: 600,
                    whiteSpace: 'nowrap', overflow: 'hidden',
                  }}
                >
                  {zone.name ?? zone.code ?? ''}
                </span>
              )}
            </div>
          );
        })}

        {/* Block-based aisles + racks */}
        {blocks.map((block) => {
          const pos = blockPositions.get(block.aisleId);
          if (!pos) return null;
          const layout = computeBlockLayout(block);

          return (
            <div key={block.aisleId}>
              {/* Green rack column border */}
              {layout.rackColBounds && (
                <div
                  style={{
                    position: 'absolute',
                    left: (pos.gridX + layout.rackColBounds.x) * CELL_W,
                    top: (pos.gridY + layout.rackColBounds.y) * CELL_H,
                    width: layout.rackColBounds.w * CELL_W,
                    height: layout.rackColBounds.h * CELL_H,
                    border: `2px solid ${SHELF_UNIT_BORDER}60`,
                    borderRadius: 3,
                    backgroundColor: `${SHELF_UNIT_BORDER}08`,
                    zIndex: 1,
                  }}
                />
              )}

              {/* Black aisle corridor */}
              <div
                style={{
                  position: 'absolute',
                  left: (pos.gridX + layout.aisleOffsetX) * CELL_W,
                  top: (pos.gridY + layout.aisleOffsetY) * CELL_H,
                  width: layout.aisleW * CELL_W,
                  height: layout.aisleH * CELL_H,
                  backgroundColor: AISLE_BG,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    fontSize: Math.max(7, Math.min(11, layout.aisleW * CELL_W * 0.7)),
                    fontWeight: 800,
                    color: '#FFFFFF',
                    fontFamily: 'monospace',
                    writingMode: block.orientation === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                    textOrientation: 'mixed',
                    letterSpacing: 1,
                  }}
                >
                  {block.aisle.code}
                </span>
              </div>

              {/* Blue individual racks */}
              {layout.rackOffsets.map((ro) => {
                const rack = block.racks.find((r) => r.id === ro.rackId);
                if (!rack) return null;
                const aisleCode = block.aisle.code;
                const rackNum = rack.code.includes('-') ? rack.code.split('-').pop() : rack.code;
                const displayCode = `${aisleCode}-${rackNum}`;

                const isHighlighted = highlightRackIds?.has(rack.id);
                const useHighlight = highlightRackIds != null;
                const rackBg = isHighlighted ? highlightColor + '25' : '#EFF6FF';
                const rackBorder = isHighlighted ? highlightColor : SHELF_BORDER + '80';
                const rackBorderW = isHighlighted ? 2.5 : 1.5;
                const rackTextColor = isHighlighted ? highlightColor : SHELF_BORDER;
                const rackOpacity = useHighlight && dimNonHighlighted && !isHighlighted ? 0.35 : 1;

                return (
                  <div
                    key={ro.rackId}
                    onClick={onRackClick ? () => onRackClick(rack.id) : undefined}
                    style={{
                      position: 'absolute',
                      left: (pos.gridX + ro.offsetX) * CELL_W + 2,
                      top: (pos.gridY + ro.offsetY) * CELL_H + 1,
                      width: ro.wCells * CELL_W - 4,
                      height: ro.dCells * CELL_H - 2,
                      backgroundColor: rackBg,
                      border: `${rackBorderW}px solid ${rackBorder}`,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      zIndex: isHighlighted ? 4 : 3,
                      opacity: rackOpacity,
                      transition: 'opacity 0.2s',
                      cursor: onRackClick ? 'pointer' : undefined,
                    }}
                  >
                    <span style={{
                      fontSize: Math.max(6, Math.min(9, ro.dCells * CELL_H * 0.35)),
                      fontWeight: 800,
                      color: rackTextColor,
                      fontFamily: 'monospace',
                      lineHeight: 1,
                      opacity: 0.8,
                    }}>
                      {displayCode}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Dimension labels */}
      {showDimensionLabels && (
        <>
          <span
            style={{
              position: 'absolute', bottom: 2, left: viewWidth / 2,
              transform: 'translateX(-50%)', fontSize: 10,
              color: '#94A3B8', fontFamily: 'monospace', whiteSpace: 'nowrap',
            }}
          >
            {warehouseWidth}m (ancho)
          </span>
          <span
            style={{
              position: 'absolute', right: 0, top: viewHeight / 2,
              transform: 'translateY(-50%) rotate(90deg)', fontSize: 10,
              color: '#94A3B8', fontFamily: 'monospace', whiteSpace: 'nowrap',
            }}
          >
            {warehouseLength}m (largo)
          </span>
        </>
      )}
    </div>
  );
}
