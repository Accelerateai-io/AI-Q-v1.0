import {
  bigint,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { createOrganization } from "../organizations/createOrganization.js";
import { usersTable } from "../user_management/invite_user_schema.js";

export const orgFeatureTokenQuotas = pgTable(
  "org_feature_token_quotas",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => createOrganization.id, { onDelete: "cascade" }),
    feature: varchar("feature", { length: 64 }).notNull(),
    inputTokenQuota: bigint("input_token_quota", { mode: "number" })
      .notNull()
      .default(0),
    outputTokenQuota: bigint("output_token_quota", { mode: "number" })
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("org_feature_token_quotas_org_feature_unique").on(
      table.organizationId,
      table.feature,
    ),
  ],
);

export const orgUserTokenAllocations = pgTable(
  "org_user_token_allocations",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => createOrganization.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    feature: varchar("feature", { length: 64 }).notNull(),
    inputTokens: bigint("input_tokens", { mode: "number" })
      .notNull()
      .default(0),
    outputTokens: bigint("output_tokens", { mode: "number" })
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("org_user_token_allocations_org_user_feature_unique").on(
      table.organizationId,
      table.userId,
      table.feature,
    ),
  ],
);

export const orgUserTokenAllocationHistory = pgTable(
  "org_user_token_allocation_history",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => createOrganization.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    feature: varchar("feature", { length: 64 }).notNull(),
    inputTokens: bigint("input_tokens", { mode: "number" })
      .notNull()
      .default(0),
    outputTokens: bigint("output_tokens", { mode: "number" })
      .notNull()
      .default(0),
    allocatedAt: timestamp("allocated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    allocatedBy: integer("allocated_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
  },
);
