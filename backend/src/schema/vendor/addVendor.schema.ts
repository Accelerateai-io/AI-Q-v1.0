import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  jsonb,
  boolean,
  text,
  numeric,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Table: vendor_onboarding (SQL). camelCase keys for .values(), first arg = DB column.
// One onboarding per org: unique on organization_id.
export const vendorOnboarding = pgTable("vendor_onboarding", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: integer("user_id").notNull(),
  organizationId: varchar("organization_id", { length: 255 }).notNull().unique(),
  vendorName: varchar("vendor_name", { length: 255 }),
  vendorType: varchar("vendor_type", { length: 100 }).notNull(),
  sector: text("sector"),
  vendorMaturity: varchar("vendor_maturity", { length: 100 }),
  companyWebsite: text("company_website").notNull(),
  companyDescription: text("company_description").notNull(),
  primaryContactName: varchar("primary_contact_name", { length: 200 }).notNull(),
  primaryContactEmail: varchar("primary_contact_email", { length: 255 }).notNull(),
  primaryContactRole: varchar("primary_contact_role", { length: 100 }),
  employeeCount: varchar("employee_count", { length: 50 }).notNull(),
  yearFounded: integer("year_founded").notNull(),
  headquartersLocation: varchar("headquarters_location", { length: 100 }).notNull(),
  operatingRegions: jsonb("operating_regions"),
  fundingStatus: varchar("funding_status", { length: 50 }),
  financialPosition: varchar("financial_position", { length: 50 }),
  enterpriseCustomers: integer("enterprise_customers"),
  customerRetentionRate: numeric("customer_retention_rate", { precision: 5, scale: 2 }),
  trustCentreUrl: varchar("trust_centre_url", { length: 500 }),
  securityIncidents: jsonb("security_incidents").default(sql`'[]'::jsonb`).notNull(),
  publicDirectoryListing: boolean("public_directory_listing").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const vendors = vendorOnboarding;
