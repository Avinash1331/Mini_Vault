import { Router, type IRouter } from "express";
import { eq, or, and, desc } from "drizzle-orm";
import { db, transactionsTable, usersTable } from "@workspace/db";
import { ListTransactionsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import type { JwtPayload } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/transactions", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: JwtPayload }).user;

  const parsed = ListTransactionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, status } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [
    or(
      eq(transactionsTable.senderId, user.userId),
      eq(transactionsTable.receiverId, user.userId),
    ),
  ];

  if (status) {
    conditions.push(eq(transactionsTable.status, status));
  }

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  const rows = await db.select().from(transactionsTable)
    .where(whereClause)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const userIds = [...new Set([
    ...rows.map(r => r.senderId).filter(Boolean),
    ...rows.map(r => r.receiverId).filter(Boolean),
  ])] as string[];

  const userMap = new Map<string, { name: string; email: string }>();
  if (userIds.length > 0) {
    const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable);
    for (const u of users) userMap.set(u.id, { name: u.name, email: u.email });
  }

  const transactions = rows.map(tx => ({
    id: tx.id,
    senderId: tx.senderId,
    senderName: tx.senderId ? userMap.get(tx.senderId)?.name : undefined,
    senderEmail: tx.senderId ? userMap.get(tx.senderId)?.email : undefined,
    receiverId: tx.receiverId,
    receiverName: tx.receiverId ? userMap.get(tx.receiverId)?.name : undefined,
    receiverEmail: tx.receiverId ? userMap.get(tx.receiverId)?.email : undefined,
    amount: parseFloat(tx.amount),
    status: tx.status,
    type: tx.type,
    note: tx.note,
    idempotencyKey: tx.idempotencyKey,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  }));

  res.json({ transactions, total: transactions.length, page, limit });
});

export default router;
