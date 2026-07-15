-- ============================================================
-- CODENTRA — Purchase Order approval workflow
-- Purchasing staff may CREATE a PO (draft / pending_approval), but a
-- PO may NOT be committed to a real purchase (ordered / received)
-- until a supervisor (or higher) has approved it. Approval is stamped
-- via approved_by / approved_at and is enforced at the database level
-- so it cannot be bypassed from the app.
-- ============================================================

-- Roles permitted to approve purchase orders (supervisor and above).
CREATE OR REPLACE FUNCTION is_po_approver_role(p_role user_role)
RETURNS boolean AS $$
BEGIN
  RETURN p_role IN ('supervisor', 'manager', 'admin', 'super_admin');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Resolve a user's role by id (security definer so it works under RLS).
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Approve a purchase order.
--   - only supervisor+ roles may approve
--   - the creator cannot approve their own PO (segregation of duties)
--   - the PO must currently be in a submittable state (draft / pending_approval)
CREATE OR REPLACE FUNCTION approve_purchase_order(p_po_id UUID, p_approver_id UUID)
RETURNS purchase_orders AS $$
DECLARE
  v_po          purchase_orders;
  v_approver_role user_role;
BEGIN
  SELECT role INTO v_approver_role FROM users WHERE id = p_approver_id;
  IF NOT is_po_approver_role(v_approver_role) THEN
    RAISE EXCEPTION 'Only a supervisor or higher can approve purchase orders';
  END IF;

  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;

  IF v_po.created_by IS NOT NULL AND v_po.created_by = p_approver_id THEN
    RAISE EXCEPTION 'The creator cannot approve their own purchase order';
  END IF;

  IF v_po.status NOT IN ('draft', 'pending_approval') THEN
    RAISE EXCEPTION 'Purchase order cannot be approved (current status: %)', v_po.status;
  END IF;

  UPDATE purchase_orders
     SET status      = 'approved',
         approved_by = p_approver_id,
         approved_at = NOW(),
         updated_at  = NOW()
   WHERE id = p_po_id;

  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id;
  RETURN v_po;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Submit a draft PO for approval (draft -> pending_approval).
CREATE OR REPLACE FUNCTION submit_purchase_order(p_po_id UUID)
RETURNS purchase_orders AS $$
DECLARE
  v_po purchase_orders;
BEGIN
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;

  IF v_po.status <> 'draft' THEN
    RAISE EXCEPTION 'Only a draft purchase order can be submitted (current status: %)', v_po.status;
  END IF;

  UPDATE purchase_orders
     SET status     = 'pending_approval',
         updated_at = NOW()
   WHERE id = p_po_id;

  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id;
  RETURN v_po;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Guard: a PO may only reach an approved/committed state when it has a
-- recorded approver (approved_by + approved_at). This blocks both direct
-- status updates and any attempt to order before supervisor approval.
CREATE OR REPLACE FUNCTION guard_po_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('approved', 'ordered', 'partially_received', 'received') THEN
    IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'Purchase order must be approved by a supervisor before it can be %', NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_po_approval_guard ON purchase_orders;
CREATE TRIGGER trg_po_approval_guard
  BEFORE INSERT OR UPDATE OF status ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION guard_po_approval();
