import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase.ts';

interface ChildOrg {
  id: string;
  name: string;
  type: string;
}

/**
 * Two-level navigation hook for platform super admin views.
 * Level 1: Aggregator grid (summaries)
 * Level 2: Associate sub-selection or direct list view
 *
 * Navigation states:
 *  - 'aggregators': show aggregator grid
 *  - 'associates':  show associate cards for selected aggregator
 *  - 'list':        show data list (with optional associate filter)
 */
export function useAggregatorNav<T extends { id: string }>(
  fetchSummaries: () => Promise<T[]>,
  isPlatform: boolean,
) {
  const [summaries, setSummaries] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAggregatorId, setSelectedAggregatorId] = useState<string | null>(null);
  const [selectedAssociateId, setSelectedAssociateId] = useState<string | null>(null);
  const [childOrgs, setChildOrgs] = useState<ChildOrg[]>([]);
  const [childOrgsLoading, setChildOrgsLoading] = useState(false);
  const mountedRef = useRef(true);
  const fetchRef = useRef<object | null>(null);

  // Load aggregator summaries
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

  // When an aggregator is selected, load its children
  const selectAggregator = useCallback(async (aggId: string) => {
    setSelectedAggregatorId(aggId);
    setSelectedAssociateId(null);
    setChildOrgsLoading(true);

    const { data: hierarchy } = await supabase
      .from('org_hierarchy').select('child_id').eq('parent_id', aggId);
    const childIds = (hierarchy ?? []).map((h: { child_id: string }) => h.child_id);

    if (childIds.length > 0) {
      const { data: children } = await supabase
        .from('organizations').select('id, name, type')
        .in('id', childIds).eq('status', 'active').order('name');
      setChildOrgs((children as ChildOrg[]) ?? []);
    } else {
      setChildOrgs([]);
    }
    setChildOrgsLoading(false);
  }, []);

  const selectAssociate = useCallback((assocId: string) => {
    setSelectedAssociateId(assocId);
  }, []);

  const viewAllForAggregator = useCallback(() => {
    setSelectedAssociateId('__all__');
  }, []);

  const goBackToAggregators = useCallback(() => {
    setSelectedAggregatorId(null);
    setSelectedAssociateId(null);
    setChildOrgs([]);
  }, []);

  const goBackToAssociates = useCallback(() => {
    setSelectedAssociateId(null);
  }, []);

  // Determine current navigation state
  let navState: 'aggregators' | 'associates' | 'list';
  if (!isPlatform || !selectedAggregatorId) {
    navState = isPlatform ? 'aggregators' : 'list';
  } else if (selectedAssociateId) {
    navState = 'list';
  } else {
    navState = childOrgs.length > 0 && !childOrgsLoading ? 'associates' : 'list';
  }

  // The orgId to use for data fetching
  const effectiveOrgId = selectedAssociateId === '__all__' || !selectedAssociateId
    ? selectedAggregatorId
    : selectedAssociateId;

  // Whether to include children in the query
  const includeChildren = selectedAssociateId === '__all__' || !selectedAssociateId;

  const selectedAggregator = summaries.find((s) => s.id === selectedAggregatorId);
  const selectedAssociate = childOrgs.find((c) => c.id === selectedAssociateId);

  // Breadcrumb segments
  const breadcrumbs: { label: string; onClick?: () => void }[] = [];
  if (isPlatform && selectedAggregatorId) {
    breadcrumbs.push({ label: 'Agregadores', onClick: goBackToAggregators });
    const aggName = (selectedAggregator as T & { name?: string })?.name ?? 'Agregador';
    if (selectedAssociateId) {
      breadcrumbs.push({ label: aggName as string, onClick: goBackToAssociates });
      if (selectedAssociateId === '__all__') {
        breadcrumbs.push({ label: 'Todas las órdenes' });
      } else {
        breadcrumbs.push({ label: selectedAssociate?.name ?? 'Asociado' });
      }
    } else {
      breadcrumbs.push({ label: aggName as string });
    }
  }

  return {
    summaries,
    loading,
    navState,
    childOrgs,
    childOrgsLoading,
    selectedAggregatorId,
    selectedAssociateId,
    selectedAggregator,
    selectedAssociate,
    effectiveOrgId,
    includeChildren,
    breadcrumbs,
    selectAggregator,
    selectAssociate,
    viewAllForAggregator,
    goBackToAggregators,
    goBackToAssociates,
  };
}
