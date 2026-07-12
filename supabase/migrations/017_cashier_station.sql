-- ============================================================
-- CODENTRA — Cashier station / bay tracking on shifts
-- ============================================================

ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS station TEXT;

COMMENT ON COLUMN cash_shifts.station IS 'Register/bay identifier the cashier is working from (e.g. "Bay 1", "Register A").';
