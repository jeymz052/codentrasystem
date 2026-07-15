-- ============================================================
-- 030 — Waste / Defect / Reject schema completeness
-- ============================================================
-- Ensures all waste-tracking columns, constraints and indexes exist
-- so logged waste / defect / reject stock is persisted correctly
-- and does not disappear after reload.
-- ============================================================

ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_waste_location BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN locations.is_waste_location IS 'Designated Waste / Defect / Reject storage. Stock here cannot be issued or sold.';

ALTER TABLE inventory_lots DROP CONSTRAINT IF EXISTS inventory_lots_source_check;
ALTER TABLE inventory_lots ADD CONSTRAINT inventory_lots_source_check
  CHECK (source IN ('seed', 'purchase_order', 'production', 'adjustment', 'import', 'transfer'));

CREATE INDEX IF NOT EXISTS idx_inventory_lots_location ON inventory_lots(location_id);
