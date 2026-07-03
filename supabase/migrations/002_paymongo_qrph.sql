-- Add QR Ph support for POS and track external payment references.

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'qr_ph';

ALTER TABLE sales_transactions
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_payment_reference
  ON sales_transactions(payment_reference);

ALTER TABLE sales_transactions
  ALTER COLUMN payment_provider SET DEFAULT 'manual';

