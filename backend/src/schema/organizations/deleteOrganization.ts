//** Status (Active or Inactive) or delete Organization Schema

// import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";
// import { organizationStatusEnum } from "../schema";

// export const organizationStatusLogs = pgTable("organizationStatus", {
//   id: serial("id").primaryKey(),
//   organizationId: varchar("organizationId").notNull(),
//   organizationStatus: organizationStatusEnum("organizationStatus").notNull(),
//   updated_by:varchar("updated_by").notNull(),
//   reason: varchar("reason").notNull(),
//   updated_at: timestamp("updated_at").defaultNow().notNull(),
// });