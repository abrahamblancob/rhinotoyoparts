import { supabase, query } from './base.ts';
import { useAuthStore } from '@/stores/authStore.ts';
import type { AuditLog } from '@/lib/database.types.ts';
import type { ServiceResult } from './base.ts';

// ── Fire-and-forget activity logging ──

interface LogActivityParams {
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Logs a user activity event via RPC (fire-and-forget).
 * Uses SECURITY DEFINER function to bypass RLS for <1% performance impact.
 * Does NOT block the UI — returns void, errors are silently logged to console.
 */
export function logActivity(params: LogActivityParams): void {
  const state = useAuthStore.getState();
  const userId = state.user?.id;
  const orgId = state.organization?.id ?? state.profile?.org_id;

  if (!userId) return; // Not authenticated, skip

  supabase
    .rpc('log_user_activity', {
      p_org_id: orgId ?? null,
      p_user_id: userId,
      p_action: params.action,
      p_entity_type: params.entityType,
      p_entity_id: params.entityId ?? null,
      p_description: params.description,
      p_old_data: params.oldData ?? null,
      p_new_data: params.newData ?? null,
      p_metadata: params.metadata ?? {},
    })
    .then(undefined, (err: unknown) =>
      console.error('[ActivityLog] Failed to log:', err)
    );
}

// ── Timeline query functions ──

interface TimelineOpts {
  cursor?: string;      // created_at of last item for pagination
  limit?: number;       // default 30
  entityType?: string;  // filter by entity type
  action?: string;      // filter by action
  dateFrom?: string;    // ISO date
  dateTo?: string;      // ISO date
}

/**
 * Fetches a paginated activity timeline for a specific user.
 */
export async function getActivityTimeline(
  userId: string,
  opts?: TimelineOpts
): Promise<ServiceResult<AuditLog[]>> {
  const limit = opts?.limit ?? 30;

  return query<AuditLog[]>((client) => {
    let q = client
      .from('audit_logs')
      .select('*, profiles!audit_logs_user_id_fkey(full_name, email, avatar_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (opts?.cursor) {
      q = q.lt('created_at', opts.cursor);
    }
    if (opts?.entityType) {
      q = q.eq('entity_type', opts.entityType);
    }
    if (opts?.action) {
      q = q.eq('action', opts.action);
    }
    if (opts?.dateFrom) {
      q = q.gte('created_at', opts.dateFrom);
    }
    if (opts?.dateTo) {
      q = q.lte('created_at', opts.dateTo + 'T23:59:59.999Z');
    }

    return q;
  });
}

// ── Stats ──

export interface ActivityStats {
  totalActions: number;
  lastActivity: string | null;
  topModule: string | null;
}

/**
 * Fetches activity stats summary for a user.
 */
export async function getActivityStats(
  userId: string
): Promise<ServiceResult<ActivityStats>> {
  // Get total count and last activity
  const { data: countData, error: countError } = await supabase
    .from('audit_logs')
    .select('created_at, entity_type', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (countError) {
    return { data: null, error: countError.message };
  }

  const rows = countData ?? [];
  const totalActions = rows.length;
  const lastActivity = rows[0]?.created_at ?? null;

  // Find top module (most frequent entity_type)
  const moduleCounts: Record<string, number> = {};
  for (const row of rows) {
    const et = (row as { entity_type: string }).entity_type;
    moduleCounts[et] = (moduleCounts[et] ?? 0) + 1;
  }
  let topModule: string | null = null;
  let maxCount = 0;
  for (const [mod, count] of Object.entries(moduleCounts)) {
    if (count > maxCount) {
      topModule = mod;
      maxCount = count;
    }
  }

  return {
    data: { totalActions, lastActivity, topModule },
    error: null,
  };
}

// ── Entity type labels (Spanish) ──

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  session: 'Sesión',
  user: 'Usuarios',
  order: 'Pedidos',
  product: 'Inventario',
  bulk_upload: 'Cargas masivas',
  organization: 'Organizaciones',
  customer: 'Clientes',
  warehouse: 'Almacenes',
  location: 'Ubicaciones',
  pick_list: 'Picking',
  pack_session: 'Packing',
  receiving_order: 'Recepción',
  return: 'Devoluciones',
  stock_audit: 'Auditoría',
  supplier: 'Proveedores',
};

export const ACTION_LABELS: Record<string, string> = {
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  create: 'Crear',
  update: 'Actualizar',
  delete: 'Eliminar',
  status_change: 'Cambio de estado',
  assign: 'Asignar',
  cancel: 'Cancelar',
  complete: 'Completar',
  claim: 'Reclamar',
  start: 'Iniciar',
  pick_item: 'Pickear ítem',
  verify_item: 'Verificar ítem',
  add_photo: 'Agregar foto',
  receive_item: 'Recibir ítem',
  upload: 'Carga masiva',
  send_email: 'Enviar email',
  resend_invitation: 'Reenviar invitación',
  assign_stock: 'Asignar stock',
  remove_stock: 'Remover stock',
};
