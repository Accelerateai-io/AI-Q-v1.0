-- Dedicated columns for Python score rationale blocks (VTS / SRS / IRS).
-- Same text as terminal output; also kept inside report JSON for backward compatibility.

ALTER TABLE generated_profile_reports
  ADD COLUMN IF NOT EXISTS score_rationale TEXT,
  ADD COLUMN IF NOT EXISTS score_rationale_type VARCHAR(8);

ALTER TABLE customer_risk_assessment_reports
  ADD COLUMN IF NOT EXISTS score_rationale TEXT,
  ADD COLUMN IF NOT EXISTS score_rationale_type VARCHAR(8);

ALTER TABLE cots_buyer_assessments
  ADD COLUMN IF NOT EXISTS score_rationale TEXT,
  ADD COLUMN IF NOT EXISTS score_rationale_type VARCHAR(8);
