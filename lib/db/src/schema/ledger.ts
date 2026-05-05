import { pgTable, uuid, timestamp, numeric, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { transactionsTable } from "./transactions";

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "CREDIT",
  "DEBIT",
  "REFUND",
  "WITHDRAW",
]);

export const ledgerEntriesTable = pgTable("ledger_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  transactionId: uuid("transaction_id").notNull().references(() => transactionsTable.id),
  type: ledgerEntryTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLedgerEntrySchema = createInsertSchema(ledgerEntriesTable).omit({ id: true, timestamp: true });
export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export type LedgerEntry = typeof ledgerEntriesTable.$inferSelect;
