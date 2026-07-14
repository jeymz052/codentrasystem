-- ============================================================
-- 021 — Waste / Defect / Reject storage location
-- ============================================================
-- A dedicated "Waste / Defect / Reject" storage location is created
-- automatically (seeded) so written-off stock is physically moved there
-- instead of vanishing. Stock held in a location flagged is_waste_location
-- cannot be issued (transferred out) or sold at the POS.
-- ============================================================

ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_waste_location BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN locations.is_waste_location IS 'Designated Waste / Defect / Reject storage. Stock here cannot be issued or sold.';
