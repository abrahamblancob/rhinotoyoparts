import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { RotateCw, Grid3X3, RefreshCw } from 'lucide-react';

// ── Types ──

export interface WizardRackForm {
  id: string;
  name: string;
  code: string;
  rack_width_m: number;
  rack_depth_m: number;
  levels: number;
  positions_per_level: number;
  aisleId?: string;
}

export interface PlacedRack {
  rackId: string;
  gridX: number;
  gridY: number;
  widthCells: number;
  depthCells: number;
  rotated: boolean;
}

export interface WizardAisleForm {
  id: string;
  name: string;
  code: string;
  widthCells: number;
  lengthCells: number;
  orientation: 'vertical' | 'horizontal';
}

export interface PlacedAisle {
  aisleId: string;
  gridX: number;
  gridY: number;
  lengthCells: number;
  widthCells: number;
  orientation: 'vertical' | 'horizontal';
  mirrored?: boolean;
}

interface FloorPlanBuilderProps {
  warehouseWidth: number;
  warehouseLength: number;
  racks: WizardRackForm[];
  placedRacks: PlacedRack[];
  onPlacedRacksChange: (p: PlacedRack[]) => void;
  aisles: WizardAisleForm[];
  placedAisles: PlacedAisle[];
  onPlacedAislesChange: (a: PlacedAisle[]) => void;
}

// ── Constants ──

export const CELL_SIZE_M = 0.5;
const MIN_CELL = 20;
const GRID_COLOR = '#E2E8F020';
const GRID_LINE = '#CBD5E1';
/** Walking corridor width in cells (1.5m = 3 cells of 0.5m) */
const CORRIDOR_CELLS = 3;

/** Visual colors matching the reference diagram */
const AISLE_BG = '#1E293B';       // Black — walking corridor
const SHELF_UNIT_BORDER = '#16A34A'; // Green — rack/shelving unit border
const SHELF_BORDER = '#2563EB';   // Blue — individual shelf

// ── Block model ──

interface AisleBlock {
  aisleId: string;
  aisle: WizardAisleForm;
  racks: WizardRackForm[];
  orientation: 'vertical' | 'horizontal';
  /** When true, aisle is on the LEFT and racks on the RIGHT (mirrored layout) */
  mirrored: boolean;
}

interface RackColumnBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BlockLayout {
  widthCells: number;
  heightCells: number;
  aisleOffsetX: number;
  aisleOffsetY: number;
  aisleW: number;
  aisleH: number;
  /** Green column bounds for left and right rack groups */
  leftColumn: RackColumnBounds | null;
  rightColumn: RackColumnBounds | null;
  rackOffsets: {
    rackId: string;
    offsetX: number;
    offsetY: number;
    wCells: number;
    dCells: number;
    rotated: boolean;
  }[];
}

/**
 * Compute internal layout of a block.
 *
 * Standard warehouse pattern:
 *   Wall → [Aisle][Racks] | [Racks][Aisle][Aisle][Racks] | [Racks][Aisle] → Wall
 *
 * `mirrored=true`  → [Aisle][Racks]  (aisle on left/top, racks on right/bottom)
 * `mirrored=false` → [Racks][Aisle]  (racks on left/top, aisle on right/bottom)
 *
 * Even-indexed blocks are mirrored, odd-indexed are normal.
 * This produces back-to-back racks between pairs and adjacent aisles between pairs.
 */
