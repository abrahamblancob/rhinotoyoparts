import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from '@/stores/toastStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import * as warehouseService from '@/services/warehouseService.ts';
import * as orgService from '@/services/orgService.ts';
import { CELL_SIZE_M } from '../FloorPlanBuilder.tsx';
import type { Organization } from '@/lib/database.types.ts';
import type { ZoneType, RackOrientation } from '@/types/warehouse.ts';
import {
  STEPS,
  tempId,
  type WizardStep,
  type WarehouseForm,
  type WizardRackForm,
  type PlacedRack,
  type WizardAisleForm,
  type PlacedAisle,
  type WizardZoneForm,
} from './types.ts';

export function useWarehouseWizard() {
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
            const formCode = r.aisle_id && r.code.includes('-')
              ? r.code.split('-').pop()!
              : r.code;
            const rackForm: WizardRackForm = {
              id: r.id,
              name: r.name,
              code: formCode,
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
        return placedRacks.length === racks.length && placedAisles.length === wizardAisles.length;
      case 'zones':
        return true;
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
        name: `Estante ${code}`,
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
    if (field === 'rack_width_m' || field === 'rack_depth_m') {
      setPlacedRacks((prev) => prev.filter((p) => p.rackId !== id));
    }
  };

  const removeRack = (id: string) => {
    const removedRack = racks.find((r) => r.id === id);
    setRacks((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      if (removedRack?.aisleId) {
        let idx = 0;
        return filtered.map((r) => {
          if (r.aisleId === removedRack.aisleId) {
            idx++;
            const newCode = String(idx).padStart(2, '0');
            return { ...r, code: newCode, name: `Estante ${newCode}` };
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
    const existingNums = wizardAisles.map((a) => {
      const m = a.code.match(/^P(\d+)$/);
      return m ? parseInt(m[1]) : 0;
    });
    const index = Math.max(0, ...existingNums) + 1;
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
    if (field === 'widthCells' || field === 'lengthCells') {
      setPlacedAisles((prev) => prev.filter((p) => p.aisleId !== id));
    }
  };

  const removeAisle = (id: string) => {
    setWizardAisles((prev) => prev.filter((a) => a.id !== id));
    setPlacedAisles((prev) => prev.filter((a) => a.aisleId !== id));
    const rackIds = racks.filter((r) => r.aisleId === id).map((r) => r.id);
    setRacks((prev) => prev.filter((r) => r.aisleId !== id));
    setPlacedRacks((prev) => prev.filter((p) => !rackIds.includes(p.rackId)));
  };

  // ── Computed values ──

  const rackDisplayCode = (rack: WizardRackForm) => {
    if (rack.aisleId) {
      const aisle = wizardAisles.find((a) => a.id === rack.aisleId);
      if (aisle) return `${aisle.code}-${rack.code}`;
    }
    return rack.code;
  };

  const area = (warehouse.width_m ?? 0) * (warehouse.length_m ?? 0);
  const totalLocations = racks.reduce((sum, r) => sum + r.levels * r.positions_per_level, 0);
  const rackFootprint = racks.reduce((sum, r) => sum + r.rack_width_m * r.rack_depth_m, 0);
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

      // 3. Create/update zones
      const zoneIdMap = new Map<string, string>();

      if (editId) {
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

      // 5. Create/update racks
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

        const assignedAisleId = rack.aisleId ? (aisleIdMap.get(rack.aisleId) ?? null) : null;
        const aisleForRack = rack.aisleId ? wizardAisles.find((a) => a.id === rack.aisleId) : null;
        const fullRackCode = aisleForRack ? `${aisleForRack.code}-${rack.code}` : rack.code;
        const orientation: RackOrientation = placement?.rotated ? 'horizontal' : 'vertical';

        const isExistingRack = editId && !rack.id.startsWith('temp_');
        const rackResult = await warehouseService.saveRack(
          {
            name: rack.name,
            code: fullRackCode,
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

  return {
    // Navigation
    editId,
    currentStep,
    setCurrentStep,
    currentIndex,
    canProceed,
    goNext,
    goPrev,
    navigate,

    // State
    saving,
    error,
    editLoading,
    isPlatform,

    // Platform
    aggregators,
    selectedAggregatorId,
    setSelectedAggregatorId,

    // Step 1
    warehouse,
    setWarehouse,

    // Step 2
    racks,
    wizardAisles,
    addRack,
    updateRack,
    removeRack,
    addAisle,
    updateAisle,
    removeAisle,

    // Step 3
    placedRacks,
    setPlacedRacks,
    placedAisles,
    setPlacedAisles,

    // Step 4
    zones,
    setZones,

    // Computed
    rackDisplayCode,
    area,
    totalLocations,
    rackFootprint,
    occupancyPct,

    // Save
    handleSave,
  };
}
