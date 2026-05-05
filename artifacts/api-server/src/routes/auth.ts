import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, ilike } from "drizzle-orm";
import { db, usersTable, walletsTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { signToken, requireAuth } from "../middlewares/auth";
import type { JwtPayload } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash }).returning();

  const [wallet] = await db.insert(walletsTable).values({ userId: user.id }).returning();

  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
  const token = signToken(payload);

  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      walletId: wallet.id,
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id)).limit(1);

  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
  const token = signToken(payload);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      walletId: wallet?.id,
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: JwtPayload }).user;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId)).limit(1);
  if (!dbUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, dbUser.id)).limit(1);
  res.json({
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    createdAt: dbUser.createdAt,
    walletId: wallet?.id,
  });
});

router.get("/users/search", requireAuth, async (req, res): Promise<void> => {
  const user = (req as typeof req & { user: JwtPayload }).user;
  const q = String(req.query["q"] ?? "").trim();
  if (!q) {
    res.json({ users: [] });
    return;
  }
  const results = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(ilike(usersTable.email, `%${q}%`))
    .limit(10);

  res.json({ users: results.filter(u => u.id !== user.userId) });
});

export default router;
