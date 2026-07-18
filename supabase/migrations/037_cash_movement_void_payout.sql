-- CODENTRA — Distinguish void payouts from refund payouts in cash movements.
-- Previously both a VOID and a REFUND were logged with the same generic
-- `refund_payout` movement kind, so managers could not tell from the cash
-- drawer ledger whether cash left the drawer because a sale was voided or
-- because it was refunded. Add a distinct `void_payout` kind so the two are
-- shown separately.

do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'cash_movement_kind' and e.enumlabel = 'void_payout'
  ) then
    alter type cash_movement_kind add value 'void_payout';
  end if;
end $$;
