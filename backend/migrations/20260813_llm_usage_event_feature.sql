-- Tag each LLM usage event with the Controls feature it belongs to
-- (attestation, assessment, sales_agent, reports) so per-feature quotas can be enforced.

ALTER TABLE llm_model_usage_events
  ADD COLUMN IF NOT EXISTS feature VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_llm_model_usage_events_user_feature
  ON llm_model_usage_events (user_id, feature);
