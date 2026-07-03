-- Persist pending QR Ph sales so PayMongo webhooks can finalize them server-side.

CREATE TABLE IF NOT EXISTS paymongo_qr_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cashier_id          UUID REFERENCES users(id),
  location_id         UUID REFERENCES locations(id),
  receipt_number      TEXT NOT NULL,
  intent_id           TEXT UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending',
  amount              NUMERIC(12,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'PHP',
  payment_provider    TEXT NOT NULL DEFAULT 'paymongo',
  payment_reference   TEXT, 
  notes               TEXT,
  items               JSONB NOT NULL DEFAULT '[]',
  transaction_id      UUID REFERENCES sales_transactions(id),
  qr_image_url        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_paymongo_qr_sessions_tenant ON paymongo_qr_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_paymongo_qr_sessions_intent ON paymongo_qr_sessions(intent_id);
CREATE INDEX IF NOT EXISTS idx_paymongo_qr_sessions_status ON paymongo_qr_sessions(status);
