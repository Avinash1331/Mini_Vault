import { eq, and, gte, count } from "drizzle-orm";
import {
  db,
  usersTable,
  walletsTable,
  transactionsTable,
  ledgerEntriesTable,
  notificationsTable,
  fraudAlertsTable,
} from "@workspace/db";
import { kafka } from "./kafka";
import { redis } from "./redis";
import { logger } from "./logger";

interface TransferParams {
  senderId: string;
  receiverEmail: string;
  amount: number;
  note?: string;
  idempotencyKey?: string;
}

interface TransferResult {
  transactionId: string;
  status: string;
  amount: number;
  message: string;
  idempotencyKey: string;
  isDuplicate: boolean;
}

export async function processTransfer(params: TransferParams): Promise<TransferResult> {
  const { senderId, receiverEmail, amount, note, idempotencyKey } = params;

  const key = idempotencyKey ?? crypto.randomUUID();

  // Idempotency check
  const cached = redis.get(`idempotency:${key}`);
  if (cached) {
    const result = JSON.parse(cached) as TransferResult;
    logger.info({ key }, "Duplicate payment detected — returning cached result");
    return { ...result, isDuplicate: true };
  }

  // Rate limiting: max 5 transfers per minute
  const rateKey = `rate:transfer:${senderId}`;
  const rateCheck = redis.checkRateLimit(rateKey, 5, 60_000);
  if (!rateCheck.allowed) {
    throw Object.assign(new Error("Rate limit exceeded: max 5 transfers per minute"), { code: "RATE_LIMIT" });
  }

  // Validate sender
  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, senderId)).limit(1);
  if (!sender) throw new Error("Sender not found");

  // Validate receiver
  const [receiver] = await db.select().from(usersTable).where(eq(usersTable.email, receiverEmail)).limit(1);
  if (!receiver) throw new Error("Receiver not found");
  if (receiver.id === senderId) throw new Error("Cannot transfer to yourself");

  // Get sender wallet
  const [senderWallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, senderId)).limit(1);
  if (!senderWallet) throw new Error("Sender wallet not found");

  // Check balance
  const senderBalance = parseFloat(senderWallet.balance);
  if (senderBalance < amount) {
    throw Object.assign(new Error("Insufficient balance"), { code: "INSUFFICIENT_FUNDS" });
  }

  // Check daily limit
  const dailyUsed = parseFloat(senderWallet.dailyTransferUsed);
  const dailyLimit = parseFloat(senderWallet.dailyTransferLimit);
  if (dailyUsed + amount > dailyLimit) {
    throw Object.assign(new Error(`Daily transfer limit exceeded. Remaining: ₹${(dailyLimit - dailyUsed).toFixed(2)}`), { code: "DAILY_LIMIT" });
  }

  // Create transaction in INITIATED state
  const [transaction] = await db.insert(transactionsTable).values({
    senderId,
    receiverId: receiver.id,
    amount: amount.toFixed(2),
    status: "INITIATED",
    type: "TRANSFER",
    note,
    idempotencyKey: key,
  }).returning();

  // Publish to Kafka
  await kafka.publish("payment-created", {
    transactionId: transaction.id,
    senderId,
    receiverId: receiver.id,
    amount,
    idempotencyKey: key,
  });

  // Process asynchronously (simulated async processing)
  setImmediate(async () => {
    try {
      await executeTransfer(transaction.id, senderId, receiver.id, amount, senderWallet.id, senderBalance, dailyUsed, note ?? "Transfer");
    } catch (err) {
      logger.error({ err, transactionId: transaction.id }, "Transfer execution failed");
    }
  });

  const result: TransferResult = {
    transactionId: transaction.id,
    status: "INITIATED",
    amount,
    message: "Transfer initiated and being processed",
    idempotencyKey: key,
    isDuplicate: false,
  };

  // Cache for idempotency (TTL: 24h)
  redis.set(`idempotency:${key}`, JSON.stringify(result), 24 * 60 * 60 * 1000);

  return result;
}

