import { pgTable, uuid, timestamp, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { transactionsTable } from "./transactions";

export const fraudAlertTypeEnum = pgEnum("fraud_alert_type", [
  "RAPID_TRANSFERS",
  "LARGE_TRANSACTION",
  "MULTIPLE_FAILURES",
]);

export const fraudSeverityEnum = pgEnum("fraud_severity", ["LOW", "MEDIUM", "HIGH"]);

export const fraudAlertsTable = pgTable("fraud_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  transactionId: uuid("transaction_id").references(() => transactionsTable.id),
  type: fraudAlertTypeEnum("type").notNull(),
  description: text("description").notNull(),
  severity: fraudSeverityEnum("severity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFraudAlertSchema = createInsertSchema(fraudAlertsTable).omit({ id: true, createdAt: true });
export type InsertFraudAlert = z.infer<typeof insertFraudAlertSchema>;
export type FraudAlert = typeof fraudAlertsTable.$inferSelect;
