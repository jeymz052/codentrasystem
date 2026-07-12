-- ============================================================
-- 008 — Seed demo tenant with stock movement history
-- ============================================================
-- The Stock Movement feature reads from `stock_movements`. On a
-- real Supabase instance the table is empty (or holds leftover
-- test movements) and the view shows "no movement at all" / 0 for
-- every type. This migration seeds a coherent demo dataset so the
-- feature has data to display and verify.
--
-- Idempotent & safe to re-run:
--   * demo reference data / products are inserted only when missing
--     (ON CONFLICT DO NOTHING / NOT EXISTS guard)
--   * the movement history is added only once, guarded by a
--     `reference_type = 'seed'` marker
--   * it NEVER deletes existing rows, so prior real movements and
--     the user's own products are preserved
--
-- To wipe the ledger for a totally clean demo slate first run:
--   DELETE FROM stock_movements WHERE tenant_id = '<tenant id>';
-- then re-run this migration.
-- ============================================================

DO $$
DECLARE
  v_tenant UUID;
  v_coffee UUID; v_dairy UUID; v_ingredient UUID; v_flavor UUID; v_tea UUID; v_bakery UUID;
  v_kg UUID; v_liter UUID; v_bottle UUID; v_box UUID; v_pcs UUID; v_pack UUID;
  v_beanco UUID; v_freshdairy UUID; v_sweetcorp UUID; v_chocomix UUID; v_teahouse UUID; v_bakeco UUID;
  v_main UUID; v_cold UUID; v_bulk UUID; v_shelfa UUID; v_shelfb UUID;
  v_espresso UUID; v_milk UUID; v_sugar UUID; v_syrup UUID; v_tealeaves UUID; v_croissant UUID; v_hotchoc UUID;
  v_base TIMESTAMPTZ := '2026-07-07T08:00:00+00'::timestamptz;
