import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, ledgerEntriesTable } from "@workspace/db";
import { GetLedgerQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import type { JwtPayload } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/ledger", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: JwtPayload }).user;

  const parsed = GetLedgerQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const entries = await db.select().from(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.userId, user.userId))
    .orderBy(desc(ledgerEntriesTable.timestamp))
    .limit(limit)
    .offset(offset);

  res.json({
    entries: entries.map(e => ({
      id: e.id,
      transactionId: e.transactionId,
      type: e.type,
      amount: parseFloat(e.amount),
      balanceAfter: parseFloat(e.balanceAfter),
      description: e.description,
      timestamp: e.timestamp,
    })),
    total: entries.length,
    page,
    limit,
  });
});

export default router;
