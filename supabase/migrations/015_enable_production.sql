-- ============================================================
-- ENABLE PRODUCTION FLAG (per-tenant)
-- Lets any business opt into the Production module (BOM + finished
-- goods). When enabled, only finished goods are sellable at the POS.
-- ============================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enable_production BOOLEAN NOT NULL DEFAULT FALSE;
