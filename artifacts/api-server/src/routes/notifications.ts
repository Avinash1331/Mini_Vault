import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { MarkNotificationReadParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import type { JwtPayload } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: JwtPayload }).user;

  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, user.userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  const unreadCount = notifications.filter(n => n.status !== "READ").length;

  res.json({
    notifications: notifications.map(n => ({
      id: n.id,
      userId: n.userId,
      message: n.message,
      type: n.type,
      status: n.status,
      createdAt: n.createdAt,
    })),
    unreadCount,
  });
});

router.post("/notifications/:notificationId/read", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: JwtPayload }).user;
  const raw = Array.isArray(req.params["notificationId"]) ? req.params["notificationId"][0] : req.params["notificationId"];

  const parsed = MarkNotificationReadParams.safeParse({ notificationId: raw });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.update(notificationsTable)
    .set({ status: "READ" })
    .where(and(
      eq(notificationsTable.id, parsed.data.notificationId),
      eq(notificationsTable.userId, user.userId),
    ));

  res.json({ success: true, message: "Notification marked as read" });
});

router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: JwtPayload }).user;

  await db.update(notificationsTable)
    .set({ status: "READ" })
    .where(eq(notificationsTable.userId, user.userId));

  res.json({ success: true, message: "All notifications marked as read" });
});

export default router;
