   ALTER TABLE purchase_orders
     ADD COLUMN IF NOT EXISTS delivery_date DATE;

   CREATE OR REPLACE FUNCTION set_po_delivery_date()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.status = 'received' AND (OLD.status IS DISTINCT FROM 'received') THEN
       NEW.delivery_date := CURRENT_DATE;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   DROP TRIGGER IF EXISTS trg_po_delivery_date ON purchase_orders;
   CREATE TRIGGER trg_po_delivery_date
     BEFORE UPDATE OF status ON purchase_orders
     FOR EACH ROW EXECUTE FUNCTION set_po_delivery_date();
