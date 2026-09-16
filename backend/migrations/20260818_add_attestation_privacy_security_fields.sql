-- Vendor self attestation: data handling, vendor management, AI safety, compliance
ALTER TABLE public.vendor_self_attestations
  ADD COLUMN IF NOT EXISTS encryption_at_rest varchar(50),
  ADD COLUMN IF NOT EXISTS encryption_at_rest_evidence_id varchar(255),
  ADD COLUMN IF NOT EXISTS tls_in_transit varchar(50),
  ADD COLUMN IF NOT EXISTS data_subject_rights jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS controller_or_processor varchar(20),
  ADD COLUMN IF NOT EXISTS sub_processors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vulnerability_disclosure_policy jsonb,
  ADD COLUMN IF NOT EXISTS bug_bounty jsonb,
  ADD COLUMN IF NOT EXISTS independent_pen_test_frequency varchar(30),
  ADD COLUMN IF NOT EXISTS dpa_available varchar(30);
