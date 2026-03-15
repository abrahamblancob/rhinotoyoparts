import { supabase } from '@/lib/supabase.ts';

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

export async function query<T>(
  fn: (client: typeof supabase) => PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<ServiceResult<T>> {
  try {
    const { data, error } = await fn(supabase);
    if (error) return { data: null, error: error.message };
    return { data: data as T, error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

// Re-export supabase for services that need raw access (e.g., realtime channels)
export { supabase };

// ── Shared helpers ──

export interface OrgScopeOpts {
  orgId?: string;
  isPlatform?: boolean;
  isAggregator?: boolean;
}

/**
 * Resolves the list of org IDs visible to an aggregator (own + children).
 * Returns null for non-aggregator callers.
 */
export async function resolveAggregatorOrgIds(opts?: OrgScopeOpts): Promise<string[] | null> {
  if (!opts?.isAggregator || !opts?.orgId) return null;
  const { data: hierarchy } = await supabase
    .from('org_hierarchy')
    .select('child_id')
    .eq('parent_id', opts.orgId);
  const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);
  return [opts.orgId, ...childIds];
}

/**
 * Applies org-scope filtering to a Supabase query builder.
 * Handles platform (no filter), aggregator (in), and single-org (eq) cases.
 */
export function applyOrgScope<Q extends { in: (col: string, vals: string[]) => Q; eq: (col: string, val: string) => Q }>(
  q: Q,
  opts?: OrgScopeOpts,
  aggregatorOrgIds?: string[] | null,
): Q {
  if (opts?.isPlatform) return q;
  if (aggregatorOrgIds) return q.in('org_id', aggregatorOrgIds);
  if (opts?.orgId) return q.eq('org_id', opts.orgId);
  return q;
}
