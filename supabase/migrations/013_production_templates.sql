-- ============================================================
-- PRODUCTION TEMPLATES
-- Quick-start presets for recurring production runs so operators
-- can produce a finished good with one click instead of re-entering
-- the finished good, quantity and location every time.
-- ============================================================

CREATE TABLE production_templates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  finished_good_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity          NUMERIC(12,4) NOT NULL DEFAULT 1,
  location_id       UUID REFERENCES locations(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_production_templates_tenant ON production_templates(tenant_id);
CREATE INDEX idx_production_templates_finished ON production_templates(finished_good_id);

ALTER TABLE production_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON production_templates
  USING (tenant_id = get_tenant_id());
