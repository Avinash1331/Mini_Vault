import { pgTable, uuid, timestamp, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const notificationTypeEnum = pgEnum("notification_type", ["EMAIL", "SMS", "IN_APP"]);
export const notificationStatusEnum = pgEnum("notification_status", ["SENT", "DELIVERED", "FAILED", "READ"]);

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").notNull(),
  status: notificationStatusEnum("status").notNull().default("SENT"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type DbNotification = typeof notificationsTable.$inferSelect;
