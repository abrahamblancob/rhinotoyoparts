-- ============================================================
-- Migration: Inventory Lots System
-- Adds inventory_lots, product_lot_entries tables
-- Adds lot_id to bulk_uploads for linking
-- ============================================================

-- 1. New enum for lot status
DO $$ BEGIN
  CREATE TYPE lot_status AS ENUM ('active', 'partial', 'depleted', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Inventory lots table
CREATE TABLE IF NOT EXISTS inventory_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  lot_number TEXT NOT NULL,
  file_name TEXT,
  total_products INT DEFAULT 0,
  total_stock INT DEFAULT 0,
  total_cost NUMERIC(14,2) DEFAULT 0,
  total_retail_value NUMERIC(14,2) DEFAULT 0,
  status lot_status DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lots_org_number ON inventory_lots(org_id, lot_number);

-- 3. Product lot entries table
CREATE TABLE IF NOT EXISTS product_lot_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES inventory_lots(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  initial_stock INT NOT NULL DEFAULT 0,
  remaining_stock INT NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) DEFAULT 0,
  unit_price NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lot_entries_lot ON product_lot_entries(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_entries_product ON product_lot_entries(product_id);

-- 4. Add lot_id to bulk_uploads
ALTER TABLE bulk_uploads ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES inventory_lots(id) ON DELETE SET NULL;
ALTER TABLE bulk_uploads ADD COLUMN IF NOT EXISTS total_stock INT DEFAULT 0;
ALTER TABLE bulk_uploads ADD COLUMN IF NOT EXISTS inventory_value NUMERIC(14,2) DEFAULT 0;

-- 5. Trigger for updated_at on inventory_lots
DROP TRIGGER IF EXISTS trg_inventory_lots_updated ON inventory_lots;
CREATE TRIGGER trg_inventory_lots_updated BEFORE UPDATE ON inventory_lots FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. RLS policies for inventory_lots
ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "lots_select" ON inventory_lots FOR SELECT TO authenticated
    USING (org_id IN (SELECT get_user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lots_insert" ON inventory_lots FOR INSERT TO authenticated
    WITH CHECK (org_id IN (SELECT get_user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lots_update" ON inventory_lots FOR UPDATE TO authenticated
    USING (org_id IN (SELECT get_user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. RLS policies for product_lot_entries
ALTER TABLE product_lot_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "lot_entries_select" ON product_lot_entries FOR SELECT TO authenticated
    USING (lot_id IN (SELECT id FROM inventory_lots WHERE org_id IN (SELECT get_user_org_ids())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lot_entries_insert" ON product_lot_entries FOR INSERT TO authenticated
    WITH CHECK (lot_id IN (SELECT id FROM inventory_lots WHERE org_id IN (SELECT get_user_org_ids())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lot_entries_update" ON product_lot_entries FOR UPDATE TO authenticated
    USING (lot_id IN (SELECT id FROM inventory_lots WHERE org_id IN (SELECT get_user_org_ids())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
