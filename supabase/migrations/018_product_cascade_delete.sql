-- ============================================================
-- 018 — Allow product deletion to cascade to dependent rows
-- ============================================================
-- Several child tables reference products(id) with ON DELETE RESTRICT
-- (sales_transaction_items, purchase_order_items, stock_movements). That
-- blocks deleting a product that has any sale / PO / movement line, causing
-- the inventory "delete" to fail (500) and the items to reappear.
--
-- inventory_lots and product_recipes already use ON DELETE CASCADE, so this
-- just makes the remaining product references consistent: deleting a product
-- cascades to its dependent rows. Idempotent / safe to re-run.
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = 'products'::regclass
      AND conrelid::regclass::text IN ('sales_transaction_items', 'purchase_order_items', 'stock_movements')
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE sales_transaction_items
  ADD CONSTRAINT sales_transaction_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE purchase_order_items
  ADD CONSTRAINT purchase_order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
