-- ============================================================
-- 010 — Store payment accounts + direct payment methods
-- ============================================================
-- Extend the payment_method enum to cover the direct/store
-- account methods (GCash, Maya, BDO, Maribank) and PayMongo QR Ph,
-- which already exist in the app but were missing from the DB enum.
-- Safe to re-run (IF NOT EXISTS guards).
-- ============================================================

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'qr_ph';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'maya';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'bdo';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'maribank';

-- Store-owned payment accounts so the POS can display "Scan this to pay".
-- Account = the store's GCash number / Maya ID / bank account; qr_url = an
-- uploaded QR image URL the customer scans.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gcash_account     TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gcash_qr_url      TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS maya_account      TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS maya_qr_url       TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bdo_account       TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bdo_qr_url        TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS maribank_account  TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS maribank_qr_url   TEXT;
