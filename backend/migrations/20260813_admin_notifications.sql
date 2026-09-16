-- Platform-admin inbox (token quota exhaustion and later alerts).

CREATE TABLE IF NOT EXISTS admin_notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  organization_name VARCHAR(512),
  subject_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  subject_user_name VARCHAR(512),
  allocated_tokens BIGINT NOT NULL DEFAULT 0,
  consumed_tokens BIGINT NOT NULL DEFAULT 0,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_notifications_type_user_allocation_unique
    UNIQUE (type, subject_user_id, allocated_tokens)
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created
  ON admin_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread
  ON admin_notifications (created_at DESC)
  WHERE read_at IS NULL;
