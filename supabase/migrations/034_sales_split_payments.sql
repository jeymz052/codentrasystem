  -- ============================================================
  -- CODENTRA — persist split payments on sales transactions
  -- ============================================================
  -- A single sale can be paid with more than one method (e.g. part cash,
  -- part GCash). Previously only a single `payment_method` column was stored,
  -- so split sales showed up in the transactions list as just the first
  -- method (and defaulted to "cash"), losing the real breakdown.
  --
  -- This migration adds:
  --   * split_payments   — JSONB array of { payment_method, amount, reference }
  --   * cash_sales_total — cash portion of the sale (split-aware)
  --   * qr_sales_total   — non-cash portion of the sale (split-aware)
  -- so the full payment breakdown round-trips through the database and the
  -- transactions list / filters can reflect the true mode(s) of payment.
  -- ============================================================

  ALTER TABLE sales_transactions
    ADD COLUMN IF NOT EXISTS split_payments JSONB;

  ALTER TABLE sales_transactions
    ADD COLUMN IF NOT EXISTS cash_sales_total NUMERIC(12,2) NOT NULL DEFAULT 0;

  ALTER TABLE sales_transactions
    ADD COLUMN IF NOT EXISTS qr_sales_total NUMERIC(12,2) NOT NULL DEFAULT 0;

  COMMENT ON COLUMN sales_transactions.split_payments IS 'Optional JSONB array of split payment entries: [{ payment_method, amount, reference }]. NULL when the sale used a single payment method.';
  COMMENT ON COLUMN sales_transactions.cash_sales_total IS 'Cash portion of the sale total (split-aware).';
  COMMENT ON COLUMN sales_transactions.qr_sales_total IS 'Non-cash portion of the sale total (split-aware).';
