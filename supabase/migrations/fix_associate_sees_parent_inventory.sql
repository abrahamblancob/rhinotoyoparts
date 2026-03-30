-- ============================================================
-- Migration: Associates can see their parent aggregator's products
-- Business rule: if inventory belongs to the aggregator, all child
-- associates should be able to see it when creating orders.
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_org_type TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;

  SELECT p.org_id INTO v_org_id
  FROM profiles p WHERE p.id = v_user_id;

  IF v_org_id IS NULL THEN RETURN; END IF;

  SELECT o.type::TEXT INTO v_org_type
  FROM organizations o WHERE o.id = v_org_id;

  IF v_org_type = 'platform' THEN
    RETURN QUERY SELECT id FROM organizations;
  ELSIF v_org_type = 'aggregator' THEN
    RETURN NEXT v_org_id;
    RETURN QUERY
      SELECT child_id FROM org_hierarchy WHERE parent_id = v_org_id;
  ELSE
    -- Associate: own org + parent aggregator(s)
    RETURN NEXT v_org_id;
    RETURN QUERY
      SELECT parent_id FROM org_hierarchy WHERE child_id = v_org_id;
  END IF;
END;
$$;