function computeBlockLayout(block: AisleBlock): BlockLayout {
  const { aisle, racks, orientation, mirrored } = block;

  const aisleWCells = Math.max(1, Math.ceil(aisle.widthCells / CELL_SIZE_M));

  const toRackCells = (r: WizardRackForm) => ({
    wAlong: Math.max(1, Math.ceil(r.rack_width_m / CELL_SIZE_M)),
    dPerp: Math.max(1, Math.ceil(r.rack_depth_m / CELL_SIZE_M)),
  });

  // All racks in one column, ordered by code
  const sortedRacks = [...racks].sort((a, b) => a.code.localeCompare(b.code));

  const maxDepth = sortedRacks.length > 0
    ? Math.max(...sortedRacks.map((r) => toRackCells(r).dPerp))
    : 0;
  const totalAlong = sortedRacks.reduce((s, r) => s + toRackCells(r).wAlong, 0);

  const rackStackHeight = Math.max(totalAlong, 1);
  const blockPerp = maxDepth + aisleWCells;
  const blockAlong = rackStackHeight;

  const rackOffsets: BlockLayout['rackOffsets'] = [];

  // Stack all racks in a single column
  let yAccum = 0;
  for (const r of sortedRacks) {
    const { wAlong, dPerp } = toRackCells(r);
    if (orientation === 'vertical') {
      // mirrored: racks on RIGHT (after aisle), normal: racks on LEFT
      const rackBaseX = mirrored ? aisleWCells : 0;
      rackOffsets.push({
        rackId: r.id,
        offsetX: rackBaseX + (maxDepth - dPerp),
        offsetY: yAccum,
        wCells: dPerp,
        dCells: wAlong,
        rotated: false,
      });
    } else {
      const rackBaseY = mirrored ? aisleWCells : 0;
      rackOffsets.push({
        rackId: r.id,
        offsetX: yAccum,
        offsetY: rackBaseY + (maxDepth - dPerp),
        wCells: wAlong,
        dCells: dPerp,
        rotated: true,
      });
    }
    yAccum += wAlong;
  }

  // Single rack column (green border)
  const rackCol: RackColumnBounds | null = sortedRacks.length > 0
    ? (orientation === 'vertical'
      ? { x: mirrored ? aisleWCells : 0, y: 0, w: maxDepth, h: totalAlong }
      : { x: 0, y: mirrored ? aisleWCells : 0, w: totalAlong, h: maxDepth })
    : null;

  if (orientation === 'vertical') {
    return {
      widthCells: blockPerp,
      heightCells: blockAlong,
      aisleOffsetX: mirrored ? 0 : maxDepth,
      aisleOffsetY: 0,
      aisleW: aisleWCells,
      aisleH: blockAlong,
      leftColumn: rackCol,
      rightColumn: null,
      rackOffsets,
    };
  }
  return {
    widthCells: blockAlong,
    heightCells: blockPerp,
    aisleOffsetX: 0,
    aisleOffsetY: mirrored ? 0 : maxDepth,
    aisleW: blockAlong,
    aisleH: aisleWCells,
    leftColumn: rackCol,
    rightColumn: null,
    rackOffsets,
  };
}

/**
 * Auto-arrange blocks in the standard warehouse pattern:
 *   Wall → [Aisle][Racks] | [Racks][Aisle][Aisle][Racks] | [Racks][Aisle] → Wall
 *
 * Even-indexed blocks (0,2,4): mirrored=true  → [Aisle][Racks]
 * Odd-indexed blocks  (1,3,5): mirrored=false → [Racks][Aisle]
 *
 * This produces:
 *   - Back-to-back racks within each pair (0+1, 2+3, ...)
 *   - Adjacent aisles between pairs (aisle_1 next to aisle_2)
 */
function autoArrangeBlocks(
  blocks: AisleBlock[],
  _gridW: number,
  _gridH: number,
): { aisleId: string; gridX: number; gridY: number; orientation: 'vertical' | 'horizontal'; mirrored: boolean }[] {
  const results: { aisleId: string; gridX: number; gridY: number; orientation: 'vertical' | 'horizontal'; mirrored: boolean }[] = [];

  const edgeMargin = CORRIDOR_CELLS; // walking space at left edge (wall)
  const topPadding = 1;
  let cursorX = edgeMargin;

  for (let i = 0; i < blocks.length; i++) {
    const mirrored = i % 2 === 0; // even=mirrored [Aisle][Racks], odd=normal [Racks][Aisle]
    const block = { ...blocks[i], mirrored };
    const layout = computeBlockLayout(block);

    results.push({
      aisleId: block.aisleId,
      gridX: cursorX,
      gridY: topPadding,
      orientation: block.orientation,
      mirrored,
    });

    // Next block immediately adjacent (back-to-back racks or adjacent aisles)
    cursorX += layout.widthCells;
  }

  return results;
}

