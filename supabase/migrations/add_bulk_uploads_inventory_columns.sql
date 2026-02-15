-- Add total_stock and inventory_value columns to bulk_uploads table
-- These track the total stock units and estimated inventory value (USD) per upload

ALTER TABLE bulk_uploads ADD COLUMN IF NOT EXISTS total_stock INT DEFAULT 0;
ALTER TABLE bulk_uploads ADD COLUMN IF NOT EXISTS inventory_value NUMERIC(14,2) DEFAULT 0;
