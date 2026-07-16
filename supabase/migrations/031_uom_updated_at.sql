-- Add missing updated_at column to units_of_measure so the settings
-- catalog CRUD (create/update) can persist rows. The update flow writes
-- an updated_at field which PostgREST rejected because the column was absent.
ALTER TABLE units_of_measure
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TRIGGER trg_units_of_measure_updated_at
  BEFORE UPDATE ON units_of_measure
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Clean up any duplicate abbreviations left behind by an interrupted seed
-- run (same tenant + abbreviation appearing more than once). Keep the
-- earliest row per (tenant_id, abbreviation); drop the rest.
DELETE FROM units_of_measure u
WHERE u.id NOT IN (
  SELECT DISTINCT ON (tenant_id, abbreviation) id
  FROM units_of_measure
  ORDER BY tenant_id, abbreviation, created_at, id
);