/**
 * From a block position + layout, emit PlacedRack[] and PlacedAisle.
 */
function blockToPlacedItems(
  block: AisleBlock,
  blockX: number,
  blockY: number,
  layout: BlockLayout,
): { placedAisle: PlacedAisle; placedRacks: PlacedRack[] } {
  const placedAisle: PlacedAisle = {
    aisleId: block.aisleId,
    gridX: blockX + layout.aisleOffsetX,
    gridY: blockY + layout.aisleOffsetY,
    lengthCells: layout.aisleH,
    widthCells: layout.aisleW,
    orientation: block.orientation,
    mirrored: block.mirrored,
  };

  const placedRacks: PlacedRack[] = layout.rackOffsets.map((ro) => ({
    rackId: ro.rackId,
    gridX: blockX + ro.offsetX,
    gridY: blockY + ro.offsetY,
    widthCells: ro.wCells,
    depthCells: ro.dCells,
    rotated: ro.rotated,
  }));

  return { placedAisle, placedRacks };
}

// ── Collision helpers ──

function buildOccupancy(
  width: number,
  height: number,
  placements: PlacedRack[],
  aisles: PlacedAisle[],
  excludeBlockAisleId?: string,
  excludeRackIds?: Set<string>,
): boolean[][] {
  const grid: boolean[][] = Array.from({ length: height }, () =>
    Array(width).fill(false),
  );
  for (const p of placements) {
    if (excludeRackIds?.has(p.rackId)) continue;
    for (let r = p.gridY; r < p.gridY + p.depthCells; r++) {
      for (let c = p.gridX; c < p.gridX + p.widthCells; c++) {
        if (r >= 0 && r < height && c >= 0 && c < width) grid[r][c] = true;
      }
    }
  }
  for (const a of aisles) {
    if (a.aisleId === excludeBlockAisleId) continue;
    for (let r = a.gridY; r < a.gridY + a.lengthCells; r++) {
      for (let c = a.gridX; c < a.gridX + a.widthCells; c++) {
        if (r >= 0 && r < height && c >= 0 && c < width) grid[r][c] = true;
      }
    }
  }
  return grid;
}

function checkBlockCollision(
  occ: boolean[][],
  blockX: number,
  blockY: number,
  blockW: number,
  blockH: number,
  maxW: number,
  maxH: number,
): boolean {
  if (blockX < 0 || blockY < 0 || blockX + blockW > maxW || blockY + blockH > maxH) return true;
  for (let r = blockY; r < blockY + blockH; r++) {
    for (let c = blockX; c < blockX + blockW; c++) {
      if (occ[r]?.[c]) return true;
    }
  }
  return false;
}

function getRackDisplayCode(rack: WizardRackForm, aisles: WizardAisleForm[]): string {
  if (rack.aisleId) {
    const aisle = aisles.find((a) => a.id === rack.aisleId);
    if (aisle) return `${aisle.code}-${rack.code}`;
  }
  return rack.code;
}

// ── Component ──