async function executeTransfer(
  transactionId: string,
  senderId: string,
  receiverId: string,
  amount: number,
  senderWalletId: string,
  senderBalance: number,
  dailyUsed: number,
  description: string,
): Promise<void> {
  // Update to PROCESSING
  await db.update(transactionsTable)
    .set({ status: "PROCESSING" })
    .where(eq(transactionsTable.id, transactionId));

  await kafka.publish("payment-created", { transactionId, status: "PROCESSING" });

  // Simulate processing time
  await new Promise(r => setTimeout(r, 300));

  try {
    const newSenderBalance = senderBalance - amount;

    // Debit sender
    await db.update(walletsTable)
      .set({
        balance: newSenderBalance.toFixed(2),
        dailyTransferUsed: (dailyUsed + amount).toFixed(2),
      })
      .where(eq(walletsTable.id, senderWalletId));

    await db.insert(ledgerEntriesTable).values({
      userId: senderId,
      transactionId,
      type: "DEBIT",
      amount: amount.toFixed(2),
      balanceAfter: newSenderBalance.toFixed(2),
      description,
    });

    // Credit receiver
    const [receiverWallet] = await db.select().from(walletsTable)
      .where(eq(walletsTable.userId, receiverId)).limit(1);

    if (!receiverWallet) throw new Error("Receiver wallet not found");

    const newReceiverBalance = parseFloat(receiverWallet.balance) + amount;
    await db.update(walletsTable)
      .set({ balance: newReceiverBalance.toFixed(2) })
      .where(eq(walletsTable.id, receiverWallet.id));

    await db.insert(ledgerEntriesTable).values({
      userId: receiverId,
      transactionId,
      type: "CREDIT",
      amount: amount.toFixed(2),
      balanceAfter: newReceiverBalance.toFixed(2),
      description,
    });

    // Mark SUCCESS
    await db.update(transactionsTable)
      .set({ status: "SUCCESS" })
      .where(eq(transactionsTable.id, transactionId));

    await kafka.publish("payment-success", { transactionId, senderId, receiverId, amount });

    // Notifications
    await sendNotification(senderId, `₹${amount} sent successfully. Your new balance: ₹${newSenderBalance.toFixed(2)}`);
    await sendNotification(receiverId, `You received ₹${amount} in your wallet. New balance: ₹${newReceiverBalance.toFixed(2)}`);

    // Fraud detection
    await checkFraud(senderId, transactionId, amount);

  } catch (err) {
    logger.error({ err, transactionId }, "Transfer failed — initiating saga compensation");

    // Saga compensation: refund if debit already happened
    await db.update(transactionsTable)
      .set({ status: "REVERSED" })
      .where(eq(transactionsTable.id, transactionId));

    // Attempt refund
    const [senderWallet] = await db.select().from(walletsTable)
      .where(eq(walletsTable.userId, senderId)).limit(1);

    if (senderWallet && parseFloat(senderWallet.balance) < senderBalance) {
      const refundBalance = parseFloat(senderWallet.balance) + amount;
      await db.update(walletsTable)
        .set({ balance: refundBalance.toFixed(2) })
        .where(eq(walletsTable.id, senderWallet.id));

      await db.insert(ledgerEntriesTable).values({
        userId: senderId,
        transactionId,
        type: "REFUND",
        amount: amount.toFixed(2),
        balanceAfter: refundBalance.toFixed(2),
        description: "Saga compensation — transfer reversed",
      });
    }

    await kafka.publish("payment-failed", { transactionId, senderId, receiverId, amount, error: String(err) });
    await sendNotification(senderId, `Transfer of ₹${amount} failed and has been reversed to your wallet`);
  }
}

async function sendNotification(userId: string, message: string): Promise<void> {
  const types: Array<"IN_APP" | "EMAIL" | "SMS"> = ["IN_APP", "EMAIL", "SMS"];
  for (const type of types) {
    await db.insert(notificationsTable).values({
      userId,
      message,
      type,
      status: "DELIVERED",
    });
  }
  await kafka.publish("notification-events", { userId, message });
}

async function checkFraud(userId: string, transactionId: string, amount: number): Promise<void> {
  const oneMinuteAgo = new Date(Date.now() - 60_000);

  // Rule 1: More than 5 transfers in 1 minute
  const [recentCount] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(and(
      eq(transactionsTable.senderId, userId),
      eq(transactionsTable.type, "TRANSFER"),
      gte(transactionsTable.createdAt, oneMinuteAgo),
    ));

  if ((recentCount?.count ?? 0) > 5) {
    await db.insert(fraudAlertsTable).values({
      userId,
      transactionId,
      type: "RAPID_TRANSFERS",
      description: `User made ${recentCount?.count} transfers in under 1 minute`,
      severity: "HIGH",
    });
    await db.update(transactionsTable)
      .set({ isFlagged: true, flagReason: "Rapid transfers detected" })
      .where(eq(transactionsTable.id, transactionId));
    await kafka.publish("fraud-events", { userId, type: "RAPID_TRANSFERS", transactionId });
  }

  // Rule 2: Large unusual transaction (> 20000)
  if (amount > 20000) {
    await db.insert(fraudAlertsTable).values({
      userId,
      transactionId,
      type: "LARGE_TRANSACTION",
      description: `Unusually large transaction of ₹${amount}`,
      severity: amount > 40000 ? "HIGH" : "MEDIUM",
    });
    await db.update(transactionsTable)
      .set({ isFlagged: true, flagReason: "Large transaction" })
      .where(eq(transactionsTable.id, transactionId));
    await kafka.publish("fraud-events", { userId, type: "LARGE_TRANSACTION", amount, transactionId });
  }
}
