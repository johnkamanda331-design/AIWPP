import { pgTable, serial, timestamp, real, text, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const telemetryTable = pgTable(
  "telemetry",
  {
    id: serial("id").primaryKey(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    voltage: real("voltage").notNull(),
    current: real("current").notNull(),
    frequency: real("frequency").notNull(),
    realPower: real("real_power").notNull(),
    reactivePower: real("reactive_power").notNull(),
    apparentPower: real("apparent_power").notNull(),
    powerFactor: real("power_factor").notNull(),
    energy: real("energy").notNull(),
    runtime: real("runtime").notNull(),
    internalTemp: real("internal_temp").notNull(),
    communicationQuality: real("communication_quality").notNull(),
    motorState: text("motor_state").notNull().default("running"),
    supplyState: text("supply_state").notNull().default("normal"),
    relayState: text("relay_state").notNull().default("closed"),
  },
  (t) => [
    index("telemetry_timestamp_idx").on(t.timestamp),
  ],
);

export const insertTelemetrySchema = createInsertSchema(telemetryTable).omit({ id: true });
export type InsertTelemetry = z.infer<typeof insertTelemetrySchema>;
export type TelemetryRow = typeof telemetryTable.$inferSelect;
