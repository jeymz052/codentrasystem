-- ============================================================
-- CODENTRA — guarantee optional tenant columns exist
-- ============================================================
-- The tenant row is upserted with every field from state.tenant, including
-- newer optional columns (payment_accounts, pos_store_locations, pos_stations)
-- and pos_location_id. If any of these were added after a database was first
-- deployed and their migration was never applied, the tenants upsert throws
-- and the WHOLE save aborts — so sales / transactions / stock disappear on
-- reload. This migration idempotently guarantees all of those columns exist
-- so the save always succeeds. It is safe to re-run.
-- ============================================================

-- Free-text POS store locations / stations (migrations 020, 023, 027).
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS pos_location_id TEXT;

DO $$
DECLARE
  fk_constraint text;
BEGIN
  SELECT c.conname INTO fk_constraint
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
  WHERE t.relname = 'tenants'
    AND a.attname = 'pos_location_id'
    AND c.contype = 'f';

  IF fk_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE tenants DROP CONSTRAINT IF EXISTS %I', fk_constraint);
  END IF;
END $$;

ALTER TABLE tenants
  ALTER COLUMN pos_location_id TYPE TEXT USING pos_location_id::text;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS pos_stations JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS pos_store_locations JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Dynamic payment accounts list (migration 025).
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS payment_accounts JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tenants.pos_location_id IS 'First POS store location (free text, mirrors pos_store_locations[0]). Separate from inventory locations.';
COMMENT ON COLUMN tenants.pos_stations IS 'Available POS stations / bays (e.g. ["Bay 1", "Register A"]).';
COMMENT ON COLUMN tenants.pos_store_locations IS 'Store location names for the POS (free-text, separate from inventory locations). The Open Shift dropdown only shows these.';
COMMENT ON COLUMN tenants.payment_accounts IS 'Dynamic list of e-wallet / bank accounts the POS can show a pay QR for.';
