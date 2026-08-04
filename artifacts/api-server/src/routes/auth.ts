import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, LoginResponse, GetCurrentUserResponse, LogoutResponse, CreateUserBody } from "@workspace/api-zod";
import { signToken, comparePassword, hashPassword, revokeToken } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));

  const token = signToken({ userId: user.id, username: user.username, role: user.role });

  res.json(LoginResponse.parse({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      lastLogin: user.lastLogin?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  }));
});

/**
 * First-run setup: create the initial administrator account.
 * Returns 403 immediately if any users already exist.
 */
router.post("/auth/register", async (req, res): Promise<void> => {
  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
  if (existing) {
    res.status(403).json({ error: "Registration is closed. Contact your administrator to create your account." });
    return;
  }

  const parsed = CreateUserBody.safeParse({ ...req.body, role: "administrator" });
  if (!parsed.success) {
    res.status(400).json({ error: "Provide a username (3–50 chars), a valid email, and a password of at least 8 characters." });
    return;
  }

  const { password, ...rest } = parsed.data;
  const passwordHash = await hashPassword(password);

  const [user] = await db.insert(usersTable).values({ ...rest, passwordHash }).returning();
  const token = signToken({ userId: user.id, username: user.username, role: user.role });

  res.status(201).json(LoginResponse.parse({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      lastLogin: null,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  }));
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  // Revoke the bearer token so it cannot be reused even before it expires
  if (req.authToken) {
    revokeToken(req.authToken);
  }
  res.json(LogoutResponse.parse({ success: true, message: "Logged out successfully" }));
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(GetCurrentUserResponse.parse({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mfaEnabled: user.mfaEnabled,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  }));
});

export default router;
