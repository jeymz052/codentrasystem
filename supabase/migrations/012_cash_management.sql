-- ============================================================
-- CODENTRA — Cash Management: Shifts, Cash Movements, Refunds
-- ============================================================

-- Ensure required enums exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_status') THEN
    CREATE TYPE shift_status AS ENUM ('open', 'closed', 'voided');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE transaction_status AS ENUM ('draft', 'pending_approval', 'approved', 'ordered', 'partially_received', 'received', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('cash', 'gcash', 'card', 'bank_transfer', 'other');
  END IF;
END;
$$;

-- Update sales_transactions to support shift_id and refund tracking
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS shift_id UUID;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES users(id);
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS parent_transaction_id UUID;

CREATE INDEX IF NOT EXISTS idx_sales_shift_id ON sales_transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales_transactions(tenant_id, status);

-- ============================================================
-- CASH SHIFTS
-- ============================================================

CREATE TYPE cash_movement_kind AS ENUM ('cash_in', 'cash_out', 'cash_sale', 'refund_payout', 'denomination_adjustment');

CREATE TABLE cash_shifts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shift_code        TEXT NOT NULL,
  opened_by         UUID NOT NULL REFERENCES users(id),
  closed_by         UUID REFERENCES users(id),
  location_id       UUID REFERENCES locations(id),
  status            shift_status NOT NULL DEFAULT 'open',
  opening_float     NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_float     NUMERIC(12,2),
  expected_cash     NUMERIC(12,2),
  counted_cash      NUMERIC(12,2),
  cash_sales_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
  qr_sales_total    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_sales       NUMERIC(12,2) NOT NULL DEFAULT 0,
  variance_amount   NUMERIC(12,2),
  notes             TEXT,
  close_notes       TEXT,
  opened_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, shift_code)
);

-- ============================================================
-- CASH MOVEMENTS (cash in/out within a shift)
-- ============================================================

CREATE TABLE cash_movements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shift_id      UUID NOT NULL REFERENCES cash_shifts(id) ON DELETE CASCADE,
  kind          cash_movement_kind NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  note          TEXT,
  denominations JSONB,
  performed_by  UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_cash_shifts_tenant ON cash_shifts(tenant_id);
CREATE INDEX idx_cash_shifts_status ON cash_shifts(tenant_id, status);
CREATE INDEX idx_cash_shifts_opened_at ON cash_shifts(opened_at DESC);
CREATE INDEX idx_cash_movements_shift ON cash_movements(shift_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON cash_shifts USING (tenant_id = get_tenant_id());
CREATE POLICY tenant_isolation ON cash_movements USING (tenant_id = get_tenant_id());

-- ============================================================
-- TRIGGER — auto-update sales totals when status changes
-- ============================================================

CREATE OR REPLACE FUNCTION update_shift_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE cash_shifts
    SET cash_sales_total = cash_sales_total + COALESCE(NEW.total_amount, 0),
        total_sales = total_sales + COALESCE(NEW.total_amount, 0)
    WHERE id = NEW.shift_id;

    UPDATE cash_movements
    SET kind = 'cash_sale'::cash_movement_kind
    WHERE shift_id = NEW.shift_id
      AND kind NOT IN ('cash_in', 'cash_out', 'refund_payout', 'void_payout', 'denomination_adjustment');
  ELSIF NEW.status = 'refunded' OR NEW.status = 'voided' THEN
    -- Void / refund must NOT deduct the drawer's cash balance. The drawer's
    -- expected cash is derived (in computeShiftExpectedCash) from each
    -- transaction's status: only cash from COMPLETED sales counts, so a
    -- voided/refunded sale is simply excluded — its cash was never in the
    -- drawer to begin with and is returned to the customer. Previously this
    -- branch both subtracted the shift totals AND inserted a refund_payout
    -- movement, double-deducting the amount and corrupting the drawer balance.
    -- We no longer mutate the shift totals or add a payout movement here; the
    -- derived expected cash already handles voids/refunds correctly.
    NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_shift_totals
  AFTER INSERT OR UPDATE OF total_amount, status ON sales_transactions
  FOR EACH ROW
  WHEN (NEW.shift_id IS NOT NULL)
  EXECUTE FUNCTION update_shift_totals();

-- ============================================================
-- TRIGGER — updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cash_shifts_updated_at BEFORE UPDATE ON cash_shifts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEQUENCE for shift codes
-- ============================================================

CREATE SEQUENCE shift_number_seq START 1000;

-- ============================================================
-- FUNCTION — generate shift code
-- ============================================================

CREATE OR REPLACE FUNCTION generate_shift_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.shift_code IS NULL OR NEW.shift_code = '' THEN
    NEW.shift_code := 'SH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('shift_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shift_code BEFORE INSERT ON cash_shifts FOR EACH ROW EXECUTE FUNCTION generate_shift_code();
