-- ============================================================
-- Migration: Add SET search_path to SECURITY DEFINER functions
-- Prevents search_path hijacking attacks on privileged functions
-- ============================================================

-- get_user_org_ids
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
    RETURN NEXT v_org_id;
  END IF;
END;
$$;

-- get_user_permissions
CREATE OR REPLACE FUNCTION get_user_permissions()
RETURNS TABLE(module TEXT, action TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
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

-- has_permission
CREATE OR REPLACE FUNCTION has_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
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

-- handle_new_user (trigger function)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
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

-- search_products_smart
CREATE OR REPLACE FUNCTION search_products_smart(
  search_name TEXT,
  search_keywords TEXT[],
  search_category TEXT DEFAULT NULL,
  search_oem TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sku TEXT,
  oem_number TEXT,
  brand TEXT,
  price NUMERIC(12,2),
  stock INT,
  image_url TEXT,
  compatible_models TEXT[],
  org_name TEXT,
  org_whatsapp TEXT,
  match_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH scored_products AS (
    SELECT
      p.id,
      p.name,
      p.sku,
      p.oem_number,
      p.brand,
      p.price,
      p.stock,
      p.image_url,
      p.compatible_models,
      o.name AS org_name,
      o.whatsapp AS org_whatsapp,
      GREATEST(
        similarity(LOWER(p.name), LOWER(search_name)),
        (
          SELECT COALESCE(MAX(similarity(LOWER(p.name), LOWER(kw))), 0)
          FROM unnest(search_keywords) AS kw
        ),
        CASE WHEN EXISTS (
          SELECT 1 FROM unnest(search_keywords) AS kw
          WHERE LOWER(p.name) LIKE '%' || LOWER(kw) || '%'
             OR LOWER(COALESCE(p.description, '')) LIKE '%' || LOWER(kw) || '%'
        ) THEN 0.4 ELSE 0 END,
        CASE WHEN search_oem IS NOT NULL AND (
          p.oem_number ILIKE '%' || search_oem || '%'
          OR p.sku ILIKE '%' || search_oem || '%'
        ) THEN 0.9 ELSE 0 END,
        CASE WHEN search_category IS NOT NULL AND (
          LOWER(p.name) LIKE '%' || LOWER(search_category) || '%'
          OR LOWER(COALESCE(p.description, '')) LIKE '%' || LOWER(search_category) || '%'
        ) THEN 0.2 ELSE 0 END
      ) AS match_score
    FROM products p
    JOIN organizations o ON o.id = p.org_id
    WHERE p.status = 'active'
      AND p.stock > 0
  )
  SELECT sp.*
  FROM scored_products sp
  WHERE sp.match_score > 0.15
  ORDER BY sp.match_score DESC
  LIMIT 10;
END;
$$;
