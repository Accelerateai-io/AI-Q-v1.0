-- Per-organization feature token quotas and per-user allocations (Controls).

CREATE TABLE IF NOT EXISTS org_feature_token_quotas (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature VARCHAR(64) NOT NULL,
  input_token_quota BIGINT NOT NULL DEFAULT 0,
  output_token_quota BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT org_feature_token_quotas_org_feature_unique UNIQUE (organization_id, feature)
);

CREATE TABLE IF NOT EXISTS org_user_token_allocations (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature VARCHAR(64) NOT NULL,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT org_user_token_allocations_org_user_feature_unique UNIQUE (organization_id, user_id, feature)
);

CREATE INDEX IF NOT EXISTS idx_org_feature_token_quotas_org
  ON org_feature_token_quotas (organization_id);

CREATE INDEX IF NOT EXISTS idx_org_user_token_allocations_org
  ON org_user_token_allocations (organization_id, feature);

CREATE INDEX IF NOT EXISTS idx_llm_model_usage_events_organization_id
  ON llm_model_usage_events (organization_id, created_at DESC);
