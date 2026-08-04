import { pgTable, text, serial, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    severity: text("severity").notNull().default("info"), // critical, high, medium, info
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    details: text("details"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_is_read_idx").on(t.isRead),
    index("notifications_severity_idx").on(t.severity),
    index("notifications_timestamp_idx").on(t.timestamp),
  ],
);

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationRow = typeof notificationsTable.$inferSelect;
