-- Add missing updated_at columns to locations and categories so the
-- settings catalog CRUD (update) can persist rows. The update flows write an
-- updated_at field which PostgREST rejected because the columns were absent
-- (same class of bug as units_of_measure in 031).
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TRIGGER IF NOT EXISTS trg_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TRIGGER IF NOT EXISTS trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
