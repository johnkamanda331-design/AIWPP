import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    description: text("description").notNull(),
    severity: text("severity").notNull().default("info"), // critical, high, medium, info
    details: text("details"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_timestamp_idx").on(t.timestamp),
    index("events_severity_idx").on(t.severity),
    index("events_type_idx").on(t.type),
  ],
);

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventRow = typeof eventsTable.$inferSelect;
