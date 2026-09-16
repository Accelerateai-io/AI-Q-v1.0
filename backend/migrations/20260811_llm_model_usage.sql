-- Aggregated LLM token usage per model (Observability).

CREATE TABLE IF NOT EXISTS llm_model_usage (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(512) NOT NULL,
  model_name VARCHAR(512) NOT NULL,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(14, 6) NOT NULL DEFAULT 0,
  invoke_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT llm_model_usage_model_id_unique UNIQUE (model_id)
);

CREATE INDEX IF NOT EXISTS idx_llm_model_usage_total_tokens
  ON llm_model_usage (total_tokens DESC);
