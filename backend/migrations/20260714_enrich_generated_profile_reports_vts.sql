-- Enrich generated_profile_reports with structured VTS fields (Python scores, Node persists).
ALTER TABLE generated_profile_reports
  ADD COLUMN IF NOT EXISTS product_risk DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS governance_risk DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS operational_risk DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS weighted_risk DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS grade VARCHAR(8),
  ADD COLUMN IF NOT EXISTS classification VARCHAR(128),
  ADD COLUMN IF NOT EXISTS formula_detail JSONB,
  ADD COLUMN IF NOT EXISTS scoring_version VARCHAR(32);

-- Latest trust score pointer on vendor_self_attestations for neat reads.
ALTER TABLE vendor_self_attestations
  ADD COLUMN IF NOT EXISTS latest_trust_score INTEGER,
  ADD COLUMN IF NOT EXISTS latest_trust_grade VARCHAR(8),
  ADD COLUMN IF NOT EXISTS latest_profile_report_id UUID;
