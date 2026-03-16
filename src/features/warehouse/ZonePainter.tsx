import { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, Trash2, Paintbrush } from 'lucide-react';
import type { PlacedRack, PlacedAisle, WizardRackForm, WizardAisleForm } from './FloorPlanBuilder.tsx';
import { CELL_SIZE_M } from './FloorPlanBuilder.tsx';
import type { ZoneType } from '@/types/warehouse.ts';

// ── Types ──

export interface WizardZoneForm {
  id: string;
  name: string;
  code: string;
  zone_type: ZoneType;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ZonePainterProps {
  warehouseWidth: number;
  warehouseLength: number;
  placedRacks: PlacedRack[];
  racks: WizardRackForm[];
  aisles: WizardAisleForm[];
  placedAisles: PlacedAisle[];
  zones: WizardZoneForm[];
  onZonesChange: (z: WizardZoneForm[]) => void;
}

// ── Constants ──

const MIN_CELL = 20;
const GRID_LINE = '#CBD5E1';

/** Visual colors matching the FloorPlanBuilder reference diagram */
const AISLE_BG = '#1E293B';
const SHELF_UNIT_BORDER = '#16A34A';
const SHELF_BORDER = '#2563EB';

const ZONE_TYPES: { value: ZoneType; label: string }[] = [
  { value: 'storage', label: 'Almacenamiento' },
  { value: 'receiving', label: 'Recepcion' },
  { value: 'packing', label: 'Empaque' },
  { value: 'dispatch', label: 'Despacho' },
  { value: 'returns', label: 'Devoluciones' },
];

const ZONE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16',
];

let zoneIdCounter = 0;
function tempZoneId() {
  return `zone_${++zoneIdCounter}_${Date.now()}`;
}

// ── Block layout helpers (mirrored from FloorPlanBuilder) ──

interface AisleBlockZ {
  aisleId: string;
  aisle: WizardAisleForm;
  racks: WizardRackForm[];
  orientation: 'vertical' | 'horizontal';
  mirrored: boolean;
}

interface BlockLayoutZ {
  widthCells: number;
  heightCells: number;
  aisleOffsetX: number;
  aisleOffsetY: number;
  aisleW: number;
  aisleH: number;
  rackColBounds: { x: number; y: number; w: number; h: number } | null;
  rackOffsets: { rackId: string; offsetX: number; offsetY: number; wCells: number; dCells: number }[];
}

function computeBlockLayoutZ(block: AisleBlockZ): BlockLayoutZ {
  const { aisle, racks, orientation, mirrored } = block;
  const aisleWCells = Math.max(1, Math.ceil(aisle.widthCells / CELL_SIZE_M));
  const toRackCells = (r: WizardRackForm) => ({
    wAlong: Math.max(1, Math.ceil(r.rack_width_m / CELL_SIZE_M)),
    dPerp: Math.max(1, Math.ceil(r.rack_depth_m / CELL_SIZE_M)),
  });
  const sortedRacks = [...racks].sort((a, b) => a.code.localeCompare(b.code));
  const maxDepth = sortedRacks.length > 0 ? Math.max(...sortedRacks.map((r) => toRackCells(r).dPerp)) : 0;
  const totalAlong = sortedRacks.reduce((s, r) => s + toRackCells(r).wAlong, 0);
  const blockPerp = maxDepth + aisleWCells;
  const blockAlong = Math.max(totalAlong, 1);

  const rackOffsets: BlockLayoutZ['rackOffsets'] = [];
  let yAccum = 0;
  for (const r of sortedRacks) {
    const { wAlong, dPerp } = toRackCells(r);
    if (orientation === 'vertical') {
      const rackBaseX = mirrored ? aisleWCells : 0;
      rackOffsets.push({ rackId: r.id, offsetX: rackBaseX + (maxDepth - dPerp), offsetY: yAccum, wCells: dPerp, dCells: wAlong });
    } else {
      const rackBaseY = mirrored ? aisleWCells : 0;
      rackOffsets.push({ rackId: r.id, offsetX: yAccum, offsetY: rackBaseY + (maxDepth - dPerp), wCells: wAlong, dCells: dPerp });
    }
    yAccum += wAlong;
  }

  const rackColBounds = sortedRacks.length > 0
    ? (orientation === 'vertical'
      ? { x: mirrored ? aisleWCells : 0, y: 0, w: maxDepth, h: totalAlong }
      : { x: 0, y: mirrored ? aisleWCells : 0, w: totalAlong, h: maxDepth })
    : null;

  if (orientation === 'vertical') {
    return { widthCells: blockPerp, heightCells: blockAlong, aisleOffsetX: mirrored ? 0 : maxDepth, aisleOffsetY: 0, aisleW: aisleWCells, aisleH: blockAlong, rackColBounds, rackOffsets };
  }
  return { widthCells: blockAlong, heightCells: blockPerp, aisleOffsetX: 0, aisleOffsetY: mirrored ? 0 : maxDepth, aisleW: blockAlong, aisleH: aisleWCells, rackColBounds, rackOffsets };
}