BEGIN
  -- Reuse the first tenant (app reads the oldest), else create a demo workspace.
  SELECT id INTO v_tenant FROM tenants ORDER BY created_at ASC LIMIT 1;
  IF v_tenant IS NULL THEN
    INSERT INTO tenants (name, business_type, currency, plan, subscription_status)
    VALUES ('Demo Workspace', 'coffee_shop', 'PHP', 'starter', 'trial')
    RETURNING id INTO v_tenant;
  END IF;

  -- ----- Reference data (insert only when missing) -----
  INSERT INTO categories (tenant_id, name, color)
    VALUES
      (v_tenant, 'Coffee Beans', '#3B82F6'),
      (v_tenant, 'Dairy',        '#10B981'),
      (v_tenant, 'Ingredients',  '#8B5CF6'),
      (v_tenant, 'Flavoring',    '#F59E0B'),
      (v_tenant, 'Tea',          '#0F766E'),
      (v_tenant, 'Bakery',       '#F97316')
    ON CONFLICT (tenant_id, name) DO NOTHING;

  INSERT INTO units_of_measure (tenant_id, name, abbreviation)
    VALUES
      (v_tenant, 'Kilogram', 'kg'),
      (v_tenant, 'Liter',    'liter'),
      (v_tenant, 'Bottle',   'bottle'),
      (v_tenant, 'Box',      'box'),
      (v_tenant, 'Piece',    'pcs'),
      (v_tenant, 'Pack',     'pack')
    ON CONFLICT (tenant_id, abbreviation) DO NOTHING;

  INSERT INTO locations (tenant_id, code, name, zone)
    VALUES
      (v_tenant, 'MAIN',    'Main Storage', 'Backroom'),
      (v_tenant, 'COLD',    'Cold Storage', 'Chiller'),
      (v_tenant, 'BULK',    'Bulk Storage', 'Warehouse'),
      (v_tenant, 'SHELF-A', 'Shelf A',      'Front rack'),
      (v_tenant, 'SHELF-B', 'Shelf B',      'Front rack')
    ON CONFLICT (tenant_id, code) DO NOTHING;

  INSERT INTO suppliers (tenant_id, name, contact_name, email, phone, address, lead_days)
    SELECT v_tenant, 'BeanCo',     'Ana Cruz',      'orders@beanco.example',     '555-0101', '1 Coffee Lane',   3 WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE tenant_id = v_tenant AND name = 'BeanCo');
  INSERT INTO suppliers (tenant_id, name, contact_name, email, phone, address, lead_days)
    SELECT v_tenant, 'FreshDairy', 'Luis Santos',   'sales@freshdairy.example', '555-0102', '2 Dairy Road',    2 WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE tenant_id = v_tenant AND name = 'FreshDairy');
  INSERT INTO suppliers (tenant_id, name, contact_name, email, phone, address, lead_days)
    SELECT v_tenant, 'SweetCorp',  'Maya Lim',      'hello@sweetcorp.example',  '555-0103', '3 Sweet Street',  4 WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE tenant_id = v_tenant AND name = 'SweetCorp');
  INSERT INTO suppliers (tenant_id, name, contact_name, email, phone, address, lead_days)
    SELECT v_tenant, 'ChocoMix',   'Rex Velasco',   'support@chocomix.example', '555-0104', '4 Cocoa Avenue',  5 WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE tenant_id = v_tenant AND name = 'ChocoMix');
  INSERT INTO suppliers (tenant_id, name, contact_name, email, phone, address, lead_days)
    SELECT v_tenant, 'TeaHouse',   'Nina Flores',   'orders@teahouse.example',  '555-0105', '5 Leaf Blvd',     3 WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE tenant_id = v_tenant AND name = 'TeaHouse');
  INSERT INTO suppliers (tenant_id, name, contact_name, email, phone, address, lead_days)
    SELECT v_tenant, 'BakeCo',     'Paolo Reyes',   'sales@bakeco.example',     '555-0106', '6 Oven Drive',    2 WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE tenant_id = v_tenant AND name = 'BakeCo');

  -- ----- Resolve reference ids -----
  SELECT id INTO v_coffee     FROM categories WHERE tenant_id = v_tenant AND name = 'Coffee Beans';
  SELECT id INTO v_dairy      FROM categories WHERE tenant_id = v_tenant AND name = 'Dairy';
  SELECT id INTO v_ingredient FROM categories WHERE tenant_id = v_tenant AND name = 'Ingredients';
  SELECT id INTO v_flavor     FROM categories WHERE tenant_id = v_tenant AND name = 'Flavoring';
  SELECT id INTO v_tea        FROM categories WHERE tenant_id = v_tenant AND name = 'Tea';
  SELECT id INTO v_bakery     FROM categories WHERE tenant_id = v_tenant AND name = 'Bakery';

  SELECT id INTO v_kg     FROM units_of_measure WHERE tenant_id = v_tenant AND abbreviation = 'kg';
  SELECT id INTO v_liter  FROM units_of_measure WHERE tenant_id = v_tenant AND abbreviation = 'liter';
  SELECT id INTO v_bottle FROM units_of_measure WHERE tenant_id = v_tenant AND abbreviation = 'bottle';
  SELECT id INTO v_box    FROM units_of_measure WHERE tenant_id = v_tenant AND abbreviation = 'box';
  SELECT id INTO v_pcs    FROM units_of_measure WHERE tenant_id = v_tenant AND abbreviation = 'pcs';
  SELECT id INTO v_pack   FROM units_of_measure WHERE tenant_id = v_tenant AND abbreviation = 'pack';

  SELECT id INTO v_beanco     FROM suppliers WHERE tenant_id = v_tenant AND name = 'BeanCo';
  SELECT id INTO v_freshdairy FROM suppliers WHERE tenant_id = v_tenant AND name = 'FreshDairy';
  SELECT id INTO v_sweetcorp  FROM suppliers WHERE tenant_id = v_tenant AND name = 'SweetCorp';
  SELECT id INTO v_chocomix   FROM suppliers WHERE tenant_id = v_tenant AND name = 'ChocoMix';
  SELECT id INTO v_teahouse   FROM suppliers WHERE tenant_id = v_tenant AND name = 'TeaHouse';
  SELECT id INTO v_bakeco     FROM suppliers WHERE tenant_id = v_tenant AND name = 'BakeCo';

  SELECT id INTO v_main   FROM locations WHERE tenant_id = v_tenant AND code = 'MAIN';
  SELECT id INTO v_cold   FROM locations WHERE tenant_id = v_tenant AND code = 'COLD';
  SELECT id INTO v_bulk   FROM locations WHERE tenant_id = v_tenant AND code = 'BULK';
  SELECT id INTO v_shelfa FROM locations WHERE tenant_id = v_tenant AND code = 'SHELF-A';
  SELECT id INTO v_shelfb FROM locations WHERE tenant_id = v_tenant AND code = 'SHELF-B';

  -- ----- Products (insert only when missing) -----
  INSERT INTO products (tenant_id, item_code, name, description, category_id, supplier_id, location_id, uom_id, quantity_on_hand, reorder_point, reorder_quantity, unit_cost, selling_price)
    VALUES
      (v_tenant, 'COF001', 'Espresso Beans',       'House espresso blend',  v_coffee,     v_beanco,     v_main,   v_kg,    20, 5,  10, 500, 800),
      (v_tenant, 'COF003', 'Milk',                 'Fresh dairy milk',      v_dairy,      v_freshdairy, v_cold,   v_liter, 45, 10, 20, 60,  90),
      (v_tenant, 'COF004', 'Sugar',                'Granulated white sugar',v_ingredient, v_sweetcorp,  v_bulk,   v_kg,    33, 5,  10, 40,  70),
      (v_tenant, 'COF005', 'Chocolate Syrup',      'Topping syrup',         v_flavor,     v_chocomix,   v_shelfa, v_bottle,18, 5,  10, 120, 180),
      (v_tenant, 'COF006', 'Tea Leaves',           'Premium tea leaves',    v_tea,        v_teahouse,   v_main,   v_box,   12, 3,  8,  200, 350),
      (v_tenant, 'COF007', 'Pastry Croissant',     'Fresh bakery item',     v_bakery,     v_bakeco,     v_shelfb, v_pcs,   40, 10, 20, 30,  60),
      (v_tenant, 'COF020', 'Hot Chocolate Powder', 'Powder for hot drinks', v_flavor,     v_chocomix,   v_bulk,   v_pack,   6, 3,  6,  150, 250)
    ON CONFLICT (tenant_id, item_code) DO NOTHING;

  SELECT id INTO v_espresso  FROM products WHERE tenant_id = v_tenant AND item_code = 'COF001';
  SELECT id INTO v_milk      FROM products WHERE tenant_id = v_tenant AND item_code = 'COF003';
  SELECT id INTO v_sugar     FROM products WHERE tenant_id = v_tenant AND item_code = 'COF004';
  SELECT id INTO v_syrup     FROM products WHERE tenant_id = v_tenant AND item_code = 'COF005';
  SELECT id INTO v_tealeaves FROM products WHERE tenant_id = v_tenant AND item_code = 'COF006';
  SELECT id INTO v_croissant FROM products WHERE tenant_id = v_tenant AND item_code = 'COF007';
  SELECT id INTO v_hotchoc   FROM products WHERE tenant_id = v_tenant AND item_code = 'COF020';

  -- ----- FIFO inventory lots (back the demo products if they have none) -----
  INSERT INTO inventory_lots (tenant_id, product_id, quantity, unit_cost, received_at, source, reference_id, location_id)
    SELECT v_tenant, p.id, p.quantity_on_hand, COALESCE(p.unit_cost, 0), NOW(), 'seed', NULL, p.location_id
    FROM products p
    WHERE p.tenant_id = v_tenant
      AND p.item_code IN ('COF001','COF003','COF004','COF005','COF006','COF007','COF020')
      AND NOT EXISTS (SELECT 1 FROM inventory_lots l WHERE l.product_id = p.id);

  -- ----- Stock movement history (all four types) — added once -----
  INSERT INTO stock_movements (tenant_id, product_id, movement_type,  d, quantity_before, quantity_after, reference_id, reference_type, location_id, notes, created_at)
    SELECT v_tenant, t.product_id, t.movement_type, t.quantity, t.quantity_before, t.quantity_after, NULL, t.reference_type, t.location_id, t.notes, t.created_at
    FROM (VALUES
      (v_espresso,  'inbound', 20, 0,  20, 'seed',              v_main, 'Opening stock seeded',        v_base + interval '50 min'),
      (v_milk,      'inbound', 50, 0,  50, 'purchase_order',    v_cold, 'Supplier delivery received',  v_base + interval '51 min'),
      (v_milk,      'outbound', 5, 50, 45, 'sales_transaction', v_cold, 'Sale processed via POS',      v_base + interval '61 min'),
      (v_sugar,     'adjustment', 3, 30, 33, 'inventory_adjustment', v_bulk, 'Cycle count correction', v_base + interval '71 min'),
      (v_hotchoc,   'production', 6, 0,  6,  'production_batch', v_bulk, 'Finished goods production',   v_base + interval '81 min')
    ) AS t(product_id, movement_type, quantity, quantity_before, quantity_after, reference_type, location_id, notes, created_at)
    WHERE NOT EXISTS (SELECT 1 FROM stock_movements WHERE tenant_id = v_tenant AND reference_type = 'seed');
END $$;
