-- ============================================================
-- Rhino Vision v2 — Search extensions for product matching
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Enable pg_trgm for fuzzy/similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create GIN index for full-text search in Spanish on products
CREATE INDEX IF NOT EXISTS idx_products_fts
  ON products
  USING GIN (to_tsvector('spanish', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(brand, '')));

-- 3. Create trigram index on product name for similarity search
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products
  USING GIN (name gin_trgm_ops);

-- 4. Create trigram index on SKU for fuzzy SKU matching
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm
  ON products
  USING GIN (sku gin_trgm_ops);

-- 5. Create index on oem_number for exact/partial OEM matching
CREATE INDEX IF NOT EXISTS idx_products_oem
  ON products (oem_number)
  WHERE oem_number IS NOT NULL;

-- 6. Create the vision_searches analytics table
CREATE TABLE IF NOT EXISTS vision_searches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_name       VARCHAR(255),
  oem_number      VARCHAR(50),
  category        VARCHAR(100),
  confidence      DECIMAL(5,2),
  had_results     BOOLEAN DEFAULT false,
  results_count   INTEGER DEFAULT 0,
  clicked_product UUID REFERENCES products(id) ON DELETE SET NULL,
  clicked_whatsapp BOOLEAN DEFAULT false,
  image_url       TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vision_searches_created ON vision_searches(created_at DESC);

-- 7. Create the product_requests table (leads when no match)
CREATE TABLE IF NOT EXISTS product_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_name       VARCHAR(255),
  oem_number      VARCHAR(50),
  category        VARCHAR(100),
  compatible_models TEXT[],
  customer_email  VARCHAR(255),
  customer_phone  VARCHAR(20),
  ai_analysis     JSONB,
  image_url       TEXT,
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_requests_status ON product_requests(status);

-- 8. RLS policies for vision_searches (public insert, admin read)
ALTER TABLE vision_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert vision searches"
  ON vision_searches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read vision searches"
  ON vision_searches FOR SELECT
  USING (auth.role() = 'authenticated');

-- 9. RLS policies for product_requests (public insert, admin read)
ALTER TABLE product_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert product requests"
  ON product_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read product requests"
  ON product_requests FOR SELECT
  USING (auth.role() = 'authenticated');

-- 10. RPC function for full-text search (Level 3 matching)
CREATE OR REPLACE FUNCTION search_products_fts(search_query TEXT)
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
  org_whatsapp TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.name, p.sku, p.oem_number, p.brand, p.price, p.stock,
    p.image_url, p.compatible_models,
    o.name AS org_name,
    o.whatsapp AS org_whatsapp
  FROM products p
  JOIN organizations o ON o.id = p.org_id
  WHERE p.status = 'active'
    AND p.stock > 0
    AND to_tsvector('spanish', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.brand, ''))
        @@ plainto_tsquery('spanish', search_query)
  ORDER BY ts_rank(
    to_tsvector('spanish', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.brand, '')),
    plainto_tsquery('spanish', search_query)
  ) DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
