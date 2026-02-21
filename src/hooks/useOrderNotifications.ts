import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', pending: 'Pendiente', confirmed: 'Confirmada', assigned: 'Asignada',
  preparing: 'Preparando', ready_to_ship: 'Lista para envío', processing: 'Procesando',
  shipped: 'Despachada', in_transit: 'En tránsito', delivered: 'Entregada',
  cancelled: 'Cancelada', returned: 'Devuelta',
};

export function useOrderNotifications(onNotification?: (msg: string) => void) {
  const profile = useAuthStore((s) => s.profile);
  const organization = useAuthStore((s) => s.organization);
  const { isDispatcher } = usePermissions();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const handleChange = useCallback((payload: { new: Record<string, unknown>; old: Record<string, unknown>; eventType: string }) => {
    if (payload.eventType !== 'UPDATE') return;
    const newOrder = payload.new;
    const oldOrder = payload.old;

    if (newOrder.status !== oldOrder.status) {
      const orderNum = newOrder.order_number as string;
      const newStatus = STATUS_LABELS[newOrder.status as string] ?? newOrder.status;
      const msg = `Orden ${orderNum} cambió a: ${newStatus}`;

      // Notify via callback
      onNotification?.(msg);

      // Play sound for dispatcher when assigned
      if (isDispatcher && newOrder.status === 'assigned' && newOrder.assigned_to === profile?.id) {
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Jk5eLc2RdYHJ/h42KfW9kYWt2gImNi4BzbGVpc3+Fio2HfnRsaXB7goiLiIN7c29ueH+EiIiGgnx2cnJ2fIGFh4WDf3t3dXZ5fYGEhYSDf3x4d3d6fH+CgoOCgX99e3l5ent9gIGBgYB/fnx7ent8fX5/gIB/f39+fXx8fH1+fn9/f39/fn59fX19fn5+f39/f39+fn5+fn5+f39/f39/fn5+fn5+fn9/f39/f35+fn5+fn5/f39/f39+fn5+fn5+f39/f35+fn5+');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch { /* ignore audio errors */ }
      }
    }
  }, [onNotification, isDispatcher, profile?.id]);

  useEffect(() => {
    if (!organization) return;

    channelRef.current = supabase.channel('order-notifications')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `org_id=eq.${organization.id}`,
      }, handleChange)
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [organization, handleChange]);
}
