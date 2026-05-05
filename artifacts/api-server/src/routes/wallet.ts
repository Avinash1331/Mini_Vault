import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, walletsTable, transactionsTable, ledgerEntriesTable } from "@workspace/db";
import { AddMoneyBody, WithdrawMoneyBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import type { JwtPayload } from "../middlewares/auth";
import { kafka } from "../lib/kafka";

const router: IRouter = Router();

router.get("/wallet/balance", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: JwtPayload }).user;

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.userId)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  // Reset daily limit if it's a new day
  const now = new Date();
  const resetAt = new Date(wallet.dailyResetAt);
  if (now.toDateString() !== resetAt.toDateString()) {
    await db.update(walletsTable)
      .set({ dailyTransferUsed: "0", dailyResetAt: now })
      .where(eq(walletsTable.id, wallet.id));
    wallet.dailyTransferUsed = "0";
  }

  res.json({
    walletId: wallet.id,
    balance: parseFloat(wallet.balance),
    dailyTransferLimit: parseFloat(wallet.dailyTransferLimit),
    dailyTransferUsed: parseFloat(wallet.dailyTransferUsed),
    currency: wallet.currency,
  });
});

router.post("/wallet/add-money", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: JwtPayload }).user;

  const parsed = AddMoneyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { amount, note } = parsed.data;

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.userId)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const newBalance = parseFloat(wallet.balance) + amount;

  const [transaction] = await db.insert(transactionsTable).values({
    receiverId: user.userId,
    amount: amount.toFixed(2),
    status: "SUCCESS",
    type: "ADD_MONEY",
    note: note ?? "Money added to wallet",
  }).returning();

  await db.update(walletsTable)
    .set({ balance: newBalance.toFixed(2) })
    .where(eq(walletsTable.id, wallet.id));

  await db.insert(ledgerEntriesTable).values({
    userId: user.userId,
    transactionId: transaction.id,
    type: "CREDIT",
    amount: amount.toFixed(2),
    balanceAfter: newBalance.toFixed(2),
    description: note ?? "Money added to wallet",
  });

  await kafka.publish("payment-success", { transactionId: transaction.id, userId: user.userId, amount });
  await kafka.publish("notification-events", {
    userId: user.userId,
    message: `₹${amount} added to your wallet. New balance: ₹${newBalance.toFixed(2)}`,
    type: "IN_APP",
  });

  res.json({
    transactionId: transaction.id,
    status: "SUCCESS",
    amount,
    message: `₹${amount} added to your wallet successfully`,
  });
});

router.post("/wallet/withdraw", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: JwtPayload }).user;

  const parsed = WithdrawMoneyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { amount, note } = parsed.data;

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.userId)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const currentBalance = parseFloat(wallet.balance);
  if (currentBalance < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const newBalance = currentBalance - amount;

  const [transaction] = await db.insert(transactionsTable).values({
    senderId: user.userId,
    amount: amount.toFixed(2),
    status: "SUCCESS",
    type: "WITHDRAW",
    note: note ?? "Withdrawal",
  }).returning();

  await db.update(walletsTable)
    .set({ balance: newBalance.toFixed(2) })
    .where(eq(walletsTable.id, wallet.id));

  await db.insert(ledgerEntriesTable).values({
    userId: user.userId,
    transactionId: transaction.id,
    type: "WITHDRAW",
    amount: amount.toFixed(2),
    balanceAfter: newBalance.toFixed(2),
    description: note ?? "Withdrawal",
  });

  await kafka.publish("notification-events", {
    userId: user.userId,
    message: `₹${amount} withdrawn from your wallet. New balance: ₹${newBalance.toFixed(2)}`,
    type: "IN_APP",
  });

  res.json({
    transactionId: transaction.id,
    status: "SUCCESS",
    amount,
    message: `₹${amount} withdrawn successfully`,
  });
});

export default router;
