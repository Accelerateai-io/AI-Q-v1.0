-- Backfill Controls feature on usage events that were recorded before feature was persisted.

UPDATE llm_model_usage_events e
SET feature = 'attestation'
WHERE e.feature IS NULL
  AND EXISTS (
    SELECT 1
    FROM generated_profile_reports r
    WHERE r.organization_id::text = e.organization_id::text
      AND (e.user_id IS NULL OR r.user_id = e.user_id)
      AND r.created_at BETWEEN e.created_at - INTERVAL '15 minutes'
                           AND e.created_at + INTERVAL '15 minutes'
  );

UPDATE llm_model_usage_events e
SET feature = 'attestation'
WHERE e.feature IS NULL
  AND EXISTS (
    SELECT 1
    FROM vendor_self_attestations a
    WHERE a.organization_id::text = e.organization_id::text
      AND (e.user_id IS NULL OR a.user_id = e.user_id)
      AND COALESCE(a.submitted_at, a.updated_at) BETWEEN e.created_at - INTERVAL '15 minutes'
          AND e.created_at + INTERVAL '15 minutes'
  );

UPDATE llm_model_usage_events e
SET feature = 'assessment'
WHERE e.feature IS NULL
  AND EXISTS (
    SELECT 1
    FROM customer_risk_assessment_reports r
    WHERE r.organization_id::text = e.organization_id::text
      AND r.created_at BETWEEN e.created_at - INTERVAL '20 minutes'
                           AND e.created_at + INTERVAL '20 minutes'
  );

UPDATE llm_model_usage_events e
SET feature = 'assessment'
WHERE e.feature IS NULL
  AND EXISTS (
    SELECT 1
    FROM cots_buyer_assessments c
    WHERE c.organization_id::text = e.organization_id::text
      AND (e.user_id IS NULL OR c.user_id = e.user_id)
      AND COALESCE(c.updated_at, c.created_at) BETWEEN e.created_at - INTERVAL '20 minutes'
          AND e.created_at + INTERVAL '20 minutes'
  );

UPDATE llm_model_usage_events e
SET feature = 'assessment'
WHERE e.feature IS NULL
  AND EXISTS (
    SELECT 1
    FROM cots_vendor_assessments c
    WHERE e.user_id IS NOT NULL
      AND c.user_id = e.user_id
      AND COALESCE(c.updated_at, c.created_at) BETWEEN e.created_at - INTERVAL '20 minutes'
          AND e.created_at + INTERVAL '20 minutes'
  );

UPDATE llm_model_usage_events e
SET feature = 'reports'
WHERE e.feature IS NULL
  AND EXISTS (
    SELECT 1
    FROM general_reports g
    WHERE g.organization_id::text = e.organization_id::text
      AND g.created_at BETWEEN e.created_at - INTERVAL '15 minutes'
                           AND e.created_at + INTERVAL '15 minutes'
  );
