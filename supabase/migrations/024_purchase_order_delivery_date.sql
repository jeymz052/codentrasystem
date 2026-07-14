  ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS delivery_date DATE;
