-- Freeze expired buyer vendor-risk JSON on cots_buyer_assessments.
-- Live vendor_risk_assessment_report is cleared on expiry; this column keeps the snapshot.

ALTER TABLE cots_buyer_assessments
  ADD COLUMN IF NOT EXISTS archived_vendor_risk_assessment_report JSONB;
