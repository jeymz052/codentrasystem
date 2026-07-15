  -- ============================================================
  -- CODENTRA — separate POS store location from inventory location
  -- ============================================================
  -- POS store locations / stations are free-text values defined in Settings
  -- (e.g. "Main Store", "Bay 1") and are intentionally separate from inventory
  -- warehouse locations. They were previously written into location_id, which
  -- is a UUID foreign key to locations(id). A free-text value such as "wew"
  -- fails with "invalid input syntax for type uuid" and aborts the whole sale
  -- (or shift) upsert, so transactions silently disappear after a reload.
  --
  -- This migration adds a dedicated TEXT column on sales_transactions,
  -- cash_shifts and stock_movements to hold the free-text POS store location,
  -- leaving location_id for real inventory location UUIDs (or NULL).
  -- ============================================================

  ALTER TABLE sales_transactions
    ADD COLUMN IF NOT EXISTS pos_store_location TEXT;

  ALTER TABLE cash_shifts
    ADD COLUMN IF NOT EXISTS pos_store_location TEXT;

  ALTER TABLE stock_movements
    ADD COLUMN IF NOT EXISTS pos_store_location TEXT;

  COMMENT ON COLUMN sales_transactions.pos_store_location IS 'Free-text POS store location (separate from inventory locations). Set when location_id is not a real inventory location UUID.';
  COMMENT ON COLUMN cash_shifts.pos_store_location IS 'Free-text POS store location the shift was opened at.';
  COMMENT ON COLUMN stock_movements.pos_store_location IS 'Free-text POS store location the movement occurred at.';
