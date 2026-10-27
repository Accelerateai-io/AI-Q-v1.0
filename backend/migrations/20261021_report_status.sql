-- Additive, idempotent: per-report generation status so a failed or stuck report
-- is distinguishable from one that is still generating or done.
-- Values: 'generating' | 'failed' | 'done'.
--
-- Vendor COTS analysis reports are only ever inserted once generation finishes,
-- so existing rows are 'done'. Buyer reports live on the assessment row and may
-- be absent (still generating / failed) — leave that column nullable and let the
-- application set it.

ALTER TABLE customer_risk_assessment_reports
  ADD COLUMN IF NOT EXISTS report_status varchar(16) NOT NULL DEFAULT 'done';

ALTER TABLE cots_buyer_assessments
  ADD COLUMN IF NOT EXISTS report_status varchar(16);
