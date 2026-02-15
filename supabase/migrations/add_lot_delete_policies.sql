-- ============================================================
-- Migration: Add DELETE RLS policies for inventory_lots and product_lot_entries
-- Allows deletion of lots and their entries (used by platform_owner via app logic)
-- ============================================================

-- DELETE policy for inventory_lots
DO $$ BEGIN
  CREATE POLICY "lots_delete" ON inventory_lots FOR DELETE TO authenticated
    USING (org_id IN (SELECT get_user_org_ids()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- DELETE policy for product_lot_entries
DO $$ BEGIN
  CREATE POLICY "lot_entries_delete" ON product_lot_entries FOR DELETE TO authenticated
    USING (lot_id IN (SELECT id FROM inventory_lots WHERE org_id IN (SELECT get_user_org_ids())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
