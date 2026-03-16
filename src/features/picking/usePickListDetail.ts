import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { toast } from '@/stores/toastStore.ts';
import * as pickingService from '@/services/pickingService.ts';
import { logActivity } from '@/services/activityLogService.ts';
import type { PickList, PickListItem } from '@/types/warehouse.ts';

/** Get countdown color based on percentage of time remaining */
function getCountdownColor(secondsLeft: number, totalSeconds: number): string {
  if (totalSeconds <= 0) return '#D3010A';
  const pct = secondsLeft / totalSeconds;
  if (pct > 0.5) return '#10B981';   // green
  if (pct > 0.25) return '#F59E0B';  // yellow
  return '#D3010A';                   // red
}

export function usePickListDetail() {
  const { pickListId } = useParams<{ pickListId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { roles } = usePermissions();
  const [actionLoading, setActionLoading] = useState(false);
  const isPicker = roles.includes('warehouse_picker') || roles.includes('warehouse_manager') || roles.includes('platform_owner');

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const expiredHandled = useRef(false);

  const pickListFetcher = useCallback(
    () =>
      pickListId
        ? pickingService.getPickList(pickListId)
        : Promise.resolve({ data: null, error: null }),
    [pickListId],
  );

  const itemsFetcher = useCallback(
    () =>
      pickListId
        ? pickingService.getPickListItems(pickListId)
        : Promise.resolve({ data: null, error: null }),
    [pickListId],
  );

  const {
    data: pickList,
    loading: plLoading,
    reload: reloadPickList,
  } = useAsyncData<PickList>(pickListFetcher, [pickListId]);

  const {
    data: items,
    loading: itemsLoading,
    reload: reloadItems,
  } = useAsyncData<PickListItem[]>(itemsFetcher, [pickListId]);

  const loading = plLoading || itemsLoading;
  const allItems = items ?? [];

  const pct =
    pickList && pickList.total_items > 0
      ? Math.round((pickList.picked_items / pickList.total_items) * 100)
      : 0;

  // Total expiry duration for color calculation
  const totalExpirySeconds = useMemo(() => {
    if (!pickList?.expires_at || !pickList?.created_at) return 0;
    return Math.max(0, Math.round(
      (new Date(pickList.expires_at).getTime() - new Date(pickList.created_at).getTime()) / 1000
    ));
  }, [pickList?.expires_at, pickList?.created_at]);

  // Active statuses that should show countdown
  const isActiveStatus = pickList != null && ['pending', 'assigned', 'in_progress'].includes(pickList.status);

  // Countdown timer effect
  useEffect(() => {
    if (!pickList?.expires_at || !isActiveStatus) {
      setTimeLeft(null);
      return;
    }

    const computeTimeLeft = () => {
      const diff = new Date(pickList.expires_at!).getTime() - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    };

    setTimeLeft(computeTimeLeft());
    expiredHandled.current = false;

    const interval = setInterval(() => {
      const remaining = computeTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pickList?.expires_at, isActiveStatus]);

  // Handle expiry when timer reaches 0
  useEffect(() => {
    if (timeLeft !== 0 || expiredHandled.current || !pickListId || !isActiveStatus) return;
    expiredHandled.current = true;

    (async () => {
      try {
        await pickingService.expirePickList(pickListId);
        toast('error', 'Tiempo agotado — stock liberado, orden devuelta a borrador');
        navigate('/hub/picking');
      } catch {
        toast('error', 'Error al expirar el pick list');
        await reloadPickList();
      }
    })();
  }, [timeLeft, pickListId, isActiveStatus, navigate, reloadPickList]);

  // Compute location IDs for the mini-map
  const sourceLocationIds = useMemo(
    () => [...new Set(allItems.map((i) => i.source_location_id).filter(Boolean))],
    [allItems],
  );
  const pickedLocationIds = useMemo(
    () => [...new Set(allItems.filter((i) => i.status === 'picked').map((i) => i.source_location_id).filter(Boolean))],
    [allItems],
  );

  const handleClaimPickList = async () => {
    if (!pickListId || !user) return;
    setActionLoading(true);
    try {
      const { data, error } = await pickingService.claimPickList(pickListId, user.id);
      if (error || !data) {
        toast('error', 'No se pudo tomar la lista. Puede que otro almacenista ya la haya tomado.');
      } else {
        toast('success', 'Lista tomada exitosamente');
        logActivity({ action: 'claim', entityType: 'pick_list', entityId: pickListId, description: 'Reclamó lista de picking' });
        await reloadPickList();
      }
    } catch {
      toast('error', 'Error al tomar la lista de picking');
    }
    setActionLoading(false);
  };

  const handleStartPicking = async () => {
    if (!pickListId) return;
    setActionLoading(true);
    await pickingService.startPicking(pickListId);
    logActivity({ action: 'start', entityType: 'pick_list', entityId: pickListId, description: 'Inició picking' });
    await reloadPickList();
    setActionLoading(false);
  };

  const handlePickItem = async (itemId: string, qtyRequired: number, productName?: string) => {
    if (!user) return;
    setActionLoading(true);
    await pickingService.pickItem(itemId, qtyRequired, user.id);
    logActivity({ action: 'pick_item', entityType: 'pick_list', entityId: pickListId, description: `Pickó ${qtyRequired}x ${productName ?? 'producto'}` });
    await Promise.all([reloadItems(), reloadPickList()]);
    setActionLoading(false);
  };

  const handleComplete = async () => {
    if (!pickListId) return;
    setActionLoading(true);
    await pickingService.completePickList(pickListId);
    logActivity({ action: 'complete', entityType: 'pick_list', entityId: pickListId, description: 'Completó lista de picking' });
    await reloadPickList();
    setActionLoading(false);
  };

  const countdownColor = timeLeft != null ? getCountdownColor(timeLeft, totalExpirySeconds) : '#605E5C';
  const isUrgent = timeLeft != null && timeLeft <= 60 && timeLeft > 0;

  return {
    pickList,
    allItems,
    loading,
    actionLoading,
    pct,
    timeLeft,
    totalExpirySeconds,
    countdownColor,
    isUrgent,
    isActiveStatus,
    sourceLocationIds,
    pickedLocationIds,
    isPicker,
    handleClaimPickList,
    handleStartPicking,
    handlePickItem,
    handleComplete,
    navigate,
  };
}
