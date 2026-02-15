-- ============================================================
-- RHINO HUB — Row Level Security Policies
-- Run in Supabase SQL Editor (Step 3 of 4)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE POLICY "orgs_select" ON organizations FOR SELECT TO authenticated
  USING (id IN (SELECT get_user_org_ids()));

CREATE POLICY "orgs_insert" ON organizations FOR INSERT TO authenticated
  WITH CHECK (true); -- controlled by app logic

CREATE POLICY "orgs_update" ON organizations FOR UPDATE TO authenticated
  USING (id IN (SELECT get_user_org_ids()));

CREATE POLICY "orgs_delete" ON organizations FOR DELETE TO authenticated
  USING (id IN (SELECT get_user_org_ids()));

-- ============================================================
-- ORG_HIERARCHY
-- ============================================================
CREATE POLICY "hierarchy_select" ON org_hierarchy FOR SELECT TO authenticated
  USING (parent_id IN (SELECT get_user_org_ids()) OR child_id IN (SELECT get_user_org_ids()));

CREATE POLICY "hierarchy_insert" ON org_hierarchy FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "hierarchy_delete" ON org_hierarchy FOR DELETE TO authenticated
  USING (parent_id IN (SELECT get_user_org_ids()));

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ============================================================
-- ROLES (readable by all authenticated)
-- ============================================================
CREATE POLICY "roles_select" ON roles FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- USER_ROLES
-- ============================================================
CREATE POLICY "user_roles_select" ON user_roles FOR SELECT TO authenticated
  USING (
    user_id IN (SELECT p.id FROM profiles p WHERE p.org_id IN (SELECT get_user_org_ids()))
  );

CREATE POLICY "user_roles_insert" ON user_roles FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "user_roles_delete" ON user_roles FOR DELETE TO authenticated
  USING (
    user_id IN (SELECT p.id FROM profiles p WHERE p.org_id IN (SELECT get_user_org_ids()))
  );

-- ============================================================
-- PERMISSIONS (readable by all authenticated)
-- ============================================================
CREATE POLICY "permissions_select" ON permissions FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- ROLE_PERMISSIONS (readable by all authenticated)
-- ============================================================
CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- CATEGORIES (readable by all)
-- ============================================================
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "categories_anon_select" ON categories FOR SELECT TO anon
  USING (true);

CREATE POLICY "categories_insert" ON categories FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "categories_update" ON categories FOR UPDATE TO authenticated
  USING (true);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE POLICY "products_select" ON products FOR SELECT TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "products_insert" ON products FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "products_update" ON products FOR UPDATE TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "products_delete" ON products FOR DELETE TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

-- Public catalog: anon can read active products (no cost field via view)
CREATE POLICY "products_public_read" ON products FOR SELECT TO anon
  USING (status = 'active');

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE POLICY "customers_select" ON customers FOR SELECT TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "customers_insert" ON customers FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "customers_update" ON customers FOR UPDATE TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "customers_delete" ON customers FOR DELETE TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

-- ============================================================
-- ORDERS
-- ============================================================
CREATE POLICY "orders_select" ON orders FOR SELECT TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "orders_insert" ON orders FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "orders_update" ON orders FOR UPDATE TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "orders_delete" ON orders FOR DELETE TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

-- ============================================================
-- ORDER_ITEMS
-- ============================================================
CREATE POLICY "order_items_select" ON order_items FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE org_id IN (SELECT get_user_org_ids())));

CREATE POLICY "order_items_insert" ON order_items FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM orders WHERE org_id IN (SELECT get_user_org_ids())));

CREATE POLICY "order_items_update" ON order_items FOR UPDATE TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE org_id IN (SELECT get_user_org_ids())));

CREATE POLICY "order_items_delete" ON order_items FOR DELETE TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE org_id IN (SELECT get_user_org_ids())));

-- ============================================================
-- ORDER_STATUS_HISTORY
-- ============================================================
CREATE POLICY "order_history_select" ON order_status_history FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE org_id IN (SELECT get_user_org_ids())));

CREATE POLICY "order_history_insert" ON order_status_history FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM orders WHERE org_id IN (SELECT get_user_org_ids())));

-- ============================================================
-- INVOICES
-- ============================================================
CREATE POLICY "invoices_select" ON invoices FOR SELECT TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

-- ============================================================
-- INVENTORY_LOTS
-- ============================================================
ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lots_select" ON inventory_lots FOR SELECT TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "lots_insert" ON inventory_lots FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "lots_update" ON inventory_lots FOR UPDATE TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "lots_delete" ON inventory_lots FOR DELETE TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

-- ============================================================
-- PRODUCT_LOT_ENTRIES
-- ============================================================
ALTER TABLE product_lot_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lot_entries_select" ON product_lot_entries FOR SELECT TO authenticated
  USING (lot_id IN (SELECT id FROM inventory_lots WHERE org_id IN (SELECT get_user_org_ids())));

CREATE POLICY "lot_entries_insert" ON product_lot_entries FOR INSERT TO authenticated
  WITH CHECK (lot_id IN (SELECT id FROM inventory_lots WHERE org_id IN (SELECT get_user_org_ids())));

CREATE POLICY "lot_entries_update" ON product_lot_entries FOR UPDATE TO authenticated
  USING (lot_id IN (SELECT id FROM inventory_lots WHERE org_id IN (SELECT get_user_org_ids())));

CREATE POLICY "lot_entries_delete" ON product_lot_entries FOR DELETE TO authenticated
  USING (lot_id IN (SELECT id FROM inventory_lots WHERE org_id IN (SELECT get_user_org_ids())));

-- ============================================================
-- BULK_UPLOADS
-- ============================================================
CREATE POLICY "bulk_uploads_select" ON bulk_uploads FOR SELECT TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "bulk_uploads_insert" ON bulk_uploads FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "bulk_uploads_update" ON bulk_uploads FOR UPDATE TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()));

-- ============================================================
-- AUDIT_LOGS
-- ============================================================
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated
  USING (org_id IN (SELECT get_user_org_ids()) OR org_id IS NULL);

CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- NOTIFICATIONS (only own)
-- ============================================================
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- CARRIERS (readable by all)
-- ============================================================
CREATE POLICY "carriers_select" ON carriers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "carriers_anon_select" ON carriers FOR SELECT TO anon
  USING (true);

CREATE POLICY "carriers_manage" ON carriers FOR ALL TO authenticated
  USING (true);
