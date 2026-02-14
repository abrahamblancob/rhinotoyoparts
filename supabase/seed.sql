-- ============================================================
-- RHINO HUB — Seed Data
-- Run in Supabase SQL Editor (Step 4 of 4)
-- ============================================================

-- 1. Platform Organization
INSERT INTO organizations (id, name, type, email, status)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Rhino Hub',
  'platform',
  'admin@rhinohub.com',
  'active'
);

-- 2. Roles (9 roles)
INSERT INTO roles (name, display_name, org_type, description) VALUES
  ('platform_owner',     'Dueño de Plataforma',  'platform',    'Acceso total a toda la plataforma'),
  ('platform_support',   'Soporte Plataforma',   'platform',    'Puede leer y escribir, sin borrar ni gestionar'),
  ('platform_viewer',    'Visor Plataforma',     'platform',    'Solo lectura en toda la plataforma'),
  ('aggregator_admin',   'Admin Agregador',      'aggregator',  'Acceso total dentro de su agregador'),
  ('aggregator_manager', 'Manager Agregador',    'aggregator',  'Lectura y escritura en su agregador'),
  ('aggregator_viewer',  'Visor Agregador',      'aggregator',  'Solo lectura en su agregador'),
  ('associate_admin',    'Admin Asociado',       'associate',   'Acceso total dentro de su asociado'),
  ('associate_editor',   'Editor Asociado',      'associate',   'Lectura y escritura en su asociado'),
  ('associate_viewer',   'Visor Asociado',       'associate',   'Solo lectura en su asociado');

-- 3. Permissions (11 modules x 4 actions = 44)
INSERT INTO permissions (module, action) VALUES
  ('dashboard', 'read'), ('dashboard', 'write'), ('dashboard', 'delete'), ('dashboard', 'manage'),
  ('organizations', 'read'), ('organizations', 'write'), ('organizations', 'delete'), ('organizations', 'manage'),
  ('users', 'read'), ('users', 'write'), ('users', 'delete'), ('users', 'manage'),
  ('inventory', 'read'), ('inventory', 'write'), ('inventory', 'delete'), ('inventory', 'manage'),
  ('catalog', 'read'), ('catalog', 'write'), ('catalog', 'delete'), ('catalog', 'manage'),
  ('orders', 'read'), ('orders', 'write'), ('orders', 'delete'), ('orders', 'manage'),
  ('customers', 'read'), ('customers', 'write'), ('customers', 'delete'), ('customers', 'manage'),
  ('billing', 'read'), ('billing', 'write'), ('billing', 'delete'), ('billing', 'manage'),
  ('audit', 'read'), ('audit', 'write'), ('audit', 'delete'), ('audit', 'manage'),
  ('settings', 'read'), ('settings', 'write'), ('settings', 'delete'), ('settings', 'manage'),
  ('upload', 'read'), ('upload', 'write'), ('upload', 'delete'), ('upload', 'manage');

-- 4. Role-Permission assignments

-- platform_owner: ALL 44 permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'platform_owner';

-- platform_support: read + write on all modules
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'platform_support'
  AND p.action IN ('read', 'write');

-- platform_viewer: read only on all modules
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'platform_viewer'
  AND p.action = 'read';

-- aggregator_admin: all actions on relevant modules
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'aggregator_admin'
  AND p.module IN ('dashboard','organizations','users','inventory','orders','billing','audit','settings');

-- aggregator_manager: read + write on subset
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'aggregator_manager'
  AND p.module IN ('dashboard','organizations','inventory','orders','billing')
  AND p.action IN ('read', 'write');

-- aggregator_viewer: read only on subset
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'aggregator_viewer'
  AND p.module IN ('dashboard','organizations','inventory','orders')
  AND p.action = 'read';

-- associate_admin: all actions on associate modules
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'associate_admin'
  AND p.module IN ('dashboard','inventory','catalog','orders','customers','billing','audit','settings','upload');

-- associate_editor: read + write on subset
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'associate_editor'
  AND p.module IN ('dashboard','inventory','catalog','orders','customers','upload')
  AND p.action IN ('read', 'write');

-- associate_viewer: read only on subset
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'associate_viewer'
  AND p.module IN ('dashboard','inventory','catalog','orders')
  AND p.action = 'read';

-- 5. Default Categories (global, no org_id)
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Filtros',      'filtros',      1),
  ('Frenos',       'frenos',       2),
  ('Motor',        'motor',        3),
  ('Suspensión',   'suspension',   4),
  ('Encendido',    'encendido',    5),
  ('Eléctrico',    'electrico',    6),
  ('Transmisión',  'transmision',  7),
  ('Carrocería',   'carroceria',   8);

-- 6. Carriers
INSERT INTO carriers (name, code, tracking_url, is_active) VALUES
  ('MRW Express',  'mrw',    'https://www.mrw.com.ve/rastreo/',     true),
  ('Zoom',         'zoom',   'https://www.zoom.com.ve/rastreo/',    true),
  ('TEALCA',       'tealca', 'https://www.tealca.com/rastreo/',     true),
  ('Domesa',       'domesa', 'https://www.domesa.com.ve/rastreo/',  true);
