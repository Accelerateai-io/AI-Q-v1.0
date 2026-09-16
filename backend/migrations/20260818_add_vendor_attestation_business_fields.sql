-- Vendor self attestation: general business + verification of claims
ALTER TABLE public.vendor_self_attestations
  ADD COLUMN IF NOT EXISTS funding_status varchar(50),
  ADD COLUMN IF NOT EXISTS financial_position varchar(50),
  ADD COLUMN IF NOT EXISTS enterprise_customers integer,
  ADD COLUMN IF NOT EXISTS customer_retention_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS trust_centre_url varchar(500),
  ADD COLUMN IF NOT EXISTS has_public_security_incident varchar(10),
  ADD COLUMN IF NOT EXISTS security_incidents jsonb NOT NULL DEFAULT '[]'::jsonb;
