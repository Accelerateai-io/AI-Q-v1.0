-- Per-invoke LLM usage events (Observability model detail).

CREATE TABLE IF NOT EXISTS llm_model_usage_events (
  id SERIAL PRIMARY KEY,
  usage_id INTEGER REFERENCES llm_model_usage(id) ON DELETE CASCADE,
  model_id VARCHAR(512) NOT NULL,
  organization_id INTEGER,
  organization_name VARCHAR(512),
  user_id INTEGER,
  user_name VARCHAR(512),
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_model_usage_events_usage_id
  ON llm_model_usage_events (usage_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_llm_model_usage_events_model_id
  ON llm_model_usage_events (model_id, created_at DESC);