export function FloorPlanBuilder({
  warehouseWidth,
  warehouseLength,
  racks,
  placedRacks,
  onPlacedRacksChange,
  aisles,
  placedAisles,
  onPlacedAislesChange,
}: FloorPlanBuilderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const autoArrangedRef = useRef(false);

  const [dragState, setDragState] = useState<{
    aisleId: string;
    blockW: number;
    blockH: number;
    gridX: number;
    gridY: number;
    valid: boolean;
    active: boolean;
  } | null>(null);

  const warehouseGridW = Math.ceil(warehouseWidth / CELL_SIZE_M);
  const warehouseGridH = Math.ceil(warehouseLength / CELL_SIZE_M);

  // ── Build blocks ──
  const blocks: AisleBlock[] = useMemo(() => {
    return aisles.map((aisle, idx) => {
      const aisleRacks = racks.filter((r) => r.aisleId === aisle.id);
      const existingPlacement = placedAisles.find((pa) => pa.aisleId === aisle.id);
      return {
        aisleId: aisle.id,
        aisle,
        racks: aisleRacks,
        orientation: existingPlacement?.orientation ?? aisle.orientation ?? 'vertical',
        mirrored: existingPlacement?.mirrored ?? (idx % 2 === 0),
      };
    });
  }, [aisles, racks, placedAisles]);

  // Compute needed width: warehouse dimensions, or more if blocks exceed them
  const neededGridW = useMemo(() => {
    let maxRight = warehouseGridW;

    // Check actual placed block positions
    for (const block of blocks) {
      const layout = computeBlockLayout(block);
      const pa = placedAisles.find((p) => p.aisleId === block.aisleId);
      if (pa) {
        const blockX = pa.gridX - layout.aisleOffsetX;
        maxRight = Math.max(maxRight, blockX + layout.widthCells);
      }
    }

    // If nothing placed yet, estimate from auto-layout
    const allPlaced = blocks.every((b) => placedAisles.some((pa) => pa.aisleId === b.aisleId));
    if (!allPlaced && blocks.length > 0) {
      let cursorX = CORRIDOR_CELLS;
      for (const block of blocks) {
        const layout = computeBlockLayout(block);
        cursorX += layout.widthCells;
      }
      maxRight = Math.max(maxRight, cursorX);
    }

    return maxRight;
  }, [blocks, placedAisles, warehouseGridW]);

  // Effective grid dimensions (canvas may be wider than warehouse)
  const gridW = neededGridW;
  const gridH = warehouseGridH;

  // ── Measure container ──
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sidebarW = 200;
  const availableW = Math.max(containerSize.w - sidebarW - 16, 200);
  const availableH = Math.max(containerSize.h - 120, 300);
  const CELL_W = Math.max(availableW / gridW, MIN_CELL);
  const CELL_H = Math.max(availableH / gridH, MIN_CELL);

  // ── Auto-arrange on mount ──
  useEffect(() => {
    if (autoArrangedRef.current) return;
    if (aisles.length === 0) return;

    const allAislesPlaced = aisles.every((a) => placedAisles.some((pa) => pa.aisleId === a.id));
    const allRacksPlaced = racks.every((r) => placedRacks.some((pr) => pr.rackId === r.id));

    if (allAislesPlaced && allRacksPlaced) {
      autoArrangedRef.current = true;
      return;
    }

    const arrangedBlocks = blocks.map((b, i) => ({ ...b, mirrored: i % 2 === 0 }));
    const positions = autoArrangeBlocks(arrangedBlocks, gridW, gridH);

    const newPlacedAisles: PlacedAisle[] = [];
    const newPlacedRacks: PlacedRack[] = [];

    for (const pos of positions) {
      const block = arrangedBlocks.find((b) => b.aisleId === pos.aisleId);
      if (!block) continue;
      const withPos = { ...block, orientation: pos.orientation, mirrored: pos.mirrored };
      const layout = computeBlockLayout(withPos);
      const { placedAisle, placedRacks: blockRacks } = blockToPlacedItems(
        withPos, pos.gridX, pos.gridY, layout,
      );
      newPlacedAisles.push(placedAisle);
      newPlacedRacks.push(...blockRacks);
    }

    autoArrangedRef.current = true;
    onPlacedAislesChange(newPlacedAisles);
    onPlacedRacksChange(newPlacedRacks);
  }, [aisles, racks, blocks, placedAisles, placedRacks, gridW, gridH, onPlacedAislesChange, onPlacedRacksChange]);

  // ── Block positions (derived from placedAisles) ──
  const blockPositions = useMemo(() => {
    const map = new Map<string, { gridX: number; gridY: number; orientation: 'vertical' | 'horizontal' }>();
    for (const block of blocks) {
      const layout = computeBlockLayout(block);
      const pa = placedAisles.find((p) => p.aisleId === block.aisleId);
      if (pa) {
        map.set(block.aisleId, {
          gridX: pa.gridX - layout.aisleOffsetX,
          gridY: pa.gridY - layout.aisleOffsetY,
          orientation: block.orientation,
        });
      }
    }
    return map;
  }, [blocks, placedAisles]);

  // ── Drag block ──

  const handleBlockMouseDown = useCallback(
    (aisleId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const block = blocks.find((b) => b.aisleId === aisleId);
      if (!block) return;
      const layout = computeBlockLayout(block);
      const pos = blockPositions.get(aisleId);
      if (!pos) return;

      setDragState({
        aisleId,
        blockW: layout.widthCells,
        blockH: layout.heightCells,
        gridX: pos.gridX,
        gridY: pos.gridY,
        valid: true,
        active: true,
      });
    },
    [blocks, blockPositions],
  );

  // ── Mouse move & up ──

  useEffect(() => {
    if (!dragState?.active) return;

    const block = blocks.find((b) => b.aisleId === dragState.aisleId);
    if (!block) return;
    const blockRackIds = new Set(block.racks.map((r) => r.id));

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let gx = Math.round(mouseX / CELL_W - dragState.blockW / 2);
      let gy = Math.round(mouseY / CELL_H - dragState.blockH / 2);
      gx = Math.max(0, Math.min(gx, gridW - dragState.blockW));
      gy = Math.max(0, Math.min(gy, gridH - dragState.blockH));

      const occ = buildOccupancy(gridW, gridH, placedRacks, placedAisles, dragState.aisleId, blockRackIds);
      const collision = checkBlockCollision(occ, gx, gy, dragState.blockW, dragState.blockH, gridW, gridH);

      setDragState((prev) =>
        prev ? { ...prev, gridX: gx, gridY: gy, valid: !collision } : prev,
      );
    };

    const handleMouseUp = () => {
      setDragState((prev) => {
        if (!prev || !prev.valid) return null;

        const b = blocks.find((bl) => bl.aisleId === prev.aisleId);
        if (!b) return null;

        const layout = computeBlockLayout(b);
        const { placedAisle, placedRacks: blockRacks } = blockToPlacedItems(
          b, prev.gridX, prev.gridY, layout,
        );

        const newAisles = placedAisles.filter((a) => a.aisleId !== prev.aisleId);
        newAisles.push(placedAisle);
        onPlacedAislesChange(newAisles);

        const bRackIds = new Set(b.racks.map((r) => r.id));
        const newRacks = placedRacks.filter((p) => !bRackIds.has(p.rackId));
        newRacks.push(...blockRacks);
        onPlacedRacksChange(newRacks);

        return null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState?.active, dragState?.aisleId, dragState?.blockW, dragState?.blockH, placedRacks, placedAisles, blocks, gridW, gridH, onPlacedRacksChange, onPlacedAislesChange, CELL_W, CELL_H]);

  // ── Rotate block ──

  const handleRotateBlock = useCallback(
    (aisleId: string) => {
      const block = blocks.find((b) => b.aisleId === aisleId);
      if (!block) return;
      const pos = blockPositions.get(aisleId);
      if (!pos) return;

      const newOrientation = block.orientation === 'vertical' ? 'horizontal' : 'vertical';
      const rotatedBlock: AisleBlock = { ...block, orientation: newOrientation };
      const layout = computeBlockLayout(rotatedBlock);

      const blockRackIds = new Set(block.racks.map((r) => r.id));
      const occ = buildOccupancy(gridW, gridH, placedRacks, placedAisles, aisleId, blockRackIds);
      const collision = checkBlockCollision(occ, pos.gridX, pos.gridY, layout.widthCells, layout.heightCells, gridW, gridH);
      if (collision) return;

      const { placedAisle, placedRacks: blockRacks } = blockToPlacedItems(
        rotatedBlock, pos.gridX, pos.gridY, layout,
      );

      const newAisles = placedAisles.filter((a) => a.aisleId !== aisleId);
      newAisles.push(placedAisle);
      onPlacedAislesChange(newAisles);

      const newRacks = placedRacks.filter((p) => !blockRackIds.has(p.rackId));
      newRacks.push(...blockRacks);
      onPlacedRacksChange(newRacks);
    },
    [blocks, blockPositions, placedRacks, placedAisles, gridW, gridH, onPlacedRacksChange, onPlacedAislesChange],
  );

  // ── Re-arrange ──

  const handleReArrange = useCallback(() => {
    const arrangedBlocks = blocks.map((b, i) => ({ ...b, mirrored: i % 2 === 0 }));
    const positions = autoArrangeBlocks(arrangedBlocks, gridW, gridH);
    const newPlacedAisles: PlacedAisle[] = [];
    const newPlacedRacks: PlacedRack[] = [];
    for (const pos of positions) {
      const block = arrangedBlocks.find((b) => b.aisleId === pos.aisleId);
      if (!block) continue;
      const withPos = { ...block, orientation: pos.orientation, mirrored: pos.mirrored };
      const layout = computeBlockLayout(withPos);
      const { placedAisle, placedRacks: bRacks } = blockToPlacedItems(withPos, pos.gridX, pos.gridY, layout);
      newPlacedAisles.push(placedAisle);
      newPlacedRacks.push(...bRacks);
    }
    onPlacedAislesChange(newPlacedAisles);
    onPlacedRacksChange(newPlacedRacks);
  }, [blocks, gridW, gridH, onPlacedAislesChange, onPlacedRacksChange]);

  // ── Render ──

  const canvasWidth = gridW * CELL_W;
  const canvasHeight = gridH * CELL_H;

  return (
    <div ref={wrapperRef} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Grid3X3 size={20} style={{ color: '#6366F1' }} />
          Distribucion del Almacen
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleReArrange}
            className="rh-btn rh-btn-ghost"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px' }}
            title="Reorganizar automaticamente"
          >
            <RefreshCw size={14} />
            Reorganizar
          </button>
          <span style={{ fontSize: 13, color: '#94A3B8' }}>
            {blocks.length} bloques | {racks.length} estantes
          </span>
        </div>
      </div>

      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
        Distribucion automatica: Pared → Pasillo → Estantes (espalda con espalda) → Pasillo → Pared. Arrastra los bloques para ajustar posicion.
      </p>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* ── Sidebar ── */}
        <div
          style={{
            width: sidebarW, flexShrink: 0, backgroundColor: '#F8FAFC',
            borderRadius: 10, padding: 12, border: '1px solid #E2E8F0', overflowY: 'auto',
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: '#6366F1', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Bloques (Pasillo + Estantes)
          </p>

          {blocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 8px', color: '#94A3B8', fontSize: 13 }}>
              Sin pasillos configurados
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blocks.map((block) => {
                const pos = blockPositions.get(block.aisleId);
                const layout = computeBlockLayout(block);
                const isPlaced = !!pos;

                return (
                  <div
                    key={block.aisleId}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: isPlaced ? '#F0FDF4' : '#FFF',
                      border: `2px solid ${SHELF_UNIT_BORDER}40`,
                      borderLeft: `4px solid ${AISLE_BG}`,
                      borderRadius: 8, fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                        {block.aisle.code}
                      </span>
                      {isPlaced && <span style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>✓</span>}
                    </div>

                    <div style={{ color: '#64748B', marginBottom: 4 }}>
                      {block.racks.length} estantes · {(layout.widthCells * CELL_SIZE_M).toFixed(1)}m × {(layout.heightCells * CELL_SIZE_M).toFixed(1)}m
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {block.racks.map((rack) => (
                        <span
                          key={rack.id}
                          style={{
                            fontSize: 9, padding: '1px 5px', backgroundColor: `${SHELF_BORDER}15`,
                            color: SHELF_BORDER, borderRadius: 3, fontWeight: 600, fontFamily: 'monospace',
                          }}
                        >
                          {getRackDisplayCode(rack, aisles)}
                        </span>
                      ))}
                    </div>

                    {isPlaced && pos && (
                      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 3 }}>
                        ({pos.gridX},{pos.gridY}) {block.orientation === 'horizontal' ? '↔' : '↕'} {block.mirrored ? '◁' : '▷'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Canvas ── */}
        <div
          ref={canvasRef}
          style={{
            flex: 1, overflow: 'auto', backgroundColor: '#FFFFFF',
            borderRadius: 10, border: '2px solid #E2E8F0', position: 'relative',
          }}
        >
          <div
            style={{
              width: canvasWidth, height: canvasHeight, position: 'relative',
              backgroundImage: `
                linear-gradient(to right, ${GRID_LINE}30 1px, transparent 1px),
                linear-gradient(to bottom, ${GRID_LINE}30 1px, transparent 1px)
              `,
              backgroundSize: `${CELL_W / CELL_SIZE_M}px ${CELL_H / CELL_SIZE_M}px`,
              backgroundColor: GRID_COLOR,
            }}
          >
            {/* Warehouse outline (actual dimensions) */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: warehouseGridW * CELL_W,
                height: warehouseGridH * CELL_H,
                border: '2px solid #CBD5E1',
                borderRadius: 4,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />

            {/* Meter markers - top (full canvas width) */}
            {Array.from({ length: Math.floor(gridW * CELL_SIZE_M) + 1 }, (_, i) => (
              <span
                key={`mx-${i}`}
                style={{
                  position: 'absolute', top: 2, left: (i / CELL_SIZE_M) * CELL_W + 4,
                  fontSize: 10, color: i <= warehouseWidth ? '#94A3B8' : '#CBD5E140',
                  fontFamily: 'monospace', fontWeight: 600,
                }}
              >
                {i}m
              </span>
            ))}
            {/* Meter markers - left */}
            {Array.from({ length: Math.floor(warehouseLength) + 1 }, (_, i) => (
              <span
                key={`my-${i}`}
                style={{
                  position: 'absolute', top: (i / CELL_SIZE_M) * CELL_H + 4, left: 4,
                  fontSize: 10, color: '#94A3B8', fontFamily: 'monospace', fontWeight: 600,
                }}
              >
                {i}m
              </span>
            ))}

            {/* Render blocks */}
            {blocks.map((block) => {
              const pos = blockPositions.get(block.aisleId);
              if (!pos) return null;

              const layout = computeBlockLayout(block);
              const isDragging = dragState?.aisleId === block.aisleId;

              return (
                <div key={block.aisleId}>
                  {/* Block bounding box (drag area) */}
                  <div
                    onMouseDown={(e) => handleBlockMouseDown(block.aisleId, e)}
                    style={{
                      position: 'absolute',
                      left: pos.gridX * CELL_W,
                      top: pos.gridY * CELL_H,
                      width: layout.widthCells * CELL_W,
                      height: layout.heightCells * CELL_H,
                      cursor: 'grab',
                      zIndex: 5,
                      opacity: isDragging ? 0.3 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {/* Rotate button */}
                    <div style={{ position: 'absolute', top: -14, right: -4, display: 'flex', gap: 2, zIndex: 10 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRotateBlock(block.aisleId); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          width: 22, height: 22, borderRadius: '50%',
                          border: '1px solid #CBD5E1', backgroundColor: '#fff',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                        title="Rotar bloque"
                      >
                        <RotateCw size={12} style={{ color: '#6366F1' }} />
                      </button>
                    </div>

                    {/* ═══ LEFT rack column (green border) ═══ */}
                    {layout.leftColumn && (
                      <div
                        style={{
                          position: 'absolute',
                          left: layout.leftColumn.x * CELL_W,
                          top: layout.leftColumn.y * CELL_H,
                          width: layout.leftColumn.w * CELL_W,
                          height: layout.leftColumn.h * CELL_H,
                          border: `3px solid ${SHELF_UNIT_BORDER}`,
                          borderRadius: 4,
                          backgroundColor: '#F0FDF4',
                          pointerEvents: 'none',
                          zIndex: 1,
                        }}
                      />
                    )}

                    {/* ═══ RIGHT rack column (green border) ═══ */}
                    {layout.rightColumn && (
                      <div
                        style={{
                          position: 'absolute',
                          left: layout.rightColumn.x * CELL_W,
                          top: layout.rightColumn.y * CELL_H,
                          width: layout.rightColumn.w * CELL_W,
                          height: layout.rightColumn.h * CELL_H,
                          border: `3px solid ${SHELF_UNIT_BORDER}`,
                          borderRadius: 4,
                          backgroundColor: '#F0FDF4',
                          pointerEvents: 'none',
                          zIndex: 1,
                        }}
                      />
                    )}

                    {/* ═══ AISLE — black corridor ═══ */}
                    <div
                      style={{
                        position: 'absolute',
                        left: layout.aisleOffsetX * CELL_W,
                        top: layout.aisleOffsetY * CELL_H,
                        width: layout.aisleW * CELL_W,
                        height: layout.aisleH * CELL_H,
                        backgroundColor: AISLE_BG,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        zIndex: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11, fontWeight: 800, color: '#FFFFFF', fontFamily: 'monospace',
                          writingMode: block.orientation === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                          textOrientation: 'mixed', letterSpacing: 1,
                        }}
                      >
                        {block.aisle.code}
                      </span>
                    </div>

                    {/* ═══ Individual racks (blue borders) ═══ */}
                    {layout.rackOffsets.map((ro) => {
                      const rack = block.racks.find((r) => r.id === ro.rackId);
                      if (!rack) return null;

                      return (
                        <div
                          key={ro.rackId}
                          style={{
                            position: 'absolute',
                            left: ro.offsetX * CELL_W + 3,
                            top: ro.offsetY * CELL_H + 2,
                            width: ro.wCells * CELL_W - 6,
                            height: ro.dCells * CELL_H - 4,
                            backgroundColor: '#EFF6FF',
                            border: `2px solid ${SHELF_BORDER}`,
                            borderRadius: 3,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'none',
                            zIndex: 3,
                          }}
                        >
                          <span style={{
                            fontSize: 10, fontWeight: 800, color: SHELF_BORDER,
                            fontFamily: 'monospace', lineHeight: 1,
                          }}>
                            {getRackDisplayCode(rack, aisles)}
                          </span>
                          <span style={{ fontSize: 8, color: '#64748B', lineHeight: 1, marginTop: 1 }}>
                            {rack.levels}×{rack.positions_per_level}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Drag ghost */}
            {dragState?.active && dragState.gridX >= 0 && dragState.gridY >= 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: dragState.gridX * CELL_W,
                  top: dragState.gridY * CELL_H,
                  width: dragState.blockW * CELL_W,
                  height: dragState.blockH * CELL_H,
                  backgroundColor: dragState.valid ? '#10B98112' : '#EF444412',
                  border: `2px dashed ${dragState.valid ? '#10B981' : '#EF4444'}`,
                  borderRadius: 6,
                  pointerEvents: 'none',
                  zIndex: 100,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'left 0.05s, top 0.05s',
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, color: dragState.valid ? '#10B981' : '#EF4444' }}>
                  {dragState.valid ? '✓' : '✗'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex', gap: 16, marginTop: 12, padding: '8px 16px',
          backgroundColor: '#F8FAFC', borderRadius: 8, fontSize: 12,
          color: '#64748B', alignItems: 'center', flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 600 }}>{warehouseWidth}m × {warehouseLength}m</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: AISLE_BG, display: 'inline-block' }} />
          Pasillo
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#F0FDF4', border: `3px solid ${SHELF_UNIT_BORDER}`, display: 'inline-block' }} />
          Estanteria
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#EFF6FF', border: `2px solid ${SHELF_BORDER}`, display: 'inline-block' }} />
          Estante
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 14, height: 14, backgroundColor: '#F8FAFC', display: 'inline-block', borderRadius: 2 }} />
          Corredor de paso
        </span>
        <span>
          <RotateCw size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />
          Rotar bloque
        </span>
      </div>
    </div>
  );
}
