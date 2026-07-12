-- ============================================================
-- FINISHED GOODS FLAG
-- Marks products that are produced via a Bill of Materials (BOM)
-- so the POS can restrict selling to finished goods only.
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_finished_good BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_products_finished_good ON products (tenant_id, is_finished_good);

-- Keep the flag in sync with actual BOM definitions.
UPDATE products
SET is_finished_good = TRUE
WHERE id IN (SELECT DISTINCT finished_good_id FROM product_recipes);
