-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  action            TEXT NOT NULL,
  target_type       TEXT NOT NULL DEFAULT 'system',
  target_id         UUID,
  details           JSONB DEFAULT '{}'::jsonb,
  performed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  performed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant   ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_performed ON audit_logs(performed_at DESC);
CREATE INDEX idx_audit_logs_action   ON audit_logs(action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON audit_logs
  USING (tenant_id = get_tenant_id());

CREATE POLICY superadmin_audit_access ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.auth_user_id = auth.uid()
        AND tenant_memberships.role = 'super_admin'
    )
  );

CREATE POLICY authenticated_insert_audit ON audit_logs
  FOR INSERT
  WITH CHECK (tenant_id = get_tenant_id());
