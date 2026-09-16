-- Vendor self attestation: FedRAMP authorization object
ALTER TABLE public.vendor_self_attestations
  ADD COLUMN IF NOT EXISTS fedramp_authorization jsonb;
