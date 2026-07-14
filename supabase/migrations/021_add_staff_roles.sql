-- ============================================================
-- CODENTRA — Additional staff roles
-- Adds granular, department-scoped roles alongside the existing
-- super_admin / admin / manager / cashier roles.
--   supervisor       — same scope as manager, but record deletions
--                      require manager approval (cannot delete directly)
--   inventory_staff  — inventory + stock movement access
--   sales_staff      — point-of-sale / cashier-equivalent access
--   production_staff — production (planning & production control) access
--   purchasing_staff — purchase order + supplier access
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'inventory_staff';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_staff';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'production_staff';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'purchasing_staff';
