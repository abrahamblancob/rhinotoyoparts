-- ============================================================
-- Migration: Fix permissive RLS INSERT policies
-- Restricts INSERT policies that previously used WITH CHECK (true)
-- to enforce proper authorization checks
-- ============================================================

-- ============================================================
-- USER_ROLES — CRITICAL: prevent privilege escalation
-- Only users with 'users:write' or 'users:manage' permission can assign roles
-- ============================================================
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
CREATE POLICY "user_roles_insert" ON user_roles FOR INSERT TO authenticated
  WITH CHECK (
    has_permission('users', 'write') OR has_permission('users', 'manage')
  );

-- ============================================================
-- ORGANIZATIONS — Only platform users can create organizations
-- ============================================================
DROP POLICY IF EXISTS "orgs_insert" ON organizations;
CREATE POLICY "orgs_insert" ON organizations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN organizations o ON o.id = p.org_id
      WHERE p.id = auth.uid() AND o.type = 'platform'
    )
  );

-- ============================================================
-- ORG_HIERARCHY — Only platform users can create hierarchy entries
-- ============================================================
DROP POLICY IF EXISTS "hierarchy_insert" ON org_hierarchy;
CREATE POLICY "hierarchy_insert" ON org_hierarchy FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN organizations o ON o.id = p.org_id
      WHERE p.id = auth.uid() AND o.type = 'platform'
    )
  );

-- ============================================================
-- PROFILES — Only users with 'users:write'/'users:manage' or platform owners
-- (Service role via Edge Functions bypasses RLS, so this only restricts direct client access)
-- ============================================================
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR has_permission('users', 'write')
    OR has_permission('users', 'manage')
  );

-- ============================================================
-- CATEGORIES — Only users with inventory:write can create/update categories
-- ============================================================
DROP POLICY IF EXISTS "categories_insert" ON categories;
CREATE POLICY "categories_insert" ON categories FOR INSERT TO authenticated
  WITH CHECK (
    has_permission('inventory', 'write') OR has_permission('inventory', 'manage')
  );

DROP POLICY IF EXISTS "categories_update" ON categories;
CREATE POLICY "categories_update" ON categories FOR UPDATE TO authenticated
  USING (
    has_permission('inventory', 'write') OR has_permission('inventory', 'manage')
  );

-- ============================================================
-- CARRIERS — Only platform users can manage carriers
-- ============================================================
DROP POLICY IF EXISTS "carriers_manage" ON carriers;
CREATE POLICY "carriers_manage" ON carriers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN organizations o ON o.id = p.org_id
      WHERE p.id = auth.uid() AND o.type = 'platform'
    )
  );

-- ============================================================
-- NOTIFICATIONS — Users can only insert notifications for themselves
-- ============================================================
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- AUDIT_LOGS — Only authenticated users in same org can insert
-- (Keep relatively permissive since audit logging should not fail)
-- ============================================================
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    org_id IS NULL OR org_id IN (SELECT get_user_org_ids())
  );
