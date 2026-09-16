import {
  bigint,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { llmModelUsage } from "./llmModelUsage.js";

/** One row per LLM invoke (Observability model detail table). */
export const llmModelUsageEvents = pgTable("llm_model_usage_events", {
  id: serial("id").primaryKey(),
  usageId: integer("usage_id").references(() => llmModelUsage.id, {
    onDelete: "cascade",
  }),
  modelId: varchar("model_id", { length: 512 }).notNull(),
  organizationId: integer("organization_id"),
  organizationName: varchar("organization_name", { length: 512 }),
  userId: integer("user_id"),
  userName: varchar("user_name", { length: 512 }),
  feature: varchar("feature", { length: 64 }),
  inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
  outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
  totalTokens: bigint("total_tokens", { mode: "number" }).notNull().default(0),
  estimatedCostUsd: numeric("estimated_cost_usd", {
    precision: 14,
    scale: 6,
  })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
