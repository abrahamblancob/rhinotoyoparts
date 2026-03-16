import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore.ts';
import { toast } from '@/stores/toastStore.ts';
import * as stockAuditService from '@/services/stockAuditService.ts';
import * as warehouseService from '@/services/warehouseService.ts';
import type { StockAudit, StockAuditItem, StockAuditType, Warehouse } from '@/types/warehouse.ts';

export type AuditFlowPhase =
  | 'warehouse_select'
  | 'mode_select'
  | 'map_select'       // manual: user picks location on map
  | 'jackpot'          // random: jackpot animation running
  | 'confirmation'     // auditing items
  | 'email_modal'      // send report modal
  | 'done';            // audit complete

interface UseStockAuditReturn {
  // State
  phase: AuditFlowPhase;
  selectedWarehouse: Warehouse | null;
  auditType: StockAuditType | null;
  randomCount: number;
  audit: StockAudit | null;
  auditItems: StockAuditItem[];
  selectedLocationIds: Set<string>;
  completing: boolean;

  // Actions
  selectWarehouse: (wh: Warehouse) => void;
  goBackToWarehouse: () => void;
  selectMode: (mode: StockAuditType, count?: number) => void;
  selectLocation: (locationId: string, rackId: string) => void;
  confirmRandomLocations: (locationIds: string[]) => void;
  startAudit: () => Promise<void>;
  updateItem: (itemId: string, actualQuantity: number) => Promise<void>;
  completeAudit: () => Promise<void>;
  sendEmail: (email: string) => Promise<void>;
  skipEmail: () => void;
  resetAudit: () => void;
}

