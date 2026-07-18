-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'info',
  read          BOOLEAN NOT NULL DEFAULT FALSE,
  reference_id  UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user ON notifications(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON notifications USING (tenant_id = get_tenant_id());

CREATE POLICY user_notification_access ON notifications
  FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM tenant_memberships
        WHERE tenant_memberships.auth_user_id = auth.uid()
          AND tenant_memberships.role = 'super_admin'
      )
    )
  );

CREATE POLICY authenticated_insert_notification ON notifications
  FOR INSERT
  WITH CHECK (tenant_id = get_tenant_id());
