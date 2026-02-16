-- ============================================================
-- Rhino Vision v2.1 — Improved fuzzy product search
-- Run in Supabase SQL Editor
-- ============================================================

-- Smart search function that combines multiple strategies:
-- 1. Trigram similarity on product name (fuzzy match)
-- 2. Searches each keyword individually with OR logic
-- 3. Falls back to category-based search
-- Returns results ordered by relevance score

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
) AS $$
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
        -- Similarity between AI name and product name
        similarity(LOWER(p.name), LOWER(search_name)),
        -- Check if any keyword matches product name with similarity
        (
          SELECT COALESCE(MAX(similarity(LOWER(p.name), LOWER(kw))), 0)
          FROM unnest(search_keywords) AS kw
        ),
        -- Bonus for keyword substring match (ILIKE)
        CASE WHEN EXISTS (
          SELECT 1 FROM unnest(search_keywords) AS kw
          WHERE LOWER(p.name) LIKE '%' || LOWER(kw) || '%'
             OR LOWER(COALESCE(p.description, '')) LIKE '%' || LOWER(kw) || '%'
        ) THEN 0.4 ELSE 0 END,
        -- Bonus for OEM match
        CASE WHEN search_oem IS NOT NULL AND (
          p.oem_number ILIKE '%' || search_oem || '%'
          OR p.sku ILIKE '%' || search_oem || '%'
        ) THEN 0.9 ELSE 0 END,
        -- Bonus for category match
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
