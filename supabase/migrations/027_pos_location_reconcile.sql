  -- ============================================================
  -- CODENTRA — reconcile POS location columns
  -- ============================================================
  -- Earlier POS designs linked the store location to an inventory /
  -- storage location via a foreign key on tenants.pos_location_id.
  -- The current Settings UI stores free-text store names in
  -- pos_store_locations and mirrors the first one into pos_location_id.
  -- When pos_location_id is still a FK (uuid) to locations, the free-text
  -- upsert violates the constraint, the tenant save throws, and the
  -- configured POS locations / stations silently disappear.
  --
  -- This migration makes the schema compatible with the current code:
  --   1. Drop any foreign key on pos_location_id (old pre-select design).
  --   2. Coerce pos_location_id to nullable TEXT so free-text works.
  --   3. Guarantee pos_stations and pos_store_locations JSONB columns exist.
  -- It is safe to re-run on databases that were already migrated.
  -- ============================================================

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
    ADD COLUMN IF NOT EXISTS pos_location_id TEXT;

  ALTER TABLE tenants
    ALTER COLUMN pos_location_id TYPE TEXT USING pos_location_id::text;

  ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS pos_stations JSONB NOT NULL DEFAULT '[]'::jsonb;

  ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS pos_store_locations JSONB NOT NULL DEFAULT '[]'::jsonb;

  COMMENT ON COLUMN tenants.pos_location_id IS 'First POS store location (free text, mirrors pos_store_locations[0]). Separate from inventory locations.';
  COMMENT ON COLUMN tenants.pos_stations IS 'Available POS stations / bays (e.g. ["Bay 1", "Register A"]).';
  COMMENT ON COLUMN tenants.pos_store_locations IS 'Store location names for the POS (free-text, separate from inventory locations). The Open Shift dropdown only shows these.';
