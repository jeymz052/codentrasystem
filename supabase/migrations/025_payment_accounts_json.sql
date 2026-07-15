  -- Store payment accounts as a dynamic list so tenants can add whatever
  -- e-wallets / banks they actually use (GCash, Maya, BDO, UnionBank, GoTyme, …)
  -- instead of a fixed set of columns. Each entry: id, label, kind, account, qr_url.
  ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS payment_accounts JSONB NOT NULL DEFAULT '[]'::jsonb;
  