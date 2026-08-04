import { pgTable, text, serial, timestamp, real } from "drizzle-orm/pg-core";

export const controlCommandsTable = pgTable("control_commands", {
  id: serial("id").primaryKey(),
  commandId: text("command_id").notNull().unique(),
  action: text("action").notNull(),
  userId: real("user_id"),
  status: text("status").notNull().default("accepted"), // accepted, rejected, pending
  reason: text("reason"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export type ControlCommandRow = typeof controlCommandsTable.$inferSelect;
