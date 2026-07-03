-- ============================================================
-- CODENTRA — Inventory Management System with POS
-- "Systems with Integrity"
-- Supabase Schema v1.0
-- Multi-tenant, subscription-based, flexible for any business
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE subscription_plan AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'suspended', 'trial');
CREATE TYPE business_type AS ENUM ('coffee_shop', 'manufacturing', 'convenience_store', 'restaurant', 'retail', 'pharmacy', 'general');
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'cashier');
CREATE TYPE order_status AS ENUM ('draft', 'pending_approval', 'approved', 'ordered', 'partially_received', 'received', 'cancelled');
CREATE TYPE movement_type AS ENUM ('inbound', 'outbound', 'adjustment', 'return', 'production');
CREATE TYPE alert_type AS ENUM ('low_stock', 'out_of_stock', 'overstock', 'expiry_warning');
CREATE TYPE alert_status AS ENUM ('open', 'acknowledged', 'resolved');
CREATE TYPE payment_method AS ENUM ('cash', 'gcash', 'card', 'bank_transfer', 'other');
CREATE TYPE transaction_status AS ENUM ('completed', 'voided', 'refunded');

-- ============================================================
-- TENANTS (each business that subscribes to Codentra)
-- ============================================================

CREATE TABLE tenants (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  business_type     business_type NOT NULL DEFAULT 'general',
  logo_url          TEXT,
  address           TEXT,
  phone             TEXT,
  email             TEXT,
  tax_id            TEXT,
  currency          TEXT NOT NULL DEFAULT 'PHP',
  timezone          TEXT NOT NULL DEFAULT 'Asia/Manila',
  billing_email     TEXT,

  -- Subscription
  plan              subscription_plan NOT NULL DEFAULT 'starter',
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at     TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  max_users         INT NOT NULL DEFAULT 3,
  max_products      INT NOT NULL DEFAULT 100,
  max_locations     INT NOT NULL DEFAULT 1,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id        TEXT,

  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TENANT MEMBERSHIPS (auth users can manage multiple tenants)
-- ============================================================

CREATE TABLE tenant_memberships (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  auth_user_id   UUID NOT NULL,
  role           user_role NOT NULL DEFAULT 'admin',
  is_default     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, auth_user_id)
);

-- ============================================================
-- SUBSCRIPTION PLANS (reference table)
-- ============================================================

CREATE TABLE subscription_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan            subscription_plan NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  price_monthly   NUMERIC(10,2) NOT NULL,
  price_yearly    NUMERIC(10,2) NOT NULL,
  max_users       INT NOT NULL,
  max_products    INT NOT NULL,
  max_locations   INT NOT NULL,
  features        JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subscription_plans (plan, name, price_monthly, price_yearly, max_users, max_products, max_locations, features) VALUES
  ('starter',      'Starter',      499,   4999,   3,   100,  1,  '["Inventory Management","POS","Basic Reports","Low Stock Alerts","1 Location","Up to 3 Users"]'),
  ('professional', 'Professional', 999,   9999,   10,  1000, 5,  '["Everything in Starter","Advanced Reports","Multi-Location","Purchase Orders","User Roles","Excel Import","Up to 10 Users"]'),
  ('enterprise',   'Enterprise',   2499,  24999,  999, 9999, 99, '["Everything in Professional","Unlimited Users","Unlimited Products","Unlimited Locations","Priority Support","Custom Branding","API Access"]');

-- ============================================================
-- USERS (linked to Supabase Auth)
-- ============================================================

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'cashier',
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UNITS OF MEASURE (flexible per tenant)
-- ============================================================

CREATE TABLE units_of_measure (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,        -- e.g. "kilogram", "bottle", "sachet"
  abbreviation TEXT NOT NULL,       -- e.g. "kg", "btl", "sct"
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, abbreviation)
);

-- Default UOMs seeded per business type via function below

-- ============================================================
-- CATEGORIES (flexible per tenant)
-- ============================================================

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#00D4AA',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

