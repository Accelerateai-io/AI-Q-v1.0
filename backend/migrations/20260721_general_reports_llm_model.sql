-- Persist which LLM model id generated general reports (Assessment Analysis types).

ALTER TABLE general_reports
  ADD COLUMN IF NOT EXISTS llm_model_id VARCHAR(512),
  ADD COLUMN IF NOT EXISTS llm_model_label VARCHAR(512);

-- Backfill model id from JSON content when present (buyer matrix / risk / plan reports).
UPDATE general_reports
SET
  llm_model_id = COALESCE(
    NULLIF(TRIM(llm_model_id), ''),
    NULLIF(TRIM(content::jsonb->>'modelId'), ''),
    NULLIF(TRIM(content::jsonb->>'llmModelId'), '')
  )
WHERE (llm_model_id IS NULL OR TRIM(llm_model_id) = '')
  AND content IS NOT NULL
  AND TRIM(content) <> ''
  AND LEFT(TRIM(content), 1) = '{';
