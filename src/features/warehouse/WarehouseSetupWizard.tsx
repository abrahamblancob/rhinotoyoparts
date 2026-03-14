import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Warehouse,
  Grid3X3,
  MapPin,
  ClipboardCheck,
  LayoutGrid,
  Package,
  BarChart3,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from '@/stores/toastStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import * as warehouseService from '@/services/warehouseService.ts';
import * as orgService from '@/services/orgService.ts';
import { FloorPlanBuilder, CELL_SIZE_M } from './FloorPlanBuilder.tsx';
import { ZonePainter } from './ZonePainter.tsx';
import type { Organization } from '@/lib/database.types.ts';
import type { ZoneType, RackOrientation } from '@/types/warehouse.ts';
import type { WizardRackForm, PlacedRack, WizardAisleForm, PlacedAisle } from './FloorPlanBuilder.tsx';
import type { WizardZoneForm } from './ZonePainter.tsx';

// ── Step definitions ──

type WizardStep = 'warehouse' | 'racks' | 'layout' | 'zones' | 'confirm';

const STEPS: { key: WizardStep; label: string; icon: typeof Warehouse }[] = [
  { key: 'warehouse', label: 'Almacen', icon: Warehouse },
  { key: 'racks', label: 'Estantes', icon: Grid3X3 },
  { key: 'layout', label: 'Distribucion', icon: LayoutGrid },
  { key: 'zones', label: 'Zonas', icon: MapPin },
  { key: 'confirm', label: 'Confirmacion', icon: ClipboardCheck },
];

// ── Warehouse form ──

interface WarehouseForm {
  name: string;
  code: string;
  width_m: number | null;
  length_m: number | null;
  height_m: number | null;
  address: string;
  pick_expiry_minutes: number;
}

// ── Helpers ──

let idCounter = 0;
function tempId() {
  return `temp_${++idCounter}_${Date.now()}`;
}

function levelToLetter(level: number): string {
  return String.fromCharCode(64 + level);
}

const RACK_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

// ── Component ──

