-- ============================================================
-- STRIPE BILLING — subscriptions, trials, grace period,
-- billing events (transaction log) and card-on-file metadata.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extend the subscription_status enum with 'past_due'
--    (used while a renewal payment is failing during the 5-day
--    grace window). Postgres requires ADD VALUE outside a
--    transaction block, so guard against re-runs.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'subscription_status' AND e.enumlabel = 'past_due'
  ) THEN
    ALTER TYPE subscription_status ADD VALUE 'past_due';
  END IF;
END
$$;

-- ------------------------------------------------------------
-- 2. New billing columns on tenants
-- ------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS billing_interval        TEXT,          -- 'month' | 'year'
  ADD COLUMN IF NOT EXISTS grace_period_ends_at    TIMESTAMPTZ,   -- when the 5-day grace window ends
  ADD COLUMN IF NOT EXISTS current_period_end      TIMESTAMPTZ,   -- next renewal date from Stripe
  ADD COLUMN IF NOT EXISTS cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_used_trial          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS card_brand              TEXT,
  ADD COLUMN IF NOT EXISTS card_last4              TEXT,
  ADD COLUMN IF NOT EXISTS card_exp_month          INT,
  ADD COLUMN IF NOT EXISTS card_exp_year           INT;

-- ------------------------------------------------------------
-- 3. billing_events — an append-only transaction / lifecycle log
--    for every Stripe event we act on. Powers the customer
--    transaction history and the superadmin monitor.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_events (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type     TEXT NOT NULL,          -- trial_started | subscription_started | payment_succeeded |
                                          -- payment_failed | card_expiring | subscription_renewed |
                                          -- subscription_cancelled | plan_changed | grace_started | subscription_ended
  title          TEXT NOT NULL,
  description    TEXT,
  amount         NUMERIC(12,2),          -- amount in major currency units (e.g. PHP)
  currency       TEXT,
  plan           subscription_plan,
  status         TEXT,                   -- succeeded | failed | pending | info
  stripe_event_id      TEXT,             -- for idempotency (unique when present)
  stripe_object_id     TEXT,             -- invoice / subscription / session id
  invoice_url          TEXT,             -- hosted invoice / receipt url
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_tenant   ON billing_events(tenant_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_events_stripe_event
  ON billing_events(stripe_event_id) WHERE stripe_event_id IS NOT NULL;

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own tenant's billing events.
DROP POLICY IF EXISTS billing_events_tenant_read ON billing_events;
CREATE POLICY billing_events_tenant_read ON billing_events
  FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    OR EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_memberships.auth_user_id = auth.uid()
        AND tenant_memberships.role = 'super_admin'
    )
  );

-- Writes come exclusively from the service role (webhook / server routes),
-- which bypasses RLS, so no INSERT policy is required for normal users.

-- ------------------------------------------------------------
-- 4. Allow the notifications.type column to carry billing types.
--    (Column is already free-form TEXT, so nothing to alter; this
--     is documented here for clarity.)
-- ------------------------------------------------------------
