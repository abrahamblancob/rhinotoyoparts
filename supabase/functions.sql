-- ============================================================
-- RHINO HUB — Functions
-- Run in Supabase SQL Editor (Step 2 of 4)
-- ============================================================

-- Returns all org IDs the current user can access
-- Platform users: all orgs
-- Aggregator users: own org + child associates
-- Associate users: own org only
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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
    -- Platform sees everything
    RETURN QUERY SELECT id FROM organizations;
  ELSIF v_org_type = 'aggregator' THEN
    -- Own org + children
    RETURN NEXT v_org_id;
    RETURN QUERY
      SELECT child_id FROM org_hierarchy WHERE parent_id = v_org_id;
  ELSE
    -- Associate: only own org
    RETURN NEXT v_org_id;
  END IF;
END;
$$;

-- Returns permissions for the current user
CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS TABLE(module TEXT, action TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.module, p.action
  FROM permissions p
  JOIN role_permissions rp ON rp.permission_id = p.id
  JOIN user_roles ur ON ur.role_id = rp.role_id
  WHERE ur.user_id = auth.uid();
END;
$$;

-- Boolean helper: does the current user have a specific permission?
CREATE OR REPLACE FUNCTION has_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = auth.uid()
      AND p.module = p_module
      AND p.action = p_action
  );
END;
$$;

-- Trigger function: auto-create profile when a new auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create profile if metadata contains org_id
  IF NEW.raw_user_meta_data->>'org_id' IS NOT NULL THEN
    INSERT INTO profiles (id, org_id, full_name, email)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'org_id')::UUID,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END;
$$;
