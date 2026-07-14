-- ============================================================
-- CODENTRA — POS store locations on tenants
-- ============================================================
-- Lets Settings define a list of store locations the POS can
-- use (separate from inventory / warehouse locations), mirroring
-- how pos_stations works. The Open Shift dropdown only shows the
-- locations configured here.
-- ============================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pos_store_locations JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tenants.pos_store_locations IS 'Store location names for the POS (free-text, separate from inventory locations). The Open Shift dropdown only shows these.';
