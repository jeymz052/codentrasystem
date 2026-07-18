-- Enable Supabase Realtime on the tables whose changes must propagate to other
-- devices instantly (voids, refunds, deletion-request approvals, cash shifts).
-- The client subscribes to these so a superior approving a request on one device
-- reflects on the requester's POS / the approvals page within milliseconds
-- instead of waiting for the polling interval.
do $$
begin
  -- Deletion requests (void/refund/delete approvals)
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'deletion_requests'
  ) then
    alter publication supabase_realtime add table public.deletion_requests;
  end if;

  -- Sales transactions (status flips to voided/refunded)
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'sales_transactions'
  ) then
    alter publication supabase_realtime add table public.sales_transactions;
  end if;

  -- Cash shifts (shift open/close reflected at POS)
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'cash_shifts'
  ) then
    alter publication supabase_realtime add table public.cash_shifts;
  end if;

  -- Audit logs (audit trail shown to managers/admins)
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'audit_logs'
  ) then
    alter publication supabase_realtime add table public.audit_logs;
  end if;
end $$;
