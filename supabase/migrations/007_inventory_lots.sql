-- ============================================================
-- INVENTORY LOTS (FIFO stock tracking)
-- ============================================================

CREATE TABLE inventory_lots (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity     NUMERIC(12,4) NOT NULL DEFAULT 0,
  unit_cost    NUMERIC(12,4) NOT NULL DEFAULT 0,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source       TEXT NOT NULL DEFAULT 'purchase_order'
               CHECK (source IN ('seed','purchase_order','production','adjustment','import')),
  reference_id UUID,
  location_id  UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_lots_tenant ON inventory_lots(tenant_id);
CREATE INDEX idx_inventory_lots_product ON inventory_lots(product_id);
CREATE INDEX idx_inventory_lots_received ON inventory_lots(received_at);

ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON inventory_lots
  FOR ALL
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());