export function WarehouseSetupWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const organization = useAuthStore((s) => s.organization);
  const { isPlatform, isAssociate } = usePermissions();

  const [currentStep, setCurrentStep] = useState<WizardStep>('warehouse');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editLoading, setEditLoading] = useState(!!editId);

  // Platform: needs to select which aggregator owns the warehouse
  const [aggregators, setAggregators] = useState<Organization[]>([]);
  const [selectedAggregatorId, setSelectedAggregatorId] = useState<string>('');

  // Step 1: Warehouse data
  const [warehouse, setWarehouse] = useState<WarehouseForm>({
    name: '',
    code: 'ALM-01',
    width_m: null,
    length_m: null,
    height_m: null,
    address: '',
    pick_expiry_minutes: 30,
  });

  // Step 2: Racks & Aisles
  const [racks, setRacks] = useState<WizardRackForm[]>([]);
  const [wizardAisles, setWizardAisles] = useState<WizardAisleForm[]>([]);

  // Step 3: Layout (placements)
  const [placedRacks, setPlacedRacks] = useState<PlacedRack[]>([]);
  const [placedAisles, setPlacedAisles] = useState<PlacedAisle[]>([]);

  // Step 4: Zones
  const [zones, setZones] = useState<WizardZoneForm[]>([]);

  // Resolve org
  const resolvedOrgId = isPlatform ? selectedAggregatorId : organization?.id;

  // ── Effects ──

  useEffect(() => {
    if (isPlatform) {
      orgService.getOrganizations({ type: 'aggregator', status: 'active' }).then((res) => {
        setAggregators(res.data ?? []);
      });
    }
  }, [isPlatform]);

  useEffect(() => {
    if (isAssociate) {
      navigate('/hub/warehouse', { replace: true });
    }
  }, [isAssociate, navigate]);

  // Auto-generate warehouse code (only for new warehouses)
  useEffect(() => {
    if (resolvedOrgId && !editId) {
      warehouseService.getWarehouseCount(resolvedOrgId).then((count) => {
        const nextNum = (count ?? 0) + 1;
        setWarehouse((prev) => ({
          ...prev,
          code: `ALM-${String(nextNum).padStart(2, '0')}`,
        }));
      });
    }
  }, [resolvedOrgId, editId]);

  // ── Load existing warehouse for editing ──
  useEffect(() => {
    if (!editId) return;
    setEditLoading(true);

    (async () => {
      try {
        // Load warehouse
        const whRes = await warehouseService.getWarehouse(editId);
        if (whRes.error || !whRes.data) {
          setError('No se pudo cargar el almacen.');
          setEditLoading(false);
          return;
        }
        const wh = whRes.data;
        setWarehouse({
          name: wh.name,
          code: wh.code,
          width_m: wh.width_m ?? null,
          length_m: wh.length_m ?? null,
          height_m: wh.height_m ?? null,
          address: wh.address ?? '',
          pick_expiry_minutes: wh.pick_expiry_minutes ?? 30,
        });

        if (isPlatform) {
          setSelectedAggregatorId(wh.org_id);
        }

        // Load zones
        const zonesRes = await warehouseService.getZones(editId);
        if (zonesRes.data && zonesRes.data.length > 0) {
          setZones(
            zonesRes.data.map((z) => ({
              id: z.id,
              name: z.name,
              code: z.code,
              zone_type: z.zone_type as ZoneType,
              color: z.color ?? '#3B82F6',
              x: z.position_x ?? 0,
              y: z.position_y ?? 0,
              width: z.width ?? 5,
              height: z.height ?? 5,
            })),
          );
        }

        // Load racks
        const racksRes = await warehouseService.getRacks(editId);
        if (racksRes.data && racksRes.data.length > 0) {
          const loadedRacks: WizardRackForm[] = [];
          const loadedPlacements: PlacedRack[] = [];

          for (const r of racksRes.data) {
            const rackForm: WizardRackForm = {
              id: r.id,
              name: r.name,
              code: r.code,
              rack_width_m: r.rack_width_m ?? 1,
              rack_depth_m: r.rack_depth_m ?? 1,
              levels: r.levels,
              positions_per_level: r.positions_per_level,
              aisleId: r.aisle_id ?? undefined,
            };
            loadedRacks.push(rackForm);

            if (r.position_x != null && r.position_y != null) {
              const isRotated = r.orientation === 'horizontal';
              loadedPlacements.push({
                rackId: r.id,
                gridX: Math.round(r.position_x / CELL_SIZE_M),
                gridY: Math.round(r.position_y / CELL_SIZE_M),
                widthCells: isRotated
                  ? Math.ceil((r.rack_depth_m ?? 1) / CELL_SIZE_M)
                  : Math.ceil((r.rack_width_m ?? 1) / CELL_SIZE_M),
                depthCells: isRotated
                  ? Math.ceil((r.rack_width_m ?? 1) / CELL_SIZE_M)
                  : Math.ceil((r.rack_depth_m ?? 1) / CELL_SIZE_M),
                rotated: isRotated,
              });
            }
          }
          setRacks(loadedRacks);
          setPlacedRacks(loadedPlacements);
        }

        // Load aisles
        const aislesRes = await warehouseService.getAisles(editId);
        if (aislesRes.data && aislesRes.data.length > 0) {
          const loadedAisles: WizardAisleForm[] = [];
          const loadedAislePlacements: PlacedAisle[] = [];

          for (const a of aislesRes.data) {
            loadedAisles.push({
              id: a.id,
              name: a.name,
              code: a.code,
              widthCells: a.width_m ?? 0.5,
              lengthCells: a.length_cells ?? 10,
            });

            if (a.position_x != null && a.position_y != null) {
              loadedAislePlacements.push({
                aisleId: a.id,
                gridX: Math.round(a.position_x / CELL_SIZE_M),
                gridY: Math.round(a.position_y / CELL_SIZE_M),
                lengthCells: Math.max(1, Math.ceil((a.length_cells ?? 10) / CELL_SIZE_M)),
                widthCells: Math.max(1, Math.ceil((a.width_m ?? 0.5) / CELL_SIZE_M)),
                orientation: (a.orientation as 'vertical' | 'horizontal') ?? 'vertical',
              });
            }
          }
          setWizardAisles(loadedAisles);
          setPlacedAisles(loadedAislePlacements);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setEditLoading(false);
      }
    })();
  }, [editId, isPlatform]);

  // ── Navigation ──

  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'warehouse':
        if (isPlatform && !selectedAggregatorId) return false;
        return (
          warehouse.name.trim().length > 0 &&
          (warehouse.width_m ?? 0) > 0 &&
          (warehouse.length_m ?? 0) > 0 &&
          (warehouse.height_m ?? 0) > 0
        );
      case 'racks':
        return (
          wizardAisles.length > 0 &&
          racks.length > 0 &&
          racks.every(
            (r) =>
              r.aisleId &&
              r.rack_width_m > 0 &&
              r.rack_depth_m > 0 &&
              r.levels >= 1 &&
              r.positions_per_level >= 1,
          )
        );
      case 'layout':
        return placedRacks.length === racks.length;
      case 'zones':
        return true; // always valid — default zone created if empty
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < STEPS.length) setCurrentStep(STEPS[nextIndex].key);
  };

  const goPrev = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) setCurrentStep(STEPS[prevIndex].key);
  };

  // ── Rack helpers ──

  const addRack = (aisleId: string) => {
    const aisle = wizardAisles.find((a) => a.id === aisleId);
    if (!aisle) return;
    const aisleRacks = racks.filter((r) => r.aisleId === aisleId);
    const index = aisleRacks.length + 1;
    const code = String(index).padStart(2, '0');
    setRacks((prev) => [
      ...prev,
      {
        id: tempId(),
        name: `Estante ${aisle.code}-${code}`,
        code,
        aisleId,
        rack_width_m: 2,
        rack_depth_m: 1,
        levels: 4,
        positions_per_level: 5,
      },
    ]);
  };

  const updateRack = (id: string, field: keyof WizardRackForm, value: string | number) => {
    setRacks((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
    // If dimensions change, remove placement (user must re-place)
    if (field === 'rack_width_m' || field === 'rack_depth_m') {
      setPlacedRacks((prev) => prev.filter((p) => p.rackId !== id));
    }
  };

  const removeRack = (id: string) => {
    const removedRack = racks.find((r) => r.id === id);
    setRacks((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      // Renumber remaining racks in the same aisle to stay sequential
      if (removedRack?.aisleId) {
        const aisle = wizardAisles.find((a) => a.id === removedRack.aisleId);
        let idx = 0;
        return filtered.map((r) => {
          if (r.aisleId === removedRack.aisleId) {
            idx++;
            const newCode = String(idx).padStart(2, '0');
            return {
              ...r,
              code: newCode,
              name: aisle ? `Estante ${aisle.code}-${newCode}` : r.name,
            };
          }
          return r;
        });
      }
      return filtered;
    });
    setPlacedRacks((prev) => prev.filter((p) => p.rackId !== id));
  };

  // ── Aisle helpers ──

  const addAisle = () => {
    const index = wizardAisles.length + 1;
    const code = `P${index}`;
    setWizardAisles((prev) => [
      ...prev,
      {
        id: tempId(),
        name: `Pasillo ${index}`,
        code,
        widthCells: 0.5,
        lengthCells: warehouse.length_m ?? 10,
      },
    ]);
  };

  const updateAisle = (id: string, field: keyof WizardAisleForm, value: string | number) => {
    setWizardAisles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    );
    // If dimensions change, remove placement (user must re-place)
    if (field === 'widthCells' || field === 'lengthCells') {
      setPlacedAisles((prev) => prev.filter((p) => p.aisleId !== id));
    }
  };

  const removeAisle = (id: string) => {
    setWizardAisles((prev) => prev.filter((a) => a.id !== id));
    setPlacedAisles((prev) => prev.filter((a) => a.aisleId !== id));
    // Also remove racks belonging to this aisle
    const rackIds = racks.filter((r) => r.aisleId === id).map((r) => r.id);
    setRacks((prev) => prev.filter((r) => r.aisleId !== id));
    setPlacedRacks((prev) => prev.filter((p) => !rackIds.includes(p.rackId)));
  };

  // ── Computed values ──

  // Helper to get display code with aisle prefix
  const rackDisplayCode = (rack: WizardRackForm) => {
    if (rack.aisleId) {
      const aisle = wizardAisles.find((a) => a.id === rack.aisleId);
      if (aisle) return `${aisle.code}-${rack.code}`;
    }
    return rack.code;
  };

  const area = (warehouse.width_m ?? 0) * (warehouse.length_m ?? 0);
  const totalLocations = racks.reduce(
    (sum, r) => sum + r.levels * r.positions_per_level,
    0,
  );
  const rackFootprint = racks.reduce(
    (sum, r) => sum + r.rack_width_m * r.rack_depth_m,
    0,
  );
  const occupancyPct = area > 0 ? Math.round((rackFootprint / area) * 100) : 0;

  // ── Save ──

  const handleSave = async () => {
    if (!resolvedOrgId) {
      setError(
        isPlatform
          ? 'Selecciona un agregador para el almacen.'
          : 'No se encontro la organizacion activa.',
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. Create or update warehouse
      const whResult = await warehouseService.saveWarehouse(
        {
          name: warehouse.name,
          code: warehouse.code,
          address: warehouse.address || '',
          total_area_sqm: area > 0 ? area : null,
          usable_area_sqm: null,
          latitude: null,
          longitude: null,
          width_m: warehouse.width_m,
          length_m: warehouse.length_m,
          height_m: warehouse.height_m,
          pick_expiry_minutes: warehouse.pick_expiry_minutes,
          org_id: resolvedOrgId,
        },
        editId ?? undefined,
      );

      if (whResult.error || !whResult.data) {
        const msg = whResult.error ?? 'Error al guardar el almacen.';
        setError(msg);
        toast('error', msg);
        return;
      }

      const warehouseId = whResult.data.id;

      // 2. Resolve zones (auto-create default if empty)
      let effectiveZones = zones;
      if (effectiveZones.length === 0) {
        effectiveZones = [
          {
            id: tempId(),
            name: 'Almacenamiento',
            code: 'Z-01',
            zone_type: 'storage' as ZoneType,
            color: '#3B82F6',
            x: 0,
            y: 0,
            width: warehouse.width_m ?? 10,
            height: warehouse.length_m ?? 10,
          },
        ];
      }

      // 3. Create/update zones → map id -> realId
      const zoneIdMap = new Map<string, string>();

      if (editId) {
        // In edit mode: delete zones that were removed, upsert the rest
        const existingZones = await warehouseService.getZones(warehouseId);
        const currentZoneIds = new Set(effectiveZones.map((z) => z.id));
        for (const ez of existingZones.data ?? []) {
          if (!currentZoneIds.has(ez.id)) {
            await warehouseService.deleteZone(ez.id);
          }
        }
      }

      for (const zone of effectiveZones) {
        const isExisting = editId && !zone.id.startsWith('zone_') && !zone.id.startsWith('temp_');
        const zoneResult = await warehouseService.saveZone(
          {
            name: zone.name,
            code: zone.code,
            zone_type: zone.zone_type,
            area_sqm: zone.width * zone.height,
            color: zone.color,
            position_x: zone.x,
            position_y: zone.y,
            width: zone.width,
            height: zone.height,
            warehouse_id: warehouseId,
          },
          isExisting ? zone.id : undefined,
        );

        if (zoneResult.error || !zoneResult.data) {
          const msg = `Error al guardar zona "${zone.name}": ${zoneResult.error}`;
          setError(msg);
          toast('error', msg);
          return;
        }
        zoneIdMap.set(zone.id, zoneResult.data.id);
      }

      // 4. Create/update aisles
      const aisleIdMap = new Map<string, string>();

      if (editId) {
        // Delete aisles that were removed
        const existingAisles = await warehouseService.getAisles(warehouseId);
        const currentAisleIds = new Set(wizardAisles.map((a) => a.id));
        for (const ea of existingAisles.data ?? []) {
          if (!currentAisleIds.has(ea.id)) {
            await warehouseService.deleteAisle(ea.id);
          }
        }
      }

      for (const aisle of wizardAisles) {
        const pa = placedAisles.find((p) => p.aisleId === aisle.id);
        const isExistingAisle = editId && !aisle.id.startsWith('temp_');

        // Find zone containing aisle center
        let aisleZoneId: string | null = null;
        if (pa) {
          const aw = pa.orientation === 'horizontal' ? pa.lengthCells : pa.widthCells;
          const ah = pa.orientation === 'horizontal' ? pa.widthCells : pa.lengthCells;
          const cx = (pa.gridX + aw / 2) * CELL_SIZE_M;
          const cy = (pa.gridY + ah / 2) * CELL_SIZE_M;
          for (const zone of effectiveZones) {
            if (cx >= zone.x && cx <= zone.x + zone.width && cy >= zone.y && cy <= zone.y + zone.height) {
              aisleZoneId = zoneIdMap.get(zone.id) ?? null;
              break;
            }
          }
        }

        const aisleResult = await warehouseService.saveAisle(
          {
            name: aisle.name,
            code: aisle.code,
            width_m: aisle.widthCells,
            position_x: pa ? pa.gridX * CELL_SIZE_M : null,
            position_y: pa ? pa.gridY * CELL_SIZE_M : null,
            length_cells: aisle.lengthCells,
            orientation: pa?.orientation ?? 'vertical',
            warehouse_id: warehouseId,
            zone_id: aisleZoneId,
          },
          isExistingAisle ? aisle.id : undefined,
        );

        if (aisleResult.error || !aisleResult.data) {
          const msg = `Error al guardar pasillo "${aisle.name}": ${aisleResult.error}`;
          setError(msg);
          toast('error', msg);
          return;
        }
        aisleIdMap.set(aisle.id, aisleResult.data.id);
      }

      // 5. Create/update racks with zone + aisle assignment
      if (editId) {
        const existingRacks = await warehouseService.getRacks(warehouseId);
        const currentRackIds = new Set(racks.map((r) => r.id));
        for (const er of existingRacks.data ?? []) {
          if (!currentRackIds.has(er.id)) {
            await warehouseService.deleteRack(er.id);
          }
        }
      }

      for (const rack of racks) {
        const placement = placedRacks.find((p) => p.rackId === rack.id);

        // Determine zone assignment
        let assignedZoneId: string | null = null;
        if (placement) {
          const rackCenterX = (placement.gridX + placement.widthCells / 2) * CELL_SIZE_M;
          const rackCenterY = (placement.gridY + placement.depthCells / 2) * CELL_SIZE_M;
          for (const zone of effectiveZones) {
            if (
              rackCenterX >= zone.x &&
              rackCenterX <= zone.x + zone.width &&
              rackCenterY >= zone.y &&
              rackCenterY <= zone.y + zone.height
            ) {
              assignedZoneId = zoneIdMap.get(zone.id) ?? null;
              break;
            }
          }
        }
        if (!assignedZoneId) {
          assignedZoneId = Array.from(zoneIdMap.values())[0];
        }

        // Determine aisle assignment from explicit aisleId
        const assignedAisleId = rack.aisleId ? (aisleIdMap.get(rack.aisleId) ?? null) : null;

        const orientation: RackOrientation = placement?.rotated
          ? 'horizontal'
          : 'vertical';

        const isExistingRack = editId && !rack.id.startsWith('temp_');
        const rackResult = await warehouseService.saveRack(
          {
            name: rack.name,
            code: rack.code,
            zone_id: assignedZoneId,
            aisle_id: assignedAisleId,
            levels: rack.levels,
            positions_per_level: rack.positions_per_level,
            max_weight_kg: null,
            rack_width_m: rack.rack_width_m,
            rack_depth_m: rack.rack_depth_m,
            warehouse_id: warehouseId,
          },
          isExistingRack ? rack.id : undefined,
        );

        if (rackResult.error) {
          const msg = `Error al guardar estante "${rack.name}": ${rackResult.error}`;
          setError(msg);
          toast('error', msg);
          return;
        }

        // Update position if placement exists
        if (rackResult.data && placement) {
          await warehouseService.updateRackPosition(rackResult.data.id, {
            position_x: placement.gridX * CELL_SIZE_M,
            position_y: placement.gridY * CELL_SIZE_M,
            orientation,
          });
        }
      }

      toast('success', editId ? 'Almacen actualizado exitosamente.' : 'Almacen creado exitosamente.');
      navigate('/hub/warehouse');
    } catch (err) {
      const msg = (err as Error).message ?? 'Error inesperado al guardar.';
      setError(msg);
      toast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──

  return (
    <div>
      {/* Page Header */}
      <div className="rh-page-header">
        <h1 className="rh-page-title">
          <Warehouse
            size={24}
            style={{
              display: 'inline',
              marginRight: 8,
              verticalAlign: 'middle',
            }}
          />
          {editId ? 'Editar Almacen' : 'Configurar Almacen'}
        </h1>
        <p className="rh-page-subtitle">
          {editId
            ? 'Modifica las dimensiones, estantes y distribucion de tu almacen'
            : 'Configura las dimensiones, estantes y distribucion de tu almacen'}
        </p>
      </div>

      {/* Step Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          marginBottom: 32,
          padding: '16px 0',
        }}
      >
        {STEPS.map((step, i) => {
          const StepIcon = step.icon;
          const state =
            i < currentIndex
              ? 'completed'
              : i === currentIndex
                ? 'active'
                : 'pending';
          return (
            <div
              key={step.key}
              style={{ display: 'flex', alignItems: 'center', gap: 0 }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  cursor: state === 'completed' ? 'pointer' : 'default',
                }}
                onClick={
                  state === 'completed'
                    ? () => setCurrentStep(step.key)
                    : undefined
                }
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor:
                      state === 'completed'
                        ? '#10B981'
                        : state === 'active'
                          ? '#D3010A'
                          : '#E2E8F0',
                    color: state === 'pending' ? '#94A3B8' : '#FFFFFF',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {state === 'completed' ? (
                    <Check size={18} />
                  ) : (
                    <StepIcon size={18} />
                  )}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: state === 'active' ? 700 : 500,
                    color:
                      state === 'active'
                        ? '#D3010A'
                        : state === 'completed'
                          ? '#10B981'
                          : '#94A3B8',
                  }}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    width: 48,
                    height: 2,
                    backgroundColor:
                      i < currentIndex ? '#10B981' : '#E2E8F0',
                    margin: '0 6px',
                    marginBottom: 24,
                    transition: 'background-color 0.2s ease',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && <div className="rh-alert rh-alert-error mb-4">{error}</div>}

      {editLoading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p className="rh-loading">Cargando configuracion del almacen...</p>
        </div>
      )}

      {/* Step Content */}
      {!editLoading && <div className="rh-card" style={{ padding: 24 }}>
        {/* ════════ Step 1: Warehouse ════════ */}
        {currentStep === 'warehouse' && (
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: 20,
              }}
            >
              Datos del Almacen
            </h3>
            <div className="rh-form-grid">
              {/* Platform: Select aggregator */}
              {isPlatform && (
                <div className="col-span-2">
                  <div className="rh-field">
                    <label className="rh-label">Agregador propietario *</label>
                    <select
                      value={selectedAggregatorId}
                      onChange={(e) => setSelectedAggregatorId(e.target.value)}
                      className="rh-select"
                    >
                      <option value="">Selecciona un agregador...</option>
                      {aggregators.map((agg) => (
                        <option key={agg.id} value={agg.id}>
                          {agg.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="col-span-2">
                <div className="rh-field">
                  <label className="rh-label">Nombre del almacen *</label>
                  <input
                    type="text"
                    value={warehouse.name}
                    onChange={(e) =>
                      setWarehouse((p) => ({ ...p, name: e.target.value }))
                    }
                    className="rh-input"
                    placeholder="Almacen Principal"
                  />
                </div>
              </div>

              <div className="rh-field">
                <label className="rh-label">Codigo (auto)</label>
                <input
                  type="text"
                  value={warehouse.code}
                  readOnly
                  className="rh-input"
                  style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}
                />
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                  Generado automaticamente
                </p>
              </div>

              <div className="rh-field">
                <label className="rh-label">Direccion</label>
                <input
                  type="text"
                  value={warehouse.address}
                  onChange={(e) =>
                    setWarehouse((p) => ({ ...p, address: e.target.value }))
                  }
                  className="rh-input"
                  placeholder="Av. Principal, Zona Industrial"
                />
              </div>

              {/* Dimensions */}
              <div className="rh-field">
                <label className="rh-label">Ancho (metros) *</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={warehouse.width_m ?? ''}
                  onChange={(e) =>
                    setWarehouse((p) => ({
                      ...p,
                      width_m: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  className="rh-input"
                  placeholder="20"
                />
              </div>

              <div className="rh-field">
                <label className="rh-label">Largo (metros) *</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={warehouse.length_m ?? ''}
                  onChange={(e) =>
                    setWarehouse((p) => ({
                      ...p,
                      length_m: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    }))
                  }
                  className="rh-input"
                  placeholder="30"
                />
              </div>

              <div className="rh-field">
                <label className="rh-label">Alto (metros) *</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={warehouse.height_m ?? ''}
                  onChange={(e) =>
                    setWarehouse((p) => ({
                      ...p,
                      height_m: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    }))
                  }
                  className="rh-input"
                  placeholder="6"
                />
              </div>

              <div className="rh-field">
                <label className="rh-label">Area total</label>
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#F0FDF4',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#166534',
                    textAlign: 'center',
                    border: '1px solid #BBF7D0',
                  }}
                >
                  {area > 0 ? `${area.toFixed(1)} m²` : '—'}
                </div>
              </div>

              <div className="rh-field">
                <label className="rh-label">Expiracion de picking (min)</label>
                <input
                  type="number"
                  min={1}
                  value={warehouse.pick_expiry_minutes}
                  onChange={(e) =>
                    setWarehouse((p) => ({
                      ...p,
                      pick_expiry_minutes: parseInt(e.target.value) || 30,
                    }))
                  }
                  className="rh-input"
                  placeholder="30"
                />
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                  Tiempo maximo para completar una lista de picking
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ════════ Step 2: Racks (organized by aisle) ════════ */}
        {currentStep === 'racks' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Pasillos y Estantes
              </h3>
              <button
                onClick={addAisle}
                className="rh-btn rh-btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={16} />
                Agregar Pasillo
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>
              Cada pasillo agrupa sus estantes. El codigo de ubicacion se forma como: Pasillo-Estante-Nivel-Posicion (ej: P1-01-A-1).
              Agrega al menos un pasillo con al menos un estante.
            </p>

            {wizardAisles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Grid3X3
                  size={48}
                  style={{ color: '#CBD5E1', margin: '0 auto 12px' }}
                />
                <p style={{ fontSize: 16, fontWeight: 600, color: '#64748B' }}>
                  No has agregado pasillos
                </p>
                <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
                  Agrega al menos un pasillo para organizar tus estantes
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {wizardAisles.map((aisle) => {
                  const aisleRacks = racks.filter((r) => r.aisleId === aisle.id);
                  return (
                    <div
                      key={aisle.id}
                      style={{
                        border: '1px solid #CBD5E1',
                        borderRadius: 10,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Aisle header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'end',
                          gap: 10,
                          padding: '12px 16px',
                          backgroundColor: '#F1F5F9',
                          borderBottom: '1px solid #E2E8F0',
                        }}
                      >
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', fontFamily: 'monospace', alignSelf: 'center' }}>
                          {aisle.code}
                        </span>
                        <div className="rh-field" style={{ flex: 1 }}>
                          <label className="rh-label" style={{ fontSize: 11 }}>Nombre</label>
                          <input
                            type="text"
                            value={aisle.name}
                            onChange={(e) => updateAisle(aisle.id, 'name', e.target.value)}
                            className="rh-input"
                            style={{ fontSize: 13 }}
                          />
                        </div>
                        <div className="rh-field" style={{ width: 90 }}>
                          <label className="rh-label" style={{ fontSize: 11 }}>Ancho (m)</label>
                          <input
                            type="number"
                            min={0.1}
                            max={5}
                            step={0.1}
                            value={aisle.widthCells}
                            onChange={(e) => updateAisle(aisle.id, 'widthCells', parseFloat(e.target.value) || 0.5)}
                            className="rh-input"
                            style={{ fontSize: 13 }}
                          />
                        </div>
                        <div className="rh-field" style={{ width: 90 }}>
                          <label className="rh-label" style={{ fontSize: 11 }}>Largo (m)</label>
                          <input
                            type="number"
                            min={0.1}
                            max={200}
                            step={0.1}
                            value={aisle.lengthCells}
                            onChange={(e) => updateAisle(aisle.id, 'lengthCells', parseFloat(e.target.value) || 1)}
                            className="rh-input"
                            style={{ fontSize: 13 }}
                          />
                        </div>
                        <button
                          onClick={() => removeAisle(aisle.id)}
                          className="rh-btn rh-btn-ghost"
                          style={{ color: '#EF4444', padding: '8px' }}
                          title="Eliminar pasillo y sus estantes"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Racks inside this aisle */}
                      <div style={{ padding: '12px 16px' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                            Estantes ({aisleRacks.length})
                          </span>
                          <button
                            onClick={() => addRack(aisle.id)}
                            className="rh-btn rh-btn-ghost"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, border: '1px solid #CBD5E1', padding: '4px 10px' }}
                          >
                            <Plus size={14} />
                            Agregar Estante
                          </button>
                        </div>

                        {aisleRacks.length === 0 ? (
                          <p style={{ fontSize: 12, color: '#CBD5E1', fontStyle: 'italic', padding: '8px 0' }}>
                            Sin estantes. Agrega al menos un estante a este pasillo.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {aisleRacks.map((rack) => (
                              <div
                                key={rack.id}
                                style={{
                                  border: '1px solid #E2E8F0',
                                  borderRadius: 8,
                                  padding: '10px 14px',
                                  display: 'flex',
                                  gap: 12,
                                  alignItems: 'flex-start',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 360 }}>
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '70px 100px 100px 70px 70px auto',
                                      gap: 8,
                                      alignItems: 'end',
                                    }}
                                  >
                                    <div className="rh-field">
                                      <label className="rh-label" style={{ fontSize: 11 }}>Codigo</label>
                                      <input
                                        type="text"
                                        value={`${aisle.code}-${rack.code}`}
                                        readOnly
                                        className="rh-input"
                                        style={{ fontSize: 13, backgroundColor: '#F1F5F9', fontWeight: 700, fontFamily: 'monospace' }}
                                      />
                                    </div>
                                    <div className="rh-field">
                                      <label className="rh-label" style={{ fontSize: 11 }}>Ancho (m)</label>
                                      <input
                                        type="number"
                                        min={0.1}
                                        max={20}
                                        step={0.01}
                                        value={rack.rack_width_m}
                                        onChange={(e) => updateRack(rack.id, 'rack_width_m', parseFloat(e.target.value) || 0.1)}
                                        className="rh-input"
                                        style={{ fontSize: 13 }}
                                      />
                                    </div>
                                    <div className="rh-field">
                                      <label className="rh-label" style={{ fontSize: 11 }}>Prof. (m)</label>
                                      <input
                                        type="number"
                                        min={0.1}
                                        max={10}
                                        step={0.01}
                                        value={rack.rack_depth_m}
                                        onChange={(e) => updateRack(rack.id, 'rack_depth_m', parseFloat(e.target.value) || 0.1)}
                                        className="rh-input"
                                        style={{ fontSize: 13 }}
                                      />
                                    </div>
                                    <div className="rh-field">
                                      <label className="rh-label" style={{ fontSize: 11 }}>Niveles</label>
                                      <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={rack.levels}
                                        onChange={(e) => updateRack(rack.id, 'levels', parseInt(e.target.value) || 1)}
                                        className="rh-input"
                                        style={{ fontSize: 13 }}
                                      />
                                    </div>
                                    <div className="rh-field">
                                      <label className="rh-label" style={{ fontSize: 11 }}>Pos/Niv</label>
                                      <input
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={rack.positions_per_level}
                                        onChange={(e) => updateRack(rack.id, 'positions_per_level', parseInt(e.target.value) || 1)}
                                        className="rh-input"
                                        style={{ fontSize: 13 }}
                                      />
                                    </div>
                                    <button
                                      onClick={() => removeRack(rack.id)}
                                      className="rh-btn rh-btn-ghost"
                                      style={{ color: '#EF4444', padding: '6px' }}
                                      title="Eliminar estante"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <div style={{ marginTop: 4, fontSize: 11, color: '#94A3B8' }}>
                                    {rack.levels * rack.positions_per_level} ubicaciones |
                                    Niveles: {Array.from({ length: Math.min(rack.levels, 8) }, (_, i) => levelToLetter(i + 1)).join(', ')}
                                    {rack.levels > 8 ? '...' : ''}
                                  </div>
                                </div>

                                {/* Mini preview */}
                                <div
                                  style={{
                                    backgroundColor: '#F8FAFC',
                                    borderRadius: 8,
                                    padding: 6,
                                    minWidth: 100,
                                  }}
                                >
                                  <p style={{ fontSize: 9, color: '#94A3B8', marginBottom: 3, textAlign: 'center', fontWeight: 600 }}>
                                    Vista previa
                                  </p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {Array.from({ length: Math.min(rack.levels, 6) }, (_, li) => {
                                      const level = li + 1;
                                      return (
                                        <div key={li} style={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                          <span style={{ fontSize: 9, color: '#94A3B8', width: 12, textAlign: 'right', fontWeight: 700 }}>
                                            {levelToLetter(level)}
                                          </span>
                                          {Array.from({ length: Math.min(rack.positions_per_level, 8) }, (_, pi) => (
                                            <div
                                              key={pi}
                                              style={{
                                                width: 12,
                                                height: 10,
                                                borderRadius: 2,
                                                backgroundColor: '#E2E8F0',
                                                border: '1px solid #CBD5E1',
                                              }}
                                            />
                                          ))}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {(rack.levels > 6 || rack.positions_per_level > 8) && (
                                    <p style={{ fontSize: 9, color: '#CBD5E1', textAlign: 'center', marginTop: 2 }}>...truncado</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary stats */}
            {racks.length > 0 && (
              <div
                style={{
                  marginTop: 16,
                  padding: '10px 16px',
                  backgroundColor: '#F0FDF4',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#166534',
                  display: 'flex',
                  gap: 20,
                  border: '1px solid #BBF7D0',
                }}
              >
                <span><strong>{wizardAisles.length}</strong> pasillos</span>
                <span><strong>{racks.length}</strong> estantes</span>
                <span><strong>{totalLocations}</strong> ubicaciones totales</span>
              </div>
            )}
          </div>
        )}

        {/* ════════ Step 3: Layout / Tetris Board ════════ */}
        {currentStep === 'layout' && warehouse.width_m && warehouse.length_m && (
          <div style={{ height: 'calc(100vh - 320px)', minHeight: 400 }}>
            <FloorPlanBuilder
              warehouseWidth={warehouse.width_m}
              warehouseLength={warehouse.length_m}
              racks={racks}
              placedRacks={placedRacks}
              onPlacedRacksChange={setPlacedRacks}
              aisles={wizardAisles}
              placedAisles={placedAisles}
              onPlacedAislesChange={setPlacedAisles}
            />
          </div>
        )}

        {/* ════════ Step 4: Zones ════════ */}
        {currentStep === 'zones' && warehouse.width_m && warehouse.length_m && (
          <div style={{ height: 'calc(100vh - 320px)', minHeight: 400 }}>
            <ZonePainter
              warehouseWidth={warehouse.width_m}
              warehouseLength={warehouse.length_m}
              placedRacks={placedRacks}
              racks={racks}
              zones={zones}
              onZonesChange={setZones}
            />
          </div>
        )}

        {/* ════════ Step 5: Confirmation ════════ */}
        {currentStep === 'confirm' && (() => {
          const whW = warehouse.width_m || 10;
          const whL = warehouse.length_m || 10;
          const maxViewW = 460;
          const maxViewH = 320;
          // Cell-based scaling — matches FloorPlanBuilder / ZonePainter exactly
          const gridW = Math.ceil(whW / CELL_SIZE_M);
          const gridH = Math.ceil(whL / CELL_SIZE_M);
          const cellW = maxViewW / gridW;
          const cellH = maxViewH / gridH;
          const viewW = maxViewW;
          const viewH = maxViewH;
          const effectiveZones = zones.length > 0 ? zones : [{
            id: 'default',
            name: 'Almacenamiento',
            code: 'Z-01',
            zone_type: 'storage' as ZoneType,
            color: '#3B82F6',
            x: 0,
            y: 0,
            width: whW,
            height: whL,
          }];

          return (
          <div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: 20,
              }}
            >
              Resumen de Configuracion
            </h3>

            {/* Stats cards — 5 columns */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 12,
                marginBottom: 24,
              }}
            >
              {[
                { icon: Warehouse, value: '1', label: 'Almacen', bg: '#EEF2FF', color: '#6366F1' },
                { icon: Layers, value: String(wizardAisles.length), label: 'Pasillos', bg: '#F1F5F9', color: '#64748B' },
                { icon: Grid3X3, value: String(racks.length), label: 'Estantes', bg: '#FEF3C7', color: '#F59E0B' },
                { icon: MapPin, value: String(zones.length || 1), label: 'Zonas', bg: '#ECFDF5', color: '#10B981' },
                { icon: Package, value: String(totalLocations), label: 'Ubicaciones', bg: '#FEE2E2', color: '#D3010A' },
                { icon: BarChart3, value: `${occupancyPct}%`, label: 'Ocupacion Area', bg: '#F0F9FF', color: '#0EA5E9' },
              ].map((card) => (
                <div
                  key={card.label}
                  style={{
                    textAlign: 'center',
                    padding: 16,
                    backgroundColor: card.bg,
                    borderRadius: 10,
                  }}
                >
                  <card.icon
                    size={24}
                    style={{ color: card.color, margin: '0 auto 6px' }}
                  />
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                    {card.value}
                  </p>
                  <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
                    {card.label}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Visual views: Cenital + Lateral ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                marginBottom: 24,
              }}
            >
              {/* ── Top-down / Cenital view ── */}
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: 16,
                  backgroundColor: '#FAFBFC',
                }}
              >
                <h4
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <LayoutGrid size={14} style={{ color: '#6366F1' }} />
                  Vista Cenital (Planta)
                  <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400, marginLeft: 'auto' }}>
                    {whW}m × {whL}m
                  </span>
                </h4>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  {/* Outer wrapper — holds warehouse rect + external dimension labels */}
                  <div style={{ position: 'relative', paddingBottom: 22, paddingRight: 48 }}>
                    {/* Warehouse floor — content-box so viewW/viewH = content area exactly */}
                    <div
                      style={{
                        width: viewW,
                        height: viewH,
                        position: 'relative',
                        overflow: 'hidden',
                        backgroundColor: '#FFFFFF',
                        border: '2px solid #CBD5E1',
                        borderRadius: 6,
                        backgroundImage: `
                          linear-gradient(to right, #E2E8F020 1px, transparent 1px),
                          linear-gradient(to bottom, #E2E8F020 1px, transparent 1px)
                        `,
                        backgroundSize: `${cellW / CELL_SIZE_M}px ${cellH / CELL_SIZE_M}px`,
                      }}
                    >
                      {/* Zones — convert meters to grid cells for positioning */}
                      {effectiveZones.map((zone) => {
                        const zLeft = (zone.x / CELL_SIZE_M) * cellW;
                        const zTop = (zone.y / CELL_SIZE_M) * cellH;
                        const zW = Math.min((zone.width / CELL_SIZE_M) * cellW, viewW - zLeft);
                        const zH = Math.min((zone.height / CELL_SIZE_M) * cellH, viewH - zTop);
                        if (zW <= 0 || zH <= 0) return null;
                        return (
                          <div
                            key={zone.id}
                            style={{
                              position: 'absolute',
                              left: zLeft,
                              top: zTop,
                              width: zW,
                              height: zH,
                              backgroundColor: zone.color + '15',
                              border: `1px dashed ${zone.color}60`,
                              borderRadius: 3,
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                top: 2,
                                left: 3,
                                fontSize: 9,
                                color: zone.color,
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                              }}
                            >
                              {zone.name}
                            </span>
                          </div>
                        );
                      })}

                      {/* Aisles */}
                      {placedAisles.map((pa) => {
                        const aisle = wizardAisles.find((a) => a.id === pa.aisleId);
                        if (!aisle) return null;
                        const aw = pa.orientation === 'horizontal' ? pa.lengthCells : pa.widthCells;
                        const ah = pa.orientation === 'horizontal' ? pa.widthCells : pa.lengthCells;
                        return (
                          <div
                            key={pa.aisleId}
                            style={{
                              position: 'absolute',
                              left: pa.gridX * cellW,
                              top: pa.gridY * cellH,
                              width: aw * cellW - 1,
                              height: ah * cellH - 1,
                              backgroundColor: '#94A3B825',
                              border: '1px dashed #94A3B8',
                              borderRadius: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span style={{ fontSize: 8, fontWeight: 700, color: '#94A3B8', fontFamily: 'monospace',
                              writingMode: pa.orientation === 'vertical' ? 'vertical-rl' : 'horizontal-tb' }}>
                              {aisle.code}
                            </span>
                          </div>
                        );
                      })}

                      {/* Racks — cell-based, matching FloorPlanBuilder */}
                      {placedRacks.map((p) => {
                        const rack = racks.find((r) => r.id === p.rackId);
                        if (!rack) return null;
                        const rIdx = racks.indexOf(rack);
                        const color = RACK_COLORS[rIdx % RACK_COLORS.length];
                        const rLeft = p.gridX * cellW;
                        const rTop = p.gridY * cellH;
                        const rW = p.widthCells * cellW - 2;
                        const rH = p.depthCells * cellH - 2;
                        if (rW <= 0 || rH <= 0) return null;
                        return (
                          <div
                            key={p.rackId}
                            style={{
                              position: 'absolute',
                              left: rLeft,
                              top: rTop,
                              width: rW,
                              height: rH,
                              backgroundColor: color + '35',
                              border: `1.5px solid ${color}`,
                              borderRadius: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            <span
                              style={{
                                fontSize: Math.max(9, Math.min(12, Math.min(cellW, cellH) * 0.6)),
                                fontWeight: 800,
                                color,
                                fontFamily: 'monospace',
                              }}
                            >
                              {rackDisplayCode(rack)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dimension labels — on wrapper, outside the clipped warehouse */}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 2,
                        left: viewW / 2,
                        transform: 'translateX(-50%)',
                        fontSize: 10,
                        color: '#94A3B8',
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {whW}m (ancho)
                    </span>
                    <span
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: viewH / 2,
                        transform: 'translateY(-50%) rotate(90deg)',
                        fontSize: 10,
                        color: '#94A3B8',
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {whL}m (largo)
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', marginTop: 20 }}>
                  Huella de estantes: {rackFootprint.toFixed(1)} m² de {area.toFixed(1)} m² ({occupancyPct}%)
                </p>
              </div>

              {/* ── Side / Lateral view ── */}
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: 16,
                  backgroundColor: '#FAFBFC',
                }}
              >
                <h4
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Layers size={14} style={{ color: '#8B5CF6' }} />
                  Vista Lateral (Estantes)
                  <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400, marginLeft: 'auto' }}>
                    {racks.length} estantes
                  </span>
                </h4>
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    overflowX: 'auto',
                    paddingBottom: 8,
                  }}
                >
                  {racks.map((rack, rIdx) => {
                    const color = RACK_COLORS[rIdx % RACK_COLORS.length];
                    const maxLevels = Math.min(rack.levels, 10);
                    const maxPos = Math.min(rack.positions_per_level, 6);
                    const cellW = 18;
                    const cellH = 16;
                    return (
                      <div
                        key={rack.id}
                        style={{
                          flexShrink: 0,
                          textAlign: 'center',
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color,
                            marginBottom: 4,
                            fontFamily: 'monospace',
                          }}
                        >
                          {rackDisplayCode(rack)}
                        </p>
                        <div
                          style={{
                            border: `2px solid ${color}`,
                            borderRadius: 4,
                            overflow: 'hidden',
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          {Array.from({ length: maxLevels }, (_, li) => {
                            const level = li + 1;
                            return (
                              <div
                                key={li}
                                style={{
                                  display: 'flex',
                                  borderBottom: li < maxLevels - 1 ? `1px solid ${color}30` : undefined,
                                }}
                              >
                                <span
                                  style={{
                                    width: 14,
                                    fontSize: 8,
                                    fontWeight: 700,
                                    color: '#94A3B8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#F8FAFC',
                                    borderRight: `1px solid ${color}20`,
                                    flexShrink: 0,
                                  }}
                                >
                                  {levelToLetter(level)}
                                </span>
                                {Array.from({ length: maxPos }, (_, pi) => (
                                  <div
                                    key={pi}
                                    style={{
                                      width: cellW,
                                      height: cellH,
                                      backgroundColor: color + '10',
                                      borderRight: pi < maxPos - 1 ? `1px solid ${color}15` : undefined,
                                    }}
                                  />
                                ))}
                              </div>
                            );
                          })}
                        </div>
                        {(rack.levels > 10 || rack.positions_per_level > 6) && (
                          <p style={{ fontSize: 8, color: '#CBD5E1', marginTop: 1 }}>
                            ...
                          </p>
                        )}
                        <p style={{ fontSize: 8, color: '#94A3B8', marginTop: 2 }}>
                          {rack.rack_width_m}×{rack.rack_depth_m}m
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', marginTop: 4 }}>
                  Niveles A-Z de arriba a abajo | {totalLocations} ubicaciones totales
                </p>
              </div>
            </div>

            {/* ── Warehouse details ── */}
            <div style={{ marginBottom: 20 }}>
              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: 8,
                }}
              >
                Almacen
              </h4>
              <div
                style={{
                  padding: 12,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#1E293B',
                  lineHeight: 1.8,
                }}
              >
                <strong>{warehouse.name}</strong> ({warehouse.code})
                <br />
                Dimensiones: {warehouse.width_m}m × {warehouse.length_m}m ×{' '}
                {warehouse.height_m}m | Area: {area.toFixed(1)} m²
                <br />
                {warehouse.address && (
                  <>
                    Direccion: {warehouse.address}
                    <br />
                  </>
                )}
                Expiracion picking: {warehouse.pick_expiry_minutes} minutos
              </div>
            </div>

            {/* ── Racks summary ── */}
            <div style={{ marginBottom: 20 }}>
              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: 8,
                }}
              >
                Estantes ({racks.length})
              </h4>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {racks.map((r, rIdx) => {
                  const pl = placedRacks.find(
                    (p) => p.rackId === r.id,
                  );
                  const color = RACK_COLORS[rIdx % RACK_COLORS.length];
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: 6,
                        fontSize: 13,
                        borderLeft: `4px solid ${color}`,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: '#1E293B',
                          fontFamily: 'monospace',
                        }}
                      >
                        [{rackDisplayCode(r)}] {r.name}
                      </span>
                      <span style={{ color: '#64748B' }}>
                        {r.rack_width_m}m × {r.rack_depth_m}m |{' '}
                        {r.levels} niveles × {r.positions_per_level}{' '}
                        pos = {r.levels * r.positions_per_level} ubic
                        {pl && (
                          <span style={{ color: '#10B981', marginLeft: 8 }}>
                            ✓ Pos ({pl.gridX},{pl.gridY})
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Aisles summary ── */}
            {wizardAisles.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  Pasillos ({wizardAisles.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {wizardAisles.map((a) => {
                    const pa = placedAisles.find((p) => p.aisleId === a.id);
                    return (
                      <span
                        key={a.id}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          border: '1px solid #CBD5E1',
                        }}
                      >
                        {a.code} — {a.name} ({a.widthCells}m x {a.lengthCells}m)
                        {pa && <span style={{ color: '#10B981', marginLeft: 6 }}>✓</span>}
                      </span>
                    );
                  })}
                </div>
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
                  Formato de ubicacion: {wizardAisles[0]?.code}-01-A-1 (Pasillo-Estante-Nivel-Posicion)
                </p>
              </div>
            )}

            {/* ── Zones summary ── */}
            <div>
              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: 8,
                }}
              >
                Zonas ({zones.length || 1})
              </h4>
              {zones.length === 0 ? (
                <p
                  style={{
                    fontSize: 13,
                    color: '#94A3B8',
                    padding: '8px 12px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: 6,
                  }}
                >
                  Se creara una zona "Almacenamiento" por defecto cubriendo todo
                  el almacen
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {zones.map((z) => (
                    <span
                      key={z.id}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: z.color + '20',
                        color: z.color,
                        border: `1px solid ${z.color}40`,
                      }}
                    >
                      {z.name} ({z.code}) — {z.width}m × {z.height}m
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          );
        })()}
      </div>}

      {/* Navigation Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 20,
          paddingTop: 16,
        }}
      >
        <button
          onClick={
            currentIndex === 0
              ? () => navigate('/hub/warehouse')
              : goPrev
          }
          className="rh-btn rh-btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={16} />
          {currentIndex === 0 ? 'Cancelar' : 'Anterior'}
        </button>

        {currentStep === 'confirm' ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="rh-btn rh-btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 160,
            }}
          >
            {saving ? (
              editId ? 'Guardando cambios...' : 'Creando almacen...'
            ) : (
              <>
                <Check size={16} />
                {editId ? 'Guardar Cambios' : 'Crear Almacen'}
              </>
            )}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className="rh-btn rh-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {currentStep === 'zones' ? 'Siguiente (o saltar)' : 'Siguiente'}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