// ── Component ──

export function ZonePainter({
  warehouseWidth,
  warehouseLength,
  placedRacks: _placedRacks,
  racks,
  aisles,
  placedAisles,
  zones,
  onZonesChange,
}: ZonePainterProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawEnd, setDrawEnd] = useState({ x: 0, y: 0 });
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const gridW = Math.ceil(warehouseWidth);
  const gridH = Math.ceil(warehouseLength);

  // ── Build blocks for rendering ──
  const blocks = useMemo(() => {
    return aisles.map((aisle, idx) => {
      const aisleRacks = racks.filter((r) => r.aisleId === aisle.id);
      const pa = placedAisles.find((p) => p.aisleId === aisle.id);
      return {
        aisleId: aisle.id,
        aisle,
        racks: aisleRacks,
        orientation: pa?.orientation ?? aisle.orientation ?? ('vertical' as const),
        mirrored: pa?.mirrored ?? (idx % 2 === 0),
      };
    });
  }, [aisles, racks, placedAisles]);

  const blockPositions = useMemo(() => {
    const map = new Map<string, { gridX: number; gridY: number }>();
    for (const block of blocks) {
      const layout = computeBlockLayoutZ(block);
      const pa = placedAisles.find((p) => p.aisleId === block.aisleId);
      if (pa) {
        map.set(block.aisleId, {
          gridX: pa.gridX - layout.aisleOffsetX,
          gridY: pa.gridY - layout.aisleOffsetY,
        });
      }
    }
    return map;
  }, [blocks, placedAisles]);

  // ── Measure container to fit grid exactly ──
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

  const availableW = Math.max(containerSize.w - 260 - 16, 200);
  const availableH = Math.max(containerSize.h - 120, 300);
  const CELL_W = Math.max(availableW / gridW, MIN_CELL);
  const CELL_H = Math.max(availableH / gridH, MIN_CELL);

  const canvasWidth = gridW * CELL_W;
  const canvasHeight = gridH * CELL_H;

  // ── Drawing ──

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't start drawing if clicking on a zone or rack
    if (target.dataset.zone || target.dataset.rack) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scrollLeft = canvasRef.current?.scrollLeft ?? 0;
    const scrollTop = canvasRef.current?.scrollTop ?? 0;
    const mx = e.clientX - rect.left + scrollLeft;
    const my = e.clientY - rect.top + scrollTop;
    const gx = Math.floor(mx / CELL_W);
    const gy = Math.floor(my / CELL_H);

    setDrawStart({ x: gx, y: gy });
    setDrawEnd({ x: gx + 1, y: gy + 1 });
    setDrawing(true);
    setSelectedZoneId(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scrollLeft = canvasRef.current?.scrollLeft ?? 0;
    const scrollTop = canvasRef.current?.scrollTop ?? 0;
    const mx = e.clientX - rect.left + scrollLeft;
    const my = e.clientY - rect.top + scrollTop;
    const gx = Math.ceil(mx / CELL_W);
    const gy = Math.ceil(my / CELL_H);
    setDrawEnd({
      x: Math.min(Math.max(gx, 0), gridW),
      y: Math.min(Math.max(gy, 0), gridH),
    });
  };

  const handleCanvasMouseUp = () => {
    if (!drawing) return;
    setDrawing(false);

    // Calculate rect
    const x = Math.min(drawStart.x, drawEnd.x);
    const y = Math.min(drawStart.y, drawEnd.y);
    const w = Math.abs(drawEnd.x - drawStart.x);
    const h = Math.abs(drawEnd.y - drawStart.y);

    // Minimum 2×2 zone
    if (w < 2 || h < 2) return;

    const index = zones.length + 1;
    const newZone: WizardZoneForm = {
      id: tempZoneId(),
      name: `Zona ${index}`,
      code: `Z-${String(index).padStart(2, '0')}`,
      zone_type: 'storage',
      color: ZONE_COLORS[(index - 1) % ZONE_COLORS.length],
      x,
      y,
      width: w,
      height: h,
    };
    onZonesChange([...zones, newZone]);
    setSelectedZoneId(newZone.id);
  };

  // ── Zone editing ──

  const updateZone = (id: string, field: keyof WizardZoneForm, value: string) => {
    onZonesChange(
      zones.map((z) => (z.id === id ? { ...z, [field]: value } : z)),
    );
  };

  const deleteZone = (id: string) => {
    onZonesChange(zones.filter((z) => z.id !== id));
    if (selectedZoneId === id) setSelectedZoneId(null);
  };

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
          <Paintbrush size={20} style={{ color: '#8B5CF6' }} />
          Demarcacion de Zonas
        </h3>
        <span style={{ fontSize: 13, color: '#94A3B8' }}>
          {zones.length} zona{zones.length !== 1 ? 's' : ''} definida{zones.length !== 1 ? 's' : ''}
        </span>
      </div>

      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
        Haz click y arrastra sobre el plano para definir zonas rectangulares.
        Si no defines zonas, se creara una zona "Almacenamiento" que cubra todo el almacen.
      </p>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* ── Zones list sidebar ── */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            backgroundColor: '#F8FAFC',
            borderRadius: 10,
            padding: 12,
            border: '1px solid #E2E8F0',
            maxHeight: canvasHeight + 40,
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
            Zonas definidas
          </p>

          {zones.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '20px 8px',
                color: '#94A3B8',
                fontSize: 12,
              }}
            >
              <MapPin
                size={24}
                style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }}
              />
              Arrastra sobre el plano para crear una zona, o avanza al siguiente paso para crear una zona default.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {zones.map((zone) => {
                const isSelected = selectedZoneId === zone.id;
                return (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    style={{
                      padding: 10,
                      backgroundColor: isSelected ? zone.color + '15' : '#fff',
                      border: `2px solid ${isSelected ? zone.color : '#E2E8F040'}`,
                      borderLeft: `4px solid ${zone.color}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <input
                        type="text"
                        value={zone.name}
                        onChange={(e) =>
                          updateZone(zone.id, 'name', e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="rh-input"
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          padding: '2px 6px',
                          flex: 1,
                          marginRight: 6,
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteZone(zone.id);
                        }}
                        style={{
                          padding: 4,
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: '#EF4444',
                        }}
                        title="Eliminar zona"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 4,
                      }}
                    >
                      <input
                        type="text"
                        value={zone.code}
                        onChange={(e) =>
                          updateZone(zone.id, 'code', e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="rh-input"
                        style={{ fontSize: 11, padding: '2px 6px' }}
                        placeholder="Z-01"
                      />
                      <select
                        value={zone.zone_type}
                        onChange={(e) =>
                          updateZone(zone.id, 'zone_type', e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="rh-select"
                        style={{ fontSize: 11, padding: '2px 4px' }}
                      >
                        {ZONE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 6,
                      }}
                    >
                      <input
                        type="color"
                        value={zone.color}
                        onChange={(e) =>
                          updateZone(zone.id, 'color', e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: 24,
                          height: 24,
                          padding: 1,
                          border: '1px solid #E2E8F0',
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      />
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>
                        {zone.width}m × {zone.height}m
                      </span>
                    </div>
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
            flex: 1,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            border: '2px solid #E2E8F0',
            position: 'relative',
            cursor: 'crosshair',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
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
              backgroundColor: '#F8FAFC08',
            }}
          >
            {/* Zones (underneath racks) */}
            {zones.map((zone) => (
              <div
                key={zone.id}
                data-zone="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedZoneId(zone.id);
                }}
                style={{
                  position: 'absolute',
                  left: zone.x * CELL_W,
                  top: zone.y * CELL_H,
                  width: zone.width * CELL_W,
                  height: zone.height * CELL_H,
                  backgroundColor: zone.color + '20',
                  border: `2px ${selectedZoneId === zone.id ? 'solid' : 'dashed'} ${zone.color}`,
                  borderRadius: 6,
                  zIndex: 1,
                  pointerEvents: 'all',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: zone.color,
                    backgroundColor: '#ffffffCC',
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}
                >
                  {zone.name} ({zone.code})
                </span>
              </div>
            ))}

            {/* ═══ Blocks: aisles + racks (read-only, same as FloorPlanBuilder) ═══ */}
            {blocks.map((block) => {
              const pos = blockPositions.get(block.aisleId);
              if (!pos) return null;
              const layout = computeBlockLayoutZ(block);
              // Convert from grid cells (0.5m each) to meters for this canvas
              const cellToM = CELL_SIZE_M;

              return (
                <div key={block.aisleId}>
                  {/* Green rack column border */}
                  {layout.rackColBounds && (
                    <div
                      style={{
                        position: 'absolute',
                        left: (pos.gridX + layout.rackColBounds.x) * cellToM * CELL_W,
                        top: (pos.gridY + layout.rackColBounds.y) * cellToM * CELL_H,
                        width: layout.rackColBounds.w * cellToM * CELL_W,
                        height: layout.rackColBounds.h * cellToM * CELL_H,
                        border: `2px solid ${SHELF_UNIT_BORDER}60`,
                        borderRadius: 3,
                        backgroundColor: `${SHELF_UNIT_BORDER}08`,
                        pointerEvents: 'none',
                        zIndex: 2,
                      }}
                    />
                  )}

                  {/* Black aisle corridor */}
                  <div
                    style={{
                      position: 'absolute',
                      left: (pos.gridX + layout.aisleOffsetX) * cellToM * CELL_W,
                      top: (pos.gridY + layout.aisleOffsetY) * cellToM * CELL_H,
                      width: layout.aisleW * cellToM * CELL_W,
                      height: layout.aisleH * cellToM * CELL_H,
                      backgroundColor: `${AISLE_BG}40`,
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
                        fontSize: 10, fontWeight: 800, color: AISLE_BG, fontFamily: 'monospace',
                        writingMode: block.orientation === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
                        textOrientation: 'mixed', letterSpacing: 1, opacity: 0.7,
                      }}
                    >
                      {block.aisle.code}
                    </span>
                  </div>

                  {/* Blue individual racks */}
                  {layout.rackOffsets.map((ro) => {
                    const rack = block.racks.find((r) => r.id === ro.rackId);
                    if (!rack) return null;
                    const aisleForCode = aisles.find((a) => a.id === rack.aisleId);
                    const displayCode = aisleForCode ? `${aisleForCode.code}-${rack.code}` : rack.code;

                    return (
                      <div
                        key={ro.rackId}
                        data-rack="true"
                        style={{
                          position: 'absolute',
                          left: (pos.gridX + ro.offsetX) * cellToM * CELL_W + 2,
                          top: (pos.gridY + ro.offsetY) * cellToM * CELL_H + 1,
                          width: ro.wCells * cellToM * CELL_W - 4,
                          height: ro.dCells * cellToM * CELL_H - 2,
                          backgroundColor: '#EFF6FF',
                          border: `1.5px solid ${SHELF_BORDER}80`,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none',
                          zIndex: 3,
                        }}
                      >
                        <span style={{ fontSize: 9, fontWeight: 800, color: SHELF_BORDER, fontFamily: 'monospace', opacity: 0.7 }}>
                          {displayCode}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Drawing preview */}
            {drawing && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(drawStart.x, drawEnd.x) * CELL_W,
                  top: Math.min(drawStart.y, drawEnd.y) * CELL_H,
                  width:
                    Math.abs(drawEnd.x - drawStart.x) * CELL_W,
                  height:
                    Math.abs(drawEnd.y - drawStart.y) * CELL_H,
                  backgroundColor: '#8B5CF620',
                  border: '2px dashed #8B5CF6',
                  borderRadius: 6,
                  pointerEvents: 'none',
                  zIndex: 50,
                }}
              />
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Paintbrush size={12} />
          Click y arrastra para crear zonas
        </span>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>
          Minimo 2m × 2m | Si no creas zonas, se creara una zona default automaticamente
        </span>
      </div>
    </div>
  );
}
