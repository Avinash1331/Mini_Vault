import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, transactionsTable, usersTable } from "@workspace/db";
import { InitiateTransferBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import type { JwtPayload } from "../middlewares/auth";
import { processTransfer } from "../lib/payment";

const router: IRouter = Router();

router.post("/transfers/initiate", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: JwtPayload }).user;

  const parsed = InitiateTransferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await processTransfer({
      senderId: user.userId,
      receiverEmail: parsed.data.receiverEmail,
      amount: parsed.data.amount,
      note: parsed.data.note,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    const statusCode = result.isDuplicate ? 409 : 202;
    res.status(statusCode).json(result);
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    if (error.code === "RATE_LIMIT") {
      res.status(429).json({ error: error.message });
      return;
    }
    if (error.code === "INSUFFICIENT_FUNDS" || error.code === "DAILY_LIMIT") {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: error.message ?? "Transfer failed" });
  }
});

router.get("/transfers/:transactionId/status", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: JwtPayload }).user;
  const raw = Array.isArray(req.params["transactionId"]) ? req.params["transactionId"][0] : req.params["transactionId"];

  const [tx] = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.id, raw)).limit(1);

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  // Only sender or receiver can view
  if (tx.senderId !== user.userId && tx.receiverId !== user.userId && user.role !== "admin") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  let senderName: string | undefined, senderEmail: string | undefined;
  let receiverName: string | undefined, receiverEmail: string | undefined;

  if (tx.senderId) {
    const [s] = await db.select().from(usersTable).where(eq(usersTable.id, tx.senderId)).limit(1);
    senderName = s?.name;
    senderEmail = s?.email;
  }
  if (tx.receiverId) {
    const [r] = await db.select().from(usersTable).where(eq(usersTable.id, tx.receiverId)).limit(1);
    receiverName = r?.name;
    receiverEmail = r?.email;
  }

  res.json({
    id: tx.id,
    senderId: tx.senderId,
    senderName,
    senderEmail,
    receiverId: tx.receiverId,
    receiverName,
    receiverEmail,
    amount: parseFloat(tx.amount),
    status: tx.status,
    type: tx.type,
    note: tx.note,
    idempotencyKey: tx.idempotencyKey,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  });
});

export default router;