export function useStockAudit(orgId: string | undefined): UseStockAuditReturn {
  const user = useAuthStore((s) => s.user);
  const [phase, setPhase] = useState<AuditFlowPhase>('warehouse_select');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [auditType, setAuditType] = useState<StockAuditType | null>(null);
  const [randomCount, setRandomCount] = useState(1);
  const [audit, setAudit] = useState<StockAudit | null>(null);
  const [auditItems, setAuditItems] = useState<StockAuditItem[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState(false);

  const selectWarehouse = useCallback((wh: Warehouse) => {
    setSelectedWarehouse(wh);
    setPhase('mode_select');
  }, []);

  const goBackToWarehouse = useCallback(() => {
    setSelectedWarehouse(null);
    setAuditType(null);
    setAudit(null);
    setAuditItems([]);
    setSelectedLocationIds(new Set());
    setPhase('warehouse_select');
  }, []);

  const selectMode = useCallback((mode: StockAuditType, count?: number) => {
    setAuditType(mode);
    setSelectedLocationIds(new Set());
    if (mode === 'manual') {
      setPhase('map_select');
    } else {
      setRandomCount(mode === 'random_single' ? 1 : (count ?? 5));
      setPhase('jackpot');
    }
  }, []);

  const selectLocation = useCallback((locationId: string, _rackId: string) => {
    // Manual mode: toggle single location
    setSelectedLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(locationId)) {
        next.delete(locationId);
      } else {
        // For manual, only allow 1 location at a time
        next.clear();
        next.add(locationId);
      }
      return next;
    });
  }, []);

  const confirmRandomLocations = useCallback((locationIds: string[]) => {
    setSelectedLocationIds(new Set(locationIds));
  }, []);

  const startAudit = useCallback(async () => {
    if (!selectedWarehouse || !auditType || !user || !orgId) return;
    if (selectedLocationIds.size === 0) {
      toast('error', 'Selecciona al menos una ubicación');
      return;
    }

    // Create audit record
    const { data: newAudit, error: auditError } = await stockAuditService.createAudit({
      org_id: orgId,
      warehouse_id: selectedWarehouse.id,
      audited_by: user.id,
      audit_type: auditType,
      location_count: selectedLocationIds.size,
    });

    if (auditError || !newAudit) {
      toast('error', `Error al crear auditoría: ${auditError}`);
      return;
    }

    // Get expected stock for selected locations
    const locationIdsArr = Array.from(selectedLocationIds);
    const { data: expectedStock } = await stockAuditService.getExpectedStock(locationIdsArr);

    // Build items: for each selected location, create an audit item
    const { data: allLocs } = await warehouseService.getLocations(selectedWarehouse.id);
    const locsMap = new Map((allLocs ?? []).map((l: { id: string; rack_id: string; code: string }) => [l.id, l]));

    const stockByLocation = new Map(
      (expectedStock ?? []).map((s) => [s.location_id, s])
    );

    const itemsToCreate = locationIdsArr.map((locId) => {
      const loc = locsMap.get(locId) as { id: string; rack_id: string; code: string } | undefined;
      const stock = stockByLocation.get(locId);
      return {
        location_id: locId,
        rack_id: loc?.rack_id ?? '',
        product_id: stock?.product_id ?? null,
        product_name: stock?.product?.name ?? null,
        product_sku: stock?.product?.sku ?? null,
        expected_quantity: stock?.quantity ?? 0,
      };
    });

    const { data: createdItems, error: itemsError } = await stockAuditService.createAuditItems(newAudit.id, itemsToCreate);

    if (itemsError || !createdItems) {
      toast('error', `Error al crear items: ${itemsError}`);
      return;
    }

    // Reload full audit with joins
    const { data: fullAudit } = await stockAuditService.getAuditById(newAudit.id);
    if (fullAudit) {
      setAudit(fullAudit);
      setAuditItems((fullAudit as StockAudit & { items: StockAuditItem[] }).items ?? createdItems);
    } else {
      setAudit(newAudit);
      setAuditItems(createdItems);
    }

    setPhase('confirmation');
  }, [selectedWarehouse, auditType, user, orgId, selectedLocationIds]);

  const updateItem = useCallback(async (itemId: string, actualQuantity: number) => {
    const { data: updatedItem, error } = await stockAuditService.updateAuditItem(itemId, actualQuantity);
    if (error || !updatedItem) {
      toast('error', `Error al actualizar: ${error}`);
      return;
    }
    setAuditItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    );
  }, []);

  const completeAudit = useCallback(async () => {
    if (!audit) return;
    setCompleting(true);

    const matchCount = auditItems.filter((i) => i.status === 'match').length;
    const discrepancyCount = auditItems.filter((i) => i.status === 'discrepancy').length;

    const { error } = await stockAuditService.completeAudit(audit.id, matchCount, discrepancyCount);
    if (error) {
      toast('error', `Error al finalizar: ${error}`);
      setCompleting(false);
      return;
    }

    setCompleting(false);
    setPhase('email_modal');
    toast('success', 'Auditoría completada exitosamente');
  }, [audit, auditItems]);

  const sendEmail = useCallback(async (email: string) => {
    if (!audit) return;
    const { error } = await stockAuditService.sendAuditEmail(audit.id, email);
    if (error) {
      toast('error', `Error al enviar email: ${error}`);
      return;
    }
    toast('success', `Reporte enviado a ${email}`);
    setPhase('done');
  }, [audit]);

  const skipEmail = useCallback(() => {
    setPhase('done');
  }, []);

  const resetAudit = useCallback(() => {
    setAudit(null);
    setAuditItems([]);
    setSelectedLocationIds(new Set());
    setAuditType(null);
    setPhase('mode_select');
  }, []);

  return {
    phase,
    selectedWarehouse,
    auditType,
    randomCount,
    audit,
    auditItems,
    selectedLocationIds,
    completing,
    selectWarehouse,
    goBackToWarehouse,
    selectMode,
    selectLocation,
    confirmRandomLocations,
    startAudit,
    updateItem,
    completeAudit,
    sendEmail,
    skipEmail,
    resetAudit,
  };
}
