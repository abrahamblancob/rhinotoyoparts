import { useCallback, useEffect, useState } from 'react';
import { useAsyncData } from './useAsyncData.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from './usePermissions.ts';
import * as warehouseService from '@/services/warehouseService.ts';
import * as orgService from '@/services/orgService.ts';
import type { Warehouse } from '@/types/warehouse.ts';

/**
 * Resolves the effective org_id for warehouse operations.
 * - Platform: undefined (sees all)
 * - Aggregator: own org_id
 * - Associate: parent aggregator's org_id
 */
export function useWarehouseOrgId(): string | undefined {
  const organization = useAuthStore((s) => s.organization);
  const { isPlatform, isAssociate } = usePermissions();
  const [parentOrgId, setParentOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (isAssociate && organization?.id) {
      orgService.getParentOrgId(organization.id).then(setParentOrgId);
    }
  }, [isAssociate, organization?.id]);

  if (isPlatform) return undefined;
  return isAssociate ? (parentOrgId ?? undefined) : organization?.id;
}

export function useWarehouses() {
  const { isPlatform } = usePermissions();
  const effectiveOrgId = useWarehouseOrgId();

  const fetcher = useCallback(
    () => warehouseService.getWarehouses({ orgId: effectiveOrgId, isPlatform }),
    [effectiveOrgId, isPlatform]
  );

  return useAsyncData<Warehouse[]>(fetcher, [effectiveOrgId]);
}

export function useWarehouseDetail(warehouseId: string | undefined) {
  const fetcher = useCallback(
    () => warehouseId ? warehouseService.getWarehouse(warehouseId) : Promise.resolve({ data: null, error: null }),
    [warehouseId]
  );

  return useAsyncData<Warehouse | null>(fetcher, [warehouseId]);
}

interface WarehouseStats {
  zones: number;
  racks: number;
  totalLocations: number;
  occupiedLocations: number;
  occupancyRate: number;
  totalStock: number;
}

const EMPTY_STATS: WarehouseStats = { zones: 0, racks: 0, totalLocations: 0, occupiedLocations: 0, occupancyRate: 0, totalStock: 0 };

export function useWarehouseStats(warehouseId: string | undefined) {
  const fetcher = useCallback(
    async () => {
      if (!warehouseId) return { data: EMPTY_STATS, error: null };
      const result = await warehouseService.getWarehouseStats(warehouseId);
      return { data: result, error: null };
    },
    [warehouseId]
  );

  const { data, loading, error, reload } = useAsyncData<WarehouseStats>(fetcher, [warehouseId]);
  return { stats: data, loading, error, reload };
}

export function useWarehouseZones(warehouseId: string | undefined) {
  const fetcher = useCallback(
    () => warehouseId ? warehouseService.getZones(warehouseId) : Promise.resolve({ data: [], error: null }),
    [warehouseId]
  );

  return useAsyncData(fetcher, [warehouseId]);
}

export function useWarehouseRacks(warehouseId: string | undefined, zoneId?: string) {
  const fetcher = useCallback(
    () => warehouseId ? warehouseService.getRacks(warehouseId, zoneId) : Promise.resolve({ data: [], error: null }),
    [warehouseId, zoneId]
  );

  return useAsyncData(fetcher, [warehouseId, zoneId]);
}

export function useWarehouseLocations(warehouseId: string | undefined, rackId?: string) {
  const fetcher = useCallback(
    () => warehouseId ? warehouseService.getLocations(warehouseId, rackId) : Promise.resolve({ data: [], error: null }),
    [warehouseId, rackId]
  );

  return useAsyncData(fetcher, [warehouseId, rackId]);
}

export function useWarehouseStock(warehouseId: string | undefined) {
  const fetcher = useCallback(
    () => warehouseId ? warehouseService.getStockByWarehouse(warehouseId) : Promise.resolve({ data: [], error: null }),
    [warehouseId]
  );

  return useAsyncData(fetcher, [warehouseId]);
}
