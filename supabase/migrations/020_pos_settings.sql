-- ============================================================
-- CODENTRA — POS settings on tenants
-- ============================================================
-- Add dedicated POS store location and station list so the
-- Point of Sale can use a location that is separate from the
-- inventory / warehouse locations, and so stations/bays are
-- defined centrally in Settings instead of free-text input.
-- ============================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pos_location_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pos_stations JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tenants.pos_location_id IS 'Dedicated store / POS location for sales (separate from inventory locations).';
COMMENT ON COLUMN tenants.pos_stations IS 'Available POS stations / bays (e.g. ["Bay 1", "Register A"]).';
