-- ============================================================
-- CODENTRA — Deletion approval workflow
-- When a role that lacks direct-delete permission (e.g. Supervisor)
-- requests a deletion, the request is stored here until a Manager /
-- Admin / Super Admin approves or rejects it.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE deletion_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS deletion_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action          text NOT NULL,
  target_type     text NOT NULL,
  target_id       UUID NOT NULL,
  details         jsonb NOT NULL DEFAULT '{}',
  status          deletion_request_status NOT NULL DEFAULT 'pending',
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_tenant ON deletion_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(tenant_id, status);

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON deletion_requests USING (tenant_id = get_tenant_id());

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deletion_requests_updated_at ON deletion_requests;
CREATE TRIGGER trg_deletion_requests_updated_at
  BEFORE UPDATE ON deletion_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
