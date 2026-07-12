-- ============================================================
-- 009 — Allow 'transfer' as an inventory_lots source
-- ============================================================
-- Stock transfers move FIFO lots between locations and record the
-- destination lot with source = 'transfer'. Extend the existing
-- CHECK constraint to permit it. Safe to re-run.
-- ============================================================

ALTER TABLE inventory_lots DROP CONSTRAINT IF EXISTS inventory_lots_source_check;
ALTER TABLE inventory_lots ADD CONSTRAINT inventory_lots_source_check
  CHECK (source IN ('seed', 'purchase_order', 'production', 'adjustment', 'import', 'transfer'));
