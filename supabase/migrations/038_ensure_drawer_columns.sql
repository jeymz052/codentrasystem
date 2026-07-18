-- CODENTRA — ensure drawer-balance columns and realtime wiring exist.
-- Idempotent safety migration: guarantees the sales_transactions cash-split
-- columns and the cash_movement_kind void_payout value are present on the
-- remote database. These drive the POS drawer balance (cash from completed
-- sales). If they were missing remotely, a sale would show in the drawer
-- optimistically but vanish after the next refresh once the row is reloaded
-- without cash_sales_total.

-- 1) Cash portion columns on sales transactions (split-aware drawer math).
ALTER TABLE sales_transactions
  ADD COLUMN IF NOT EXISTS split_payments JSONB;

ALTER TABLE sales_transactions
  ADD COLUMN IF NOT EXISTS cash_sales_total NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE sales_transactions
  ADD COLUMN IF NOT EXISTS qr_sales_total NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 2) Distinct void payout kind for the cash movements ledger.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'cash_movement_kind' AND e.enumlabel = 'void_payout'
  ) THEN
    ALTER TYPE cash_movement_kind ADD VALUE 'void_payout';
  END IF;
END $$;

-- 3) Make sure realtime is wired for the tables the POS reflects instantly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'deletion_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deletion_requests;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sales_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_transactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cash_shifts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_shifts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  END IF;
END $$;
