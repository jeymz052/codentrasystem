  -- ============================================================
  -- CODENTRA — Review remarks on approval/rejection
  -- Lets a supervisor / manager / admin record the reason or
  -- remarks when they approve or reject a deletion / void /
  -- refund / purchase-order request, so the requester (and
  -- auditors) can see why a decision was made.
  -- ============================================================

  ALTER TABLE deletion_requests
    ADD COLUMN IF NOT EXISTS review_notes text;
