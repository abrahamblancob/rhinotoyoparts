import { query } from './base.ts';
import type { Organization } from '@/lib/database.types.ts';

export async function getOrganizations(filter?: { type?: string; status?: string }) {
  return query<Organization[]>((sb) => {
    let q = sb.from('organizations').select('*').order('name');
    if (filter?.type) q = q.eq('type', filter.type);
    if (filter?.status) q = q.eq('status', filter.status);
    return q;
  });
}

export async function getOrgNameMap(orgIds: string[]) {
  if (orgIds.length === 0) return {} as Record<string, string>;
  const result = await query<{ id: string; name: string }[]>((sb) =>
    sb.from('organizations').select('id, name').in('id', orgIds)
  );
  const map: Record<string, string> = {};
  if (result.data) result.data.forEach((o) => { map[o.id] = o.name; });
  return map;
}

export async function getChildOrgIds(parentId: string): Promise<string[]> {
  const result = await query<{ child_id: string }[]>((sb) =>
    sb.from('org_hierarchy').select('child_id').eq('parent_id', parentId)
  );
  return result.data?.map((r) => r.child_id) ?? [];
}

export async function getChildOrganizations(parentId: string) {
  const childIds = await getChildOrgIds(parentId);
  if (childIds.length === 0) return { data: [] as Organization[], error: null };
  return query<Organization[]>((sb) =>
    sb.from('organizations').select('*').in('id', childIds).order('name')
  );
}

export async function getParentOrgId(childId: string): Promise<string | null> {
  const result = await query<{ parent_id: string }[]>((sb) =>
    sb.from('org_hierarchy').select('parent_id').eq('child_id', childId).limit(1)
  );
  return result.data?.[0]?.parent_id ?? null;
}

export async function getVisibleOrgIds(orgType: string, orgId: string): Promise<string[]> {
  if (orgType === 'platform') return []; // Empty = no filter (sees all via RLS)
  const ids = [orgId];
  if (orgType === 'aggregator') {
    const childIds = await getChildOrgIds(orgId);
    ids.push(...childIds);
  }
  return ids;
}
