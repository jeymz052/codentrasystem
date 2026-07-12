-- ============================================================
-- 019 — Activate existing tenants (remove trial period)
-- ============================================================
-- Onboarding now creates tenants as 'active' immediately (no trial).
-- This migrates any tenant that was already created while the old
-- 'trial' default was in effect, so existing workspaces no longer
-- show a "Trial ends" state.
-- ============================================================

UPDATE tenants
SET subscription_status = 'active',
    trial_ends_at = NULL,
    subscription_ends_at = COALESCE(subscription_ends_at, created_at + INTERVAL '1 year')
WHERE subscription_status = 'trial';
