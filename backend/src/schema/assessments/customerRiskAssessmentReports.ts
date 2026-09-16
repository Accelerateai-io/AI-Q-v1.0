import { pgTable, uuid, varchar, timestamp, jsonb, text } from "drizzle-orm/pg-core";

/**
 * Analysis Report records generated when a vendor COTS assessment is submitted.
 * Title format: "Analysis Report: {organization name} - {product name}"
 */
export const customerRiskAssessmentReports = pgTable("customer_risk_assessment_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  assessment_id: uuid("assessment_id").notNull(),
  organization_id: varchar("organization_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  report: jsonb("report").notNull(),
  score_rationale: text("score_rationale"),
  score_rationale_type: varchar("score_rationale_type", { length: 8 }),
  /** Controls LLM used when this analysis report was generated. */
  llm_model_id: varchar("llm_model_id", { length: 512 }),
  llm_model_label: varchar("llm_model_label", { length: 512 }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