-- ============================================================
-- SUPPLIERS
-- ============================================================

CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  lead_days     INT NOT NULL DEFAULT 7,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOCATIONS / WAREHOUSES
-- ============================================================

CREATE TABLE locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  zone        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

-- ============================================================
-- PRODUCTS / ITEMS
-- ============================================================

CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_code           TEXT NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id         UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,
  uom_id              UUID REFERENCES units_of_measure(id) ON DELETE SET NULL,

  -- Stock
  quantity_on_hand    NUMERIC(12,4) NOT NULL DEFAULT 0,
  quantity_reserved   NUMERIC(12,4) NOT NULL DEFAULT 0,
  reorder_point       NUMERIC(12,4) NOT NULL DEFAULT 0,
  reorder_quantity    NUMERIC(12,4) NOT NULL DEFAULT 0,
  max_stock           NUMERIC(12,4),

  -- Pricing
  unit_cost           NUMERIC(12,2),
  selling_price       NUMERIC(12,2),

  -- Meta
  barcode             TEXT,
  image_url           TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  expiry_date         DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, item_code)
);

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================

CREATE TABLE stock_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type   movement_type NOT NULL,
  quantity        NUMERIC(12,4) NOT NULL,
  quantity_before NUMERIC(12,4) NOT NULL,
  quantity_after  NUMERIC(12,4) NOT NULL,
  reference_id    UUID,
  reference_type  TEXT,
  location_id     UUID REFERENCES locations(id),
  performed_by    UUID REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================

CREATE SEQUENCE po_number_seq START 1000;

CREATE TABLE purchase_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  po_number       TEXT NOT NULL,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  status          order_status NOT NULL DEFAULT 'draft',
  created_by      UUID REFERENCES users(id),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  expected_date   DATE,
  received_date   DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, po_number)
);

CREATE TABLE purchase_order_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id               UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_ordered    NUMERIC(12,4) NOT NULL,
  quantity_received   NUMERIC(12,4) NOT NULL DEFAULT 0,
  unit_cost           NUMERIC(12,2),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (po_id, product_id)
);

-- ============================================================
-- POS — SALES TRANSACTIONS
-- ============================================================

CREATE SEQUENCE receipt_number_seq START 1000;

CREATE TABLE sales_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_number  TEXT NOT NULL,
  cashier_id      UUID REFERENCES users(id),
  location_id     UUID REFERENCES locations(id),
  status          transaction_status NOT NULL DEFAULT 'completed',
  payment_method  payment_method NOT NULL DEFAULT 'cash',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_tendered NUMERIC(12,2),
  change_amount   NUMERIC(12,2),
  notes           TEXT,
  voided_by       UUID REFERENCES users(id),
  voided_at       TIMESTAMPTZ,
  void_reason     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, receipt_number)
);

