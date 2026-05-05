import { Router, type IRouter } from "express";
import { eq, desc, count, sum, ne, and, gte } from "drizzle-orm";
import { db, usersTable, walletsTable, transactionsTable, fraudAlertsTable } from "@workspace/db";
import { ListAdminTransactionsQueryParams } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { kafka } from "../lib/kafka";

const router: IRouter = Router();

router.get("/admin/dashboard", requireAdmin, async (_req, res): Promise<void> => {
  const [txStats] = await db
    .select({
      total: count(),
      totalVolume: sum(transactionsTable.amount),
    })
    .from(transactionsTable);

  const [successCount] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(eq(transactionsTable.status, "SUCCESS"));

  const [failedCount] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(eq(transactionsTable.status, "FAILED"));

  const [pendingCount] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(eq(transactionsTable.status, "PENDING"));

  const [reversedCount] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(eq(transactionsTable.status, "REVERSED"));

  const [walletStats] = await db
    .select({ totalBalance: sum(walletsTable.balance) })
    .from(walletsTable);

  const [userStats] = await db
    .select({ total: count() })
    .from(usersTable);

  const [fraudCount] = await db
    .select({ count: count() })
    .from(fraudAlertsTable);

  const kafkaStats = kafka.getStats();

  const total = txStats?.total ?? 0;
  const success = successCount?.count ?? 0;

  res.json({
    totalTransactions: total,
    successfulTransactions: success,
    failedTransactions: failedCount?.count ?? 0,
    pendingTransactions: pendingCount?.count ?? 0,
    reversedTransactions: reversedCount?.count ?? 0,
    totalWalletBalance: parseFloat(String(walletStats?.totalBalance ?? 0)),
    activeUsers: userStats?.total ?? 0,
    totalUsers: userStats?.total ?? 0,
    fraudAlerts: fraudCount?.count ?? 0,
    totalVolume: parseFloat(String(txStats?.totalVolume ?? 0)),
    kafkaQueueBacklog: kafkaStats.pendingMessages,
    successRate: total > 0 ? Math.round((success / total) * 100) : 0,
  });
});

router.get("/admin/transactions", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ListAdminTransactionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, status } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = status ? [eq(transactionsTable.status, status)] : [];
  const whereClause = conditions.length > 0 ? conditions[0] : undefined;

  const rows = await db.select().from(transactionsTable)
    .where(whereClause)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(whereClause);

  const allUsers = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable);
  const userMap = new Map(allUsers.map(u => [u.id, u]));

  const transactions = rows.map(tx => ({
    id: tx.id,
    senderName: tx.senderId ? userMap.get(tx.senderId)?.name : undefined,
    senderEmail: tx.senderId ? userMap.get(tx.senderId)?.email : undefined,
    receiverName: tx.receiverId ? userMap.get(tx.receiverId)?.name : undefined,
    receiverEmail: tx.receiverId ? userMap.get(tx.receiverId)?.email : undefined,
    amount: parseFloat(tx.amount),
    status: tx.status,
    type: tx.type,
    isFlagged: tx.isFlagged,
    flagReason: tx.flagReason,
    createdAt: tx.createdAt,
  }));

  res.json({ transactions, total: totalRow?.count ?? 0, page, limit });
});

router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));

  const result = await Promise.all(users.map(async (u) => {
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, u.id)).limit(1);
    const [txCount] = await db.select({ count: count() }).from(transactionsTable)
      .where(eq(transactionsTable.senderId, u.id));
    const [fraudRow] = await db.select({ count: count() }).from(fraudAlertsTable)
      .where(eq(fraudAlertsTable.userId, u.id));

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      walletBalance: parseFloat(wallet?.balance ?? "0"),
      totalTransactions: txCount?.count ?? 0,
      isFlagged: (fraudRow?.count ?? 0) > 0,
      createdAt: u.createdAt,
    };
  }));

  res.json({ users: result, total: result.length });
});

router.get("/admin/fraud-alerts", requireAdmin, async (_req, res): Promise<void> => {
  const alerts = await db.select().from(fraudAlertsTable)
    .orderBy(desc(fraudAlertsTable.createdAt))
    .limit(50);

  const allUsers = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable);
  const userMap = new Map(allUsers.map(u => [u.id, u]));

  res.json({
    alerts: alerts.map(a => ({
      id: a.id,
      userId: a.userId,
      userName: userMap.get(a.userId)?.name,
      userEmail: userMap.get(a.userId)?.email,
      type: a.type,
      description: a.description,
      severity: a.severity,
      transactionId: a.transactionId,
      createdAt: a.createdAt,
    })),
    total: alerts.length,
  });
});

router.get("/admin/kafka-stats", requireAdmin, async (_req, res): Promise<void> => {
  res.json(kafka.getStats());
});

router.get("/admin/transaction-chart", requireAdmin, async (_req, res): Promise<void> => {
  const days = 7;
  const data = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const [successRow] = await db.select({ count: count(), vol: sum(transactionsTable.amount) })
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.status, "SUCCESS"),
        gte(transactionsTable.createdAt, date),
      ));

    const [failedRow] = await db.select({ count: count() })
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.status, "FAILED"),
        gte(transactionsTable.createdAt, date),
      ));

    data.push({
      date: date.toISOString().slice(0, 10),
      successful: successRow?.count ?? 0,
      failed: failedRow?.count ?? 0,
      volume: parseFloat(String(successRow?.vol ?? 0)),
    });
  }

  res.json({ data });
});

export default router;
