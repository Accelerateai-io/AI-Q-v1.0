-- Persist which LLM model generated each assessment report (types 1–3).
-- Also kept inside report JSON (modelId / modelLabel) for backward compatibility.

ALTER TABLE generated_profile_reports
  ADD COLUMN IF NOT EXISTS llm_model_id VARCHAR(512),
  ADD COLUMN IF NOT EXISTS llm_model_label VARCHAR(512);

ALTER TABLE vendor_self_attestations
  ADD COLUMN IF NOT EXISTS llm_model_id VARCHAR(512),
  ADD COLUMN IF NOT EXISTS llm_model_label VARCHAR(512);

ALTER TABLE customer_risk_assessment_reports
  ADD COLUMN IF NOT EXISTS llm_model_id VARCHAR(512),
  ADD COLUMN IF NOT EXISTS llm_model_label VARCHAR(512);

ALTER TABLE cots_buyer_assessments
  ADD COLUMN IF NOT EXISTS llm_model_id VARCHAR(512),
  ADD COLUMN IF NOT EXISTS llm_model_label VARCHAR(512);

-- Backfill from report JSON when columns are empty.
UPDATE generated_profile_reports
SET
  llm_model_id = COALESCE(NULLIF(TRIM(llm_model_id), ''), NULLIF(TRIM(report->>'modelId'), '')),
  llm_model_label = COALESCE(NULLIF(TRIM(llm_model_label), ''), NULLIF(TRIM(report->>'modelLabel'), ''), NULLIF(TRIM(report->>'modelId'), ''))
WHERE (llm_model_id IS NULL OR TRIM(llm_model_id) = '')
  AND report IS NOT NULL
  AND (
    NULLIF(TRIM(report->>'modelId'), '') IS NOT NULL
    OR NULLIF(TRIM(report->>'modelLabel'), '') IS NOT NULL
  );

UPDATE vendor_self_attestations
SET
  llm_model_id = COALESCE(NULLIF(TRIM(llm_model_id), ''), NULLIF(TRIM(generated_profile_report->>'modelId'), '')),
  llm_model_label = COALESCE(
    NULLIF(TRIM(llm_model_label), ''),
    NULLIF(TRIM(generated_profile_report->>'modelLabel'), ''),
    NULLIF(TRIM(generated_profile_report->>'modelId'), '')
  )
WHERE (llm_model_id IS NULL OR TRIM(llm_model_id) = '')
  AND generated_profile_report IS NOT NULL
  AND (
    NULLIF(TRIM(generated_profile_report->>'modelId'), '') IS NOT NULL
    OR NULLIF(TRIM(generated_profile_report->>'modelLabel'), '') IS NOT NULL
  );

UPDATE customer_risk_assessment_reports
SET
  llm_model_id = COALESCE(NULLIF(TRIM(llm_model_id), ''), NULLIF(TRIM(report->>'modelId'), '')),
  llm_model_label = COALESCE(NULLIF(TRIM(llm_model_label), ''), NULLIF(TRIM(report->>'modelLabel'), ''), NULLIF(TRIM(report->>'modelId'), ''))
WHERE (llm_model_id IS NULL OR TRIM(llm_model_id) = '')
  AND report IS NOT NULL
  AND (
    NULLIF(TRIM(report->>'modelId'), '') IS NOT NULL
    OR NULLIF(TRIM(report->>'modelLabel'), '') IS NOT NULL
  );

UPDATE cots_buyer_assessments
SET
  llm_model_id = COALESCE(NULLIF(TRIM(llm_model_id), ''), NULLIF(TRIM(vendor_risk_assessment_report->>'modelId'), '')),
  llm_model_label = COALESCE(
    NULLIF(TRIM(llm_model_label), ''),
    NULLIF(TRIM(vendor_risk_assessment_report->>'modelLabel'), ''),
    NULLIF(TRIM(vendor_risk_assessment_report->>'modelId'), '')
  )
WHERE (llm_model_id IS NULL OR TRIM(llm_model_id) = '')
  AND vendor_risk_assessment_report IS NOT NULL
  AND (
    NULLIF(TRIM(vendor_risk_assessment_report->>'modelId'), '') IS NOT NULL
    OR NULLIF(TRIM(vendor_risk_assessment_report->>'modelLabel'), '') IS NOT NULL
  );
