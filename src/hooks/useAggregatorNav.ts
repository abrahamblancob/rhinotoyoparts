import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase.ts';

interface ChildOrg {
  id: string;
  name: string;
  type: string;
}

/**
 * Navigation hook for platform super admin views.
 * Level 1: Aggregator grid (summaries)
 * Level 2: Data list (aggregator + its children, with "Asociado" column)
 *
 * Navigation states:
 *  - 'aggregators': show aggregator grid
 *  - 'list':        show data list (includes children automatically)
 */
export function useAggregatorNav<T extends { id: string }>(
  fetchSummaries: () => Promise<T[]>,
  isPlatform: boolean,
) {
  const [summaries, setSummaries] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAggregatorId, setSelectedAggregatorId] = useState<string | null>(null);
  const [childOrgs, setChildOrgs] = useState<ChildOrg[]>([]);
  const [filterChildOrgId, setFilterChildOrgId] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetchRef = useRef<object | null>(null);

  const loadSummaries = useCallback(() => {
    if (!isPlatform) return;
    setLoading(true);
    const fetchId = {};
    fetchRef.current = fetchId;
    fetchSummaries()
      .then((data) => {
        if (!mountedRef.current || fetchRef.current !== fetchId) return;
        setSummaries(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!mountedRef.current || fetchRef.current !== fetchId) return;
        setLoading(false);
      });
  }, [isPlatform, fetchSummaries]);

  useEffect(() => {
    mountedRef.current = true;
    if (isPlatform && !selectedAggregatorId) loadSummaries();
    return () => { mountedRef.current = false; };
  }, [isPlatform, selectedAggregatorId, loadSummaries]);

  // Load child orgs when aggregator is selected
  useEffect(() => {
    if (!selectedAggregatorId) {
      setChildOrgs([]);
      setFilterChildOrgId(null);
      return;
    }
    supabase
      .from('org_hierarchy')
      .select('child_id')
      .eq('parent_id', selectedAggregatorId)
      .then(({ data: hierarchy }) => {
        const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);
        if (childIds.length === 0) {
          setChildOrgs([]);
          return;
        }
        supabase
          .from('organizations')
          .select('id, name, type')
          .in('id', childIds)
          .eq('status', 'active')
          .order('name')
          .then(({ data: orgs }) => {
            if (mountedRef.current) {
              setChildOrgs((orgs as ChildOrg[]) ?? []);
            }
          });
      });
  }, [selectedAggregatorId]);

  const selectAggregator = useCallback((aggId: string) => {
    setSelectedAggregatorId(aggId);
    setFilterChildOrgId(null);
  }, []);

  const goBackToAggregators = useCallback(() => {
    setSelectedAggregatorId(null);
    setFilterChildOrgId(null);
  }, []);

  const navState: 'aggregators' | 'list' = isPlatform && !selectedAggregatorId ? 'aggregators' : 'list';

  const selectedAggregator = summaries.find((s) => s.id === selectedAggregatorId);

  // Breadcrumb segments
  const breadcrumbs: { label: string; onClick?: () => void }[] = [];
  if (isPlatform && selectedAggregatorId) {
    breadcrumbs.push({ label: 'Agregadores', onClick: goBackToAggregators });
    const aggName = (selectedAggregator as T & { name?: string })?.name ?? 'Agregador';
    breadcrumbs.push({ label: aggName as string });
  }

  // effectiveOrgId: if filtering by child, use child's ID; otherwise aggregator
  const effectiveOrgId = filterChildOrgId ?? selectedAggregatorId;
  // includeChildren: only include children when NOT filtering by a specific child
  const includeChildren = !filterChildOrgId;

  return {
    summaries,
    loading,
    navState,
    selectedAggregatorId,
    selectedAggregator,
    effectiveOrgId,
    includeChildren,
    breadcrumbs,
    childOrgs,
    filterChildOrgId,
    setFilterChildOrgId,
    selectAggregator,
    goBackToAggregators,
  };
}
