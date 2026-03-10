import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { RotateCw, Trash2, Move, Grid3X3 } from 'lucide-react';

// ── Types ──

export interface WizardRackForm {
  id: string;
  name: string;
  code: string;
  rack_width_m: number;
  rack_depth_m: number;
  levels: number;
  positions_per_level: number;
}

export interface PlacedRack {
  rackId: string;
  gridX: number;
  gridY: number;
  widthCells: number;
  depthCells: number;
  rotated: boolean;
}

interface FloorPlanBuilderProps {
  warehouseWidth: number;
  warehouseLength: number;
  racks: WizardRackForm[];
  placedRacks: PlacedRack[];
  onPlacedRacksChange: (p: PlacedRack[]) => void;
}

// ── Constants ──

const MIN_CELL = 20;
const GRID_COLOR = '#E2E8F020';
const GRID_LINE = '#CBD5E1';

// ── Helpers ──

function buildOccupancy(
  width: number,
  height: number,
  placements: PlacedRack[],
  excludeId?: string,
): boolean[][] {
  const grid: boolean[][] = Array.from({ length: height }, () =>
    Array(width).fill(false),
  );
  for (const p of placements) {
    if (p.rackId === excludeId) continue;
    for (let r = p.gridY; r < p.gridY + p.depthCells; r++) {
      for (let c = p.gridX; c < p.gridX + p.widthCells; c++) {
        if (r >= 0 && r < height && c >= 0 && c < width) {
          grid[r][c] = true;
        }
      }
    }
  }
  return grid;
}

function checkCollision(
  occ: boolean[][],
  gridX: number,
  gridY: number,
  w: number,
  d: number,
  maxW: number,
  maxH: number,
): boolean {
  if (gridX < 0 || gridY < 0 || gridX + w > maxW || gridY + d > maxH) return true;
  for (let r = gridY; r < gridY + d; r++) {
    for (let c = gridX; c < gridX + w; c++) {
      if (occ[r]?.[c]) return true;
    }
  }
  return false;
}

const RACK_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

// ── Component ──

