-- ============================================================
-- CODENTRA — Ensure staff roles exist on the user_role enum
-- The staff roles (supervisor, inventory_staff, sales_staff,
-- production_staff, purchasing_staff) were introduced in 021, but
-- on some databases the enum values were never committed, which
-- causes "invalid input value for enum user_role" when inviting or
-- re-sending invites for those roles. This migration guarantees the
-- values exist regardless of prior migration state.
--
-- ADD VALUE cannot be used twice for the same value, and running it
-- inside a single transaction requires a fresh subtransaction per
-- value, so we wrap each in its own block and guard with a lookup
-- against pg_enum.
-- ============================================================

DO $$
DECLARE
  v_value text;
BEGIN
  FOREACH v_value IN ARRAY ARRAY[
    'supervisor',
    'inventory_staff',
    'sales_staff',
    'production_staff',
    'purchasing_staff'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_type t
      JOIN pg_catalog.pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'user_role'
        AND e.enumlabel = v_value
    ) THEN
      BEGIN
        EXECUTE format('ALTER TYPE user_role ADD VALUE %L', v_value);
      EXCEPTION WHEN duplicate_object THEN
        -- Already added by a concurrent path; safe to ignore.
        NULL;
      END;
    END IF;
  END LOOP;
END;
$$;
