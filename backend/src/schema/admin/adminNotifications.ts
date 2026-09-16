import {
  bigint,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { createOrganization } from "../organizations/createOrganization.js";
import { usersTable } from "../user_management/invite_user_schema.js";

export const adminNotifications = pgTable(
  "admin_notifications",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body").notNull(),
    organizationId: integer("organization_id").references(
      () => createOrganization.id,
      { onDelete: "set null" },
    ),
    organizationName: varchar("organization_name", { length: 512 }),
    subjectUserId: integer("subject_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    subjectUserName: varchar("subject_user_name", { length: 512 }),
    allocatedTokens: bigint("allocated_tokens", { mode: "number" })
      .notNull()
      .default(0),
    consumedTokens: bigint("consumed_tokens", { mode: "number" })
      .notNull()
      .default(0),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("admin_notifications_type_user_allocation_unique").on(
      table.type,
      table.subjectUserId,
      table.allocatedTokens,
    ),
  ],
);

export const TOKEN_QUOTA_EXHAUSTED_TYPE = "token_quota_exhausted";
