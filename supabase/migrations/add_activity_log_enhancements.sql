-- ============================================================
-- Migration: Activity Log Enhancements
-- Adds description + metadata columns, indexes, and RPC function
-- to the existing audit_logs table for user activity timeline.
-- ============================================================

-- Descripción en lenguaje natural para consultas IA
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS description TEXT;

-- Metadata flexible (página, componente, contexto extra)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Índice crítico para timeline por usuario (user_id + created_at DESC)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs(user_id, created_at DESC);

-- Índice para filtrar por entidad
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs(entity_type, entity_id);

-- Función RPC para INSERT sin overhead de RLS (SECURITY DEFINER)
-- Impacto <1% en rendimiento vs INSERT directo con RLS
CREATE OR REPLACE FUNCTION log_user_activity(
  p_org_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (org_id, user_id, action, entity_type, entity_id, description, old_data, new_data, metadata)
  VALUES (p_org_id, p_user_id, p_action, p_entity_type, p_entity_id, p_description, p_old_data, p_new_data, p_metadata);
END;
$$;

-- RLS: Asegurar que SELECT de audit_logs filtre por org
-- (La política de INSERT ya existe en rls.sql)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'audit_logs_select_org' AND tablename = 'audit_logs'
  ) THEN
    CREATE POLICY audit_logs_select_org ON audit_logs FOR SELECT TO authenticated
      USING (org_id IS NULL OR org_id IN (SELECT get_user_org_ids()));
  END IF;
END $$;
