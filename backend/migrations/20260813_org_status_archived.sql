-- Allow organizations.organizationStatus = 'archived'.
-- This enum is shared with users.userStatus; we only set 'archived' on the organizations row.

ALTER TYPE "organizationStatus" ADD VALUE IF NOT EXISTS 'archived';
