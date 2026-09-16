ALTER TABLE public.vendor_self_attestations
  ADD COLUMN IF NOT EXISTS dpa_url varchar(500);
