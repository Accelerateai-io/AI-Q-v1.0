-- Per-user token allocation history. Each grant is recorded; running totals stay
-- on org_user_token_allocations and are increased (never replaced) on new grants.

CREATE TABLE IF NOT EXISTS org_user_token_allocation_history (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature VARCHAR(64) NOT NULL,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  allocated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_org_user_token_allocation_history_user
  ON org_user_token_allocation_history (organization_id, user_id, feature, allocated_at DESC);

-- Seed history from current totals so existing grants appear once.
INSERT INTO org_user_token_allocation_history (
  organization_id,
  user_id,
  feature,
  input_tokens,
  output_tokens,
  allocated_at
)
SELECT
  a.organization_id,
  a.user_id,
  a.feature,
  a.input_tokens,
  a.output_tokens,
  a.created_at
FROM org_user_token_allocations a
WHERE (a.input_tokens > 0 OR a.output_tokens > 0)
  AND NOT EXISTS (
    SELECT 1
    FROM org_user_token_allocation_history h
    WHERE h.organization_id = a.organization_id
      AND h.user_id = a.user_id
      AND h.feature = a.feature
  );
