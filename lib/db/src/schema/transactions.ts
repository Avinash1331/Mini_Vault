import { pgTable, text, uuid, timestamp, numeric, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const transactionStatusEnum = pgEnum("transaction_status", [
  "INITIATED",
  "PROCESSING",
  "SUCCESS",
  "FAILED",
  "PENDING",
  "REVERSED",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "TRANSFER",
  "ADD_MONEY",
  "WITHDRAW",
  "REFUND",
]);

export const transactionsTable = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").references(() => usersTable.id),
  receiverId: uuid("receiver_id").references(() => usersTable.id),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").notNull().default("INITIATED"),
  type: transactionTypeEnum("type").notNull(),
  note: text("note"),
  idempotencyKey: text("idempotency_key").unique(),
  isFlagged: boolean("is_flagged").notNull().default(false),
  flagReason: text("flag_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