CREATE TABLE sales_transaction_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id  UUID NOT NULL REFERENCES sales_transactions(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity        NUMERIC(12,4) NOT NULL,
  unit_price      NUMERIC(12,2) NOT NULL,
  unit_cost       NUMERIC(12,2),
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ALERTS
-- ============================================================

CREATE TABLE alerts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type        alert_type NOT NULL,
  status            alert_status NOT NULL DEFAULT 'open',
  message           TEXT NOT NULL,
  threshold         NUMERIC(12,4),
  current_qty       NUMERIC(12,4),
  acknowledged_by   UUID REFERENCES users(id),
  acknowledged_at   TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_products_tenant      ON products(tenant_id);
CREATE INDEX idx_products_category    ON products(category_id);
CREATE INDEX idx_products_item_code   ON products(tenant_id, item_code);
CREATE INDEX idx_movements_tenant     ON stock_movements(tenant_id);
CREATE INDEX idx_movements_product    ON stock_movements(product_id);
CREATE INDEX idx_movements_created    ON stock_movements(created_at DESC);
CREATE INDEX idx_alerts_tenant        ON alerts(tenant_id);
CREATE INDEX idx_alerts_status        ON alerts(tenant_id, status);
CREATE INDEX idx_sales_tenant         ON sales_transactions(tenant_id);
CREATE INDEX idx_sales_created        ON sales_transactions(created_at DESC);
CREATE INDEX idx_po_tenant            ON purchase_orders(tenant_id);
CREATE INDEX idx_users_tenant         ON users(tenant_id);

-- ============================================================
-- ROW LEVEL SECURITY (multi-tenant isolation)
-- ============================================================

ALTER TABLE tenants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE units_of_measure      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS policies — users can only see their own tenant's data
CREATE POLICY tenant_isolation ON products         USING (tenant_id = get_tenant_id());
CREATE POLICY tenant_isolation ON categories       USING (tenant_id = get_tenant_id());
CREATE POLICY tenant_isolation ON suppliers        USING (tenant_id = get_tenant_id());
CREATE POLICY tenant_isolation ON locations        USING (tenant_id = get_tenant_id());
CREATE POLICY tenant_isolation ON units_of_measure USING (tenant_id = get_tenant_id());
CREATE POLICY tenant_isolation ON stock_movements  USING (tenant_id = get_tenant_id());
CREATE POLICY tenant_isolation ON purchase_orders  USING (tenant_id = get_tenant_id());
CREATE POLICY tenant_isolation ON alerts           USING (tenant_id = get_tenant_id());
CREATE POLICY tenant_isolation ON sales_transactions USING (tenant_id = get_tenant_id());
CREATE POLICY tenant_isolation ON users            USING (tenant_id = get_tenant_id());

-- ============================================================
-- TRIGGERS — updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at   BEFORE UPDATE ON tenants   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated_at  BEFORE UPDATE ON products  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_po_updated_at        BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER — auto stock alert on quantity change
-- ============================================================

CREATE OR REPLACE FUNCTION handle_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_on_hand <= NEW.reorder_point AND OLD.quantity_on_hand > NEW.reorder_point THEN
    INSERT INTO alerts (tenant_id, product_id, alert_type, message, threshold, current_qty)
    VALUES (
      NEW.tenant_id,
      NEW.id,
      CASE WHEN NEW.quantity_on_hand = 0 THEN 'out_of_stock'::alert_type ELSE 'low_stock'::alert_type END,
      CASE WHEN NEW.quantity_on_hand = 0
        THEN NEW.name || ' is OUT OF STOCK'
        ELSE NEW.name || ' is below reorder point (' || NEW.quantity_on_hand || ' remaining)'
      END,
      NEW.reorder_point,
      NEW.quantity_on_hand
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_alert
  AFTER UPDATE OF quantity_on_hand ON products
  FOR EACH ROW EXECUTE FUNCTION handle_stock_alert();

-- ============================================================
-- TRIGGER — auto PO number
-- ============================================================

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('po_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_po_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION generate_po_number();

-- ============================================================
-- TRIGGER — auto receipt number
-- ============================================================

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := 'REC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('receipt_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_receipt_number
  BEFORE INSERT ON sales_transactions
  FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();

-- ============================================================
-- FUNCTION — seed UOMs and categories per business type
-- ============================================================

CREATE OR REPLACE FUNCTION seed_tenant_defaults(p_tenant_id UUID, p_business_type business_type)
RETURNS VOID AS $$
BEGIN
  -- Common UOMs for all business types
  INSERT INTO units_of_measure (tenant_id, name, abbreviation) VALUES
    (p_tenant_id, 'Piece',       'pcs'),
    (p_tenant_id, 'Box',         'box'),
    (p_tenant_id, 'Pack',        'pack'),
    (p_tenant_id, 'Kilogram',    'kg'),
    (p_tenant_id, 'Gram',        'g'),
    (p_tenant_id, 'Liter',       'L'),
    (p_tenant_id, 'Milliliter',  'ml'),
    (p_tenant_id, 'Bottle',      'btl'),
    (p_tenant_id, 'Can',         'can'),
    (p_tenant_id, 'Sachet',      'sct'),
    (p_tenant_id, 'Roll',        'roll'),
    (p_tenant_id, 'Sheet',       'sheet'),
    (p_tenant_id, 'Sack',        'sack'),
    (p_tenant_id, 'Bundle',      'bundle'),
    (p_tenant_id, 'Card',        'card'),
    (p_tenant_id, 'Dozen',       'doz')
  ON CONFLICT (tenant_id, abbreviation) DO NOTHING;

  -- Business-type specific categories
  IF p_business_type = 'coffee_shop' THEN
    INSERT INTO categories (tenant_id, name, color) VALUES
      (p_tenant_id, 'Coffee Beans', '#6B3A2A'),
      (p_tenant_id, 'Tea',          '#4A7C59'),
      (p_tenant_id, 'Dairy',        '#F5F5DC'),
      (p_tenant_id, 'Flavoring',    '#C8A2C8'),
      (p_tenant_id, 'Bakery',       '#D4A574'),
      (p_tenant_id, 'Ingredients',  '#F59E0B'),
      (p_tenant_id, 'Packaging',    '#6366F1'),
      (p_tenant_id, 'Beverage',     '#00D4AA'),
      (p_tenant_id, 'Food',         '#EF4444');

  ELSIF p_business_type = 'manufacturing' THEN
    INSERT INTO categories (tenant_id, name, color) VALUES
      (p_tenant_id, 'Raw Material', '#8B5CF6'),
      (p_tenant_id, 'Component',    '#6366F1'),
      (p_tenant_id, 'Material',     '#F59E0B'),
      (p_tenant_id, 'Product',      '#00D4AA'),
      (p_tenant_id, 'Packaging',    '#10B981'),
      (p_tenant_id, 'Consumable',   '#EF4444');

  ELSIF p_business_type = 'convenience_store' THEN
    INSERT INTO categories (tenant_id, name, color) VALUES
      (p_tenant_id, 'Beverage',     '#00D4AA'),
      (p_tenant_id, 'Food',         '#F59E0B'),
      (p_tenant_id, 'Personal Care','#EC4899'),
      (p_tenant_id, 'Household',    '#6366F1'),
      (p_tenant_id, 'Condiment',    '#8B5CF6'),
      (p_tenant_id, 'Staple',       '#D97706'),
      (p_tenant_id, 'Bakery',       '#D4A574'),
      (p_tenant_id, 'Miscellaneous','#6B7280'),
      (p_tenant_id, 'Telecom',      '#0EA5E9');

  ELSIF p_business_type = 'restaurant' THEN
    INSERT INTO categories (tenant_id, name, color) VALUES
      (p_tenant_id, 'Protein',      '#EF4444'),
      (p_tenant_id, 'Vegetable',    '#10B981'),
      (p_tenant_id, 'Condiment',    '#F59E0B'),
      (p_tenant_id, 'Grain',        '#D97706'),
      (p_tenant_id, 'Dairy',        '#F5F5DC'),
      (p_tenant_id, 'Beverage',     '#00D4AA'),
      (p_tenant_id, 'Packaging',    '#6366F1');

  ELSE
    -- General / Retail / Pharmacy / Custom
    INSERT INTO categories (tenant_id, name, color) VALUES
      (p_tenant_id, 'General',      '#6B7280'),
      (p_tenant_id, 'Product',      '#00D4AA'),
      (p_tenant_id, 'Supply',       '#6366F1'),
      (p_tenant_id, 'Packaging',    '#F59E0B');
  END IF;

  -- Default location
  INSERT INTO locations (tenant_id, code, name, zone)
  VALUES (p_tenant_id, 'MAIN', 'Main Storage', 'General');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION — get dashboard stats for a tenant
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_tenant_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_products',     (SELECT COUNT(*) FROM products WHERE tenant_id = p_tenant_id AND is_active = true),
    'total_value',        (SELECT COALESCE(SUM(quantity_on_hand * unit_cost), 0) FROM products WHERE tenant_id = p_tenant_id AND is_active = true),
    'low_stock_count',    (SELECT COUNT(*) FROM products WHERE tenant_id = p_tenant_id AND is_active = true AND quantity_on_hand > 0 AND quantity_on_hand <= reorder_point),
    'out_of_stock_count', (SELECT COUNT(*) FROM products WHERE tenant_id = p_tenant_id AND is_active = true AND quantity_on_hand = 0),
    'open_alerts',        (SELECT COUNT(*) FROM alerts WHERE tenant_id = p_tenant_id AND status = 'open'),
    'pending_orders',     (SELECT COUNT(*) FROM purchase_orders WHERE tenant_id = p_tenant_id AND status IN ('pending_approval','approved','ordered')),
    'sales_today',        (SELECT COALESCE(SUM(total_amount), 0) FROM sales_transactions WHERE tenant_id = p_tenant_id AND status = 'completed' AND DATE(created_at) = CURRENT_DATE),
    'transactions_today', (SELECT COUNT(*) FROM sales_transactions WHERE tenant_id = p_tenant_id AND status = 'completed' AND DATE(created_at) = CURRENT_DATE)
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION — process a sale (atomic: insert tx + deduct stock)
-- ============================================================

CREATE OR REPLACE FUNCTION process_sale(
  p_tenant_id       UUID,
  p_cashier_id      UUID,
  p_location_id     UUID,
  p_payment_method  payment_method,
  p_amount_tendered NUMERIC,
  p_items           JSONB,  -- [{product_id, quantity, unit_price, unit_cost, discount}]
  p_notes           TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_tx_id       UUID;
  v_subtotal    NUMERIC := 0;
  v_discount    NUMERIC := 0;
  v_total       NUMERIC := 0;
  v_item        JSONB;
  v_item_sub    NUMERIC;
  v_qty_before  NUMERIC;
BEGIN
  -- Calculate totals
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_item_sub := (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC - COALESCE((v_item->>'discount')::NUMERIC, 0);
    v_subtotal := v_subtotal + v_item_sub;
    v_discount := v_discount + COALESCE((v_item->>'discount')::NUMERIC, 0);
  END LOOP;
  v_total := v_subtotal;

  -- Create transaction header
  INSERT INTO sales_transactions (tenant_id, receipt_number, cashier_id, location_id, payment_method, subtotal, discount_amount, total_amount, amount_tendered, change_amount, notes)
  VALUES (p_tenant_id, '', p_cashier_id, p_location_id, p_payment_method, v_subtotal, v_discount, v_total, p_amount_tendered, GREATEST(p_amount_tendered - v_total, 0), p_notes)
  RETURNING id INTO v_tx_id;

  -- Insert items and deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    -- Insert line item
    INSERT INTO sales_transaction_items (transaction_id, product_id, quantity, unit_price, unit_cost, discount, subtotal)
    VALUES (
      v_tx_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'unit_cost')::NUMERIC,
      COALESCE((v_item->>'discount')::NUMERIC, 0),
      (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC - COALESCE((v_item->>'discount')::NUMERIC, 0)
    );

    -- Get qty before
    SELECT quantity_on_hand INTO v_qty_before FROM products WHERE id = (v_item->>'product_id')::UUID;

    -- Deduct stock
    UPDATE products
    SET quantity_on_hand = quantity_on_hand - (v_item->>'quantity')::NUMERIC
    WHERE id = (v_item->>'product_id')::UUID AND tenant_id = p_tenant_id;

    -- Log movement
    INSERT INTO stock_movements (tenant_id, product_id, movement_type, quantity, quantity_before, quantity_after, reference_id, reference_type, location_id, performed_by)
    VALUES (
      p_tenant_id,
      (v_item->>'product_id')::UUID,
      'outbound',
      (v_item->>'quantity')::NUMERIC,
      v_qty_before,
      v_qty_before - (v_item->>'quantity')::NUMERIC,
      v_tx_id,
      'sale',
      p_location_id,
      p_cashier_id
    );
  END LOOP;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
