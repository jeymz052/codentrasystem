-- ============================================================
-- PRODUCT RECIPES (Bill of Materials)
-- ============================================================

CREATE TABLE product_recipes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  finished_good_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_per_unit NUMERIC(12,4) NOT NULL,
  uom_id            UUID REFERENCES units_of_measure(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, finished_good_id, ingredient_id)
);

CREATE INDEX idx_product_recipes_tenant ON product_recipes(tenant_id);
CREATE INDEX idx_product_recipes_finished ON product_recipes(finished_good_id);
CREATE INDEX idx_product_recipes_ingredient ON product_recipes(ingredient_id);

ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON product_recipes
  USING (tenant_id = get_tenant_id());
