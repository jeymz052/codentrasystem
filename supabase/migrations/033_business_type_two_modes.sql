-- Reduce business_type to the two operating modes the product actually
-- supports: 'retail' (Buy & Sell) and 'manufacturing' (Production).
-- Coffee shop / convenience store / restaurant / pharmacy / general are no
-- longer used anywhere in the app.

-- 1) Any existing rows using the removed labels are coerced to 'retail'
--    (the neutral Buy & Sell mode) before we drop those enum values.
UPDATE tenants
SET business_type = 'retail'
WHERE business_type NOT IN ('retail', 'manufacturing');

-- 2) Recreate the enum without the unused labels.
ALTER TYPE business_type RENAME TO business_type_old;

CREATE TYPE business_type AS ENUM ('retail', 'manufacturing');

ALTER TABLE tenants
  ALTER COLUMN business_type TYPE business_type
  USING (business_type::text::business_type);

DROP TYPE business_type_old;

-- 3) Rewrite seed_tenant_defaults to only branch on the two modes.
CREATE OR REPLACE FUNCTION seed_tenant_defaults(p_tenant_id UUID, p_business_type business_type)
RETURNS VOID AS $$
BEGIN
  -- Common UOMs for all business types
  INSERT INTO units_of_measure (tenant_id, name, abbreviation) VALUES
    (p_tenant_id, 'Piece',       'pcs'),
    (p_tenant_id, 'Box',         'box'),
    (p_tenant_id, 'Pack',        'pack'),
    (p_tenant_id, 'Kilogram',    'kg'),
    (p_tenant_id, 'Gram',        'g'),
    (p_tenant_id, 'Liter',       'L'),
    (p_tenant_id, 'Milliliter',  'ml'),
    (p_tenant_id, 'Bottle',      'btl'),
    (p_tenant_id, 'Can',         'can'),
    (p_tenant_id, 'Sachet',      'sct'),
    (p_tenant_id, 'Roll',        'roll'),
    (p_tenant_id, 'Sheet',       'sheet'),
    (p_tenant_id, 'Sack',        'sack'),
    (p_tenant_id, 'Bundle',      'bundle'),
    (p_tenant_id, 'Card',        'card'),
    (p_tenant_id, 'Dozen',       'doz')
  ON CONFLICT (tenant_id, abbreviation) DO NOTHING;

  IF p_business_type = 'manufacturing' THEN
    INSERT INTO categories (tenant_id, name, color) VALUES
      (p_tenant_id, 'Raw Material', '#8B5CF6'),
      (p_tenant_id, 'Component',    '#6366F1'),
      (p_tenant_id, 'Material',     '#F59E0B'),
      (p_tenant_id, 'Product',      '#00D4AA'),
      (p_tenant_id, 'Packaging',    '#10B981'),
      (p_tenant_id, 'Consumable',   '#EF4444');
  ELSE
    -- retail / Buy & Sell
    INSERT INTO categories (tenant_id, name, color) VALUES
      (p_tenant_id, 'General',      '#6B7280'),
      (p_tenant_id, 'Product',      '#00D4AA'),
      (p_tenant_id, 'Supply',       '#6366F1'),
      (p_tenant_id, 'Packaging',    '#F59E0B');
  END IF;

  -- Default location
  INSERT INTO locations (tenant_id, code, name, zone)
  VALUES (p_tenant_id, 'MAIN', 'Main Storage', 'General');
END;
$$ LANGUAGE plpgsql;
