import { pgTable, text, serial, timestamp, boolean, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const faultsTable = pgTable(
  "faults",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(), // dry_running, over_current, under_voltage, etc.
    severity: text("severity").notNull().default("medium"),
    cause: text("cause").notNull(),
    recommendedAction: text("recommended_action").notNull(),
    occurrences: real("occurrences").notNull().default(1),
    confidence: real("confidence").notNull().default(80),
    trend: text("trend").notNull().default("stable"), // increasing, stable, decreasing
    isActive: boolean("is_active").notNull().default(true),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
    description: text("description"),
  },
  (t) => [
    index("faults_is_active_idx").on(t.isActive),
    index("faults_severity_idx").on(t.severity),
    index("faults_last_seen_idx").on(t.lastSeen),
  ],
);

export const insertFaultSchema = createInsertSchema(faultsTable).omit({ id: true });
export type InsertFault = z.infer<typeof insertFaultSchema>;
export type FaultRow = typeof faultsTable.$inferSelect;
