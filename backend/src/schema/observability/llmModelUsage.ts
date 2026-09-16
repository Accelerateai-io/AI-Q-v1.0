import {
  bigint,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/** Aggregated token usage + estimated cost per Bedrock model id. */
export const llmModelUsage = pgTable("llm_model_usage", {
  id: serial("id").primaryKey(),
  modelId: varchar("model_id", { length: 512 }).notNull().unique(),
  modelName: varchar("model_name", { length: 512 }).notNull(),
  inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
  outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
  totalTokens: bigint("total_tokens", { mode: "number" }).notNull().default(0),
  estimatedCostUsd: numeric("estimated_cost_usd", {
    precision: 14,
    scale: 6,
  })
    .notNull()
    .default("0"),
  invokeCount: integer("invoke_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
