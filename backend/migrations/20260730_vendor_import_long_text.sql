-- Preserve complete long-form values supplied by vendor CSV imports.
-- PostgreSQL text has no practical application-level character limit.

ALTER TABLE vendor_onboarding
  ALTER COLUMN sector TYPE TEXT,
  ALTER COLUMN company_website TYPE TEXT,
  ALTER COLUMN company_description TYPE TEXT;

ALTER TABLE vendor_self_attestations
  ALTER COLUMN company_website TYPE TEXT,
  ALTER COLUMN roi_value_metrics TYPE TEXT;