export function FloorPlanBuilder({
  warehouseWidth,
  warehouseLength,
  racks,
  placedRacks,
  onPlacedRacksChange,
}: FloorPlanBuilderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [dragState, setDragState] = useState<{
    type: 'sidebar' | 'grid';
    rackId: string;
    widthCells: number;
    depthCells: number;
    gridX: number;
    gridY: number;
    valid: boolean;
    active: boolean;
  } | null>(null);

  const gridW = Math.ceil(warehouseWidth);
  const gridH = Math.ceil(warehouseLength);

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

  // Independent scales: fill both width and height
  const availableW = Math.max(containerSize.w - 220 - 16, 200);
  const availableH = Math.max(containerSize.h - 120, 300);
  const CELL_W = Math.max(availableW / gridW, MIN_CELL);
  const CELL_H = Math.max(availableH / gridH, MIN_CELL);

  const placedIds = useMemo(
    () => new Set(placedRacks.map((p) => p.rackId)),
    [placedRacks],
  );

  const unplacedRacks = useMemo(
    () => racks.filter((r) => !placedIds.has(r.id)),
    [racks, placedIds],
  );

  // ── Drag from sidebar ──

  const handleSidebarMouseDown = useCallback(
    (rackId: string, e: React.MouseEvent) => {
      e.preventDefault();
      const rack = racks.find((r) => r.id === rackId);
      if (!rack) return;
      const w = Math.ceil(rack.rack_width_m);
      const d = Math.ceil(rack.rack_depth_m);
      setDragState({
        type: 'sidebar',
        rackId,
        widthCells: w,
        depthCells: d,
        gridX: -1,
        gridY: -1,
        valid: false,
        active: true,
      });
    },
    [racks],
  );

  // ── Drag from grid ──

  const handleGridRackMouseDown = useCallback(
    (rackId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const placed = placedRacks.find((p) => p.rackId === rackId);
      if (!placed) return;
      setDragState({
        type: 'grid',
        rackId,
        widthCells: placed.widthCells,
        depthCells: placed.depthCells,
        gridX: placed.gridX,
        gridY: placed.gridY,
        valid: true,
        active: true,
      });
    },
    [placedRacks],
  );

  // ── Mouse move & up ──

  useEffect(() => {
    if (!dragState?.active) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const gx = Math.round(mouseX / CELL_W - dragState.widthCells / 2);
      const gy = Math.round(mouseY / CELL_H - dragState.depthCells / 2);

      const occ = buildOccupancy(
        gridW,
        gridH,
        placedRacks,
        dragState.type === 'grid' ? dragState.rackId : undefined,
      );
      const collision = checkCollision(
        occ,
        gx,
        gy,
        dragState.widthCells,
        dragState.depthCells,
        gridW,
        gridH,
      );

      setDragState((prev) =>
        prev ? { ...prev, gridX: gx, gridY: gy, valid: !collision } : prev,
      );
    };

    const handleMouseUp = () => {
      setDragState((prev) => {
        if (!prev) return null;
        if (prev.valid && prev.gridX >= 0 && prev.gridY >= 0) {
          const existing = placedRacks.find((p) => p.rackId === prev.rackId);
          let newPlacements: PlacedRack[];
          if (existing) {
            newPlacements = placedRacks.map((p) =>
              p.rackId === prev.rackId
                ? { ...p, gridX: prev.gridX, gridY: prev.gridY }
                : p,
            );
          } else {
            newPlacements = [
              ...placedRacks,
              {
                rackId: prev.rackId,
                gridX: prev.gridX,
                gridY: prev.gridY,
                widthCells: prev.widthCells,
                depthCells: prev.depthCells,
                rotated: false,
              },
            ];
          }
          onPlacedRacksChange(newPlacements);
        }
        return null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState?.active, dragState?.rackId, dragState?.type, dragState?.widthCells, dragState?.depthCells, placedRacks, gridW, gridH, onPlacedRacksChange, CELL_W, CELL_H]);

  // ── Rotate rack ──

  const handleRotate = useCallback(
    (rackId: string) => {
      const placed = placedRacks.find((p) => p.rackId === rackId);
      if (!placed) return;
      const newW = placed.depthCells;
      const newD = placed.widthCells;
      const occ = buildOccupancy(gridW, gridH, placedRacks, rackId);
      const collision = checkCollision(
        occ,
        placed.gridX,
        placed.gridY,
        newW,
        newD,
        gridW,
        gridH,
      );
      if (!collision) {
        onPlacedRacksChange(
          placedRacks.map((p) =>
            p.rackId === rackId
              ? { ...p, widthCells: newW, depthCells: newD, rotated: !p.rotated }
              : p,
          ),
        );
      }
    },
    [placedRacks, gridW, gridH, onPlacedRacksChange],
  );

  // ── Remove rack from grid ──

  const handleRemove = useCallback(
    (rackId: string) => {
      onPlacedRacksChange(placedRacks.filter((p) => p.rackId !== rackId));
    },
    [placedRacks, onPlacedRacksChange],
  );

  // ── Render ──

  const canvasWidth = gridW * CELL_W;
  const canvasHeight = gridH * CELL_H;

  return (
    <div ref={wrapperRef} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#1E293B',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Grid3X3 size={20} style={{ color: '#6366F1' }} />
          Distribucion del Almacen
        </h3>
        <span style={{ fontSize: 13, color: '#94A3B8' }}>
          {placedRacks.length} / {racks.length} estantes colocados
        </span>
      </div>

      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
        Arrastra los estantes desde el panel izquierdo al plano del almacen.
        Usa el boton de rotar para cambiar la orientacion.
      </p>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* ── Sidebar ── */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            backgroundColor: '#F8FAFC',
            borderRadius: 10,
            padding: 12,
            border: '1px solid #E2E8F0',
            overflowY: 'auto',
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#64748B',
              marginBottom: 10,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Estantes disponibles
          </p>

          {unplacedRacks.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '20px 8px',
                color: '#94A3B8',
                fontSize: 13,
              }}
            >
              <Move
                size={24}
                style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }}
              />
              Todos los estantes han sido colocados
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unplacedRacks.map((rack) => {
                const color = RACK_COLORS[racks.indexOf(rack) % RACK_COLORS.length];
                return (
                  <div
                    key={rack.id}
                    onMouseDown={(e) => handleSidebarMouseDown(rack.id, e)}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#FFFFFF',
                      border: `2px solid ${color}40`,
                      borderLeft: `4px solid ${color}`,
                      borderRadius: 8,
                      cursor: 'grab',
                      userSelect: 'none',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(2px)';
                      e.currentTarget.style.boxShadow = `0 2px 8px ${color}30`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#1E293B',
                        marginBottom: 2,
                      }}
                    >
                      {rack.code} — {rack.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>
                      {rack.rack_width_m}m × {rack.rack_depth_m}m |{' '}
                      {rack.levels} niveles | {rack.positions_per_level} pos
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Already placed */}
          {placedRacks.length > 0 && (
            <>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#10B981',
                  marginTop: 16,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                ✓ Colocados
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {placedRacks.map((p) => {
                  const rack = racks.find((r) => r.id === p.rackId);
                  if (!rack) return null;
                  return (
                    <div
                      key={p.rackId}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: '#F0FDF4',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        {rack.code} — ({p.gridX},{p.gridY})
                      </span>
                      {p.rotated && (
                        <span
                          style={{
                            fontSize: 10,
                            backgroundColor: '#D1FAE5',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}
                        >
                          Rotado
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Canvas ── */}
        <div
          ref={canvasRef}
          style={{
            flex: 1,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            border: '2px solid #E2E8F0',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: canvasWidth,
              height: canvasHeight,
              position: 'relative',
              backgroundImage: `
                linear-gradient(to right, ${GRID_LINE}30 1px, transparent 1px),
                linear-gradient(to bottom, ${GRID_LINE}30 1px, transparent 1px)
              `,
              backgroundSize: `${CELL_W}px ${CELL_H}px`,
              backgroundColor: GRID_COLOR,
            }}
          >
            {/* Meter markers on top */}
            {Array.from({ length: gridW }, (_, i) => (
              <span
                key={`mx-${i}`}
                style={{
                  position: 'absolute',
                  top: 2,
                  left: i * CELL_W + 4,
                  fontSize: 10,
                  color: '#94A3B8',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                }}
              >
                {i}m
              </span>
            ))}
            {/* Meter markers on left */}
            {Array.from({ length: gridH }, (_, i) => (
              <span
                key={`my-${i}`}
                style={{
                  position: 'absolute',
                  top: i * CELL_H + 4,
                  left: 4,
                  fontSize: 10,
                  color: '#94A3B8',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                }}
              >
                {i}m
              </span>
            ))}

            {/* Placed racks */}
            {placedRacks.map((p) => {
              const rack = racks.find((r) => r.id === p.rackId);
              if (!rack) return null;
              const isDragging = dragState?.rackId === p.rackId && dragState.type === 'grid';
              const color =
                RACK_COLORS[racks.indexOf(rack) % RACK_COLORS.length];

              return (
                <div
                  key={p.rackId}
                  onMouseDown={(e) => handleGridRackMouseDown(p.rackId, e)}
                  style={{
                    position: 'absolute',
                    left: p.gridX * CELL_W,
                    top: p.gridY * CELL_H,
                    width: p.widthCells * CELL_W - 2,
                    height: p.depthCells * CELL_H - 2,
                    backgroundColor: isDragging ? 'transparent' : color + '20',
                    border: `2px solid ${isDragging ? '#CBD5E1' : color}`,
                    borderRadius: 6,
                    cursor: 'grab',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    userSelect: 'none',
                    opacity: isDragging ? 0.3 : 1,
                    transition: 'opacity 0.15s',
                    zIndex: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: color,
                      fontFamily: 'monospace',
                      textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                    }}
                  >
                    {rack.code}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: '#64748B',
                      marginTop: 1,
                    }}
                  >
                    {rack.levels}×{rack.positions_per_level}
                  </span>

                  {/* Rack controls */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      right: -4,
                      display: 'flex',
                      gap: 2,
                      zIndex: 10,
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotate(p.rackId);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                      title="Rotar estante"
                    >
                      <RotateCw size={12} style={{ color: '#6366F1' }} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(p.rackId);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                      title="Quitar del plano"
                    >
                      <Trash2 size={12} style={{ color: '#EF4444' }} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Ghost (drag preview) */}
            {dragState?.active && dragState.gridX >= -1 && dragState.gridY >= -1 && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.max(0, dragState.gridX) * CELL_W,
                  top: Math.max(0, dragState.gridY) * CELL_H,
                  width: dragState.widthCells * CELL_W - 2,
                  height: dragState.depthCells * CELL_H - 2,
                  backgroundColor: dragState.valid
                    ? '#10B98120'
                    : '#EF444420',
                  border: `2px dashed ${dragState.valid ? '#10B981' : '#EF4444'}`,
                  borderRadius: 6,
                  pointerEvents: 'none',
                  zIndex: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'left 0.05s, top 0.05s',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: dragState.valid ? '#10B981' : '#EF4444',
                  }}
                >
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
          display: 'flex',
          gap: 20,
          marginTop: 12,
          padding: '8px 16px',
          backgroundColor: '#F8FAFC',
          borderRadius: 8,
          fontSize: 12,
          color: '#64748B',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span>
          {warehouseWidth}m × {warehouseLength}m
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              backgroundColor: '#10B98120',
              border: '2px dashed #10B981',
              display: 'inline-block',
            }}
          />
          Posicion valida
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              backgroundColor: '#EF444420',
              border: '2px dashed #EF4444',
              display: 'inline-block',
            }}
          />
          Colision
        </span>
        <span>
          <RotateCw size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />
          Rotar |{' '}
          <Trash2 size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />
          Quitar
        </span>
      </div>
    </div>
  );
}
