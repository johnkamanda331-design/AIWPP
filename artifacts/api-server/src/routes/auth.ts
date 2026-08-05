import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, LoginResponse, GetCurrentUserResponse, LogoutResponse, CreateUserBody } from "@workspace/api-zod";
import { signToken, comparePassword, hashPassword, revokeToken } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// ─── Server-side failed-attempt tracking (in-memory, resets on restart) ───────
// Tracks failed login attempts per username (case-insensitive).
// After MAX_ATTEMPTS failures the account is locked for LOCKOUT_SECONDS.

interface FailRecord { count: number; lockedUntil: Date | null }
const failedAttempts = new Map<string, FailRecord>();
const MAX_ATTEMPTS     = 5;
const LOCKOUT_SECONDS  = 30;

function getRecord(username: string): FailRecord {
  return failedAttempts.get(username.toLowerCase()) ?? { count: 0, lockedUntil: null };
}

function checkLockout(username: string): { locked: boolean; remainingSeconds: number } {
  const rec = getRecord(username);
  if (!rec.lockedUntil) return { locked: false, remainingSeconds: 0 };
  const remaining = Math.ceil((rec.lockedUntil.getTime() - Date.now()) / 1000);
  if (remaining <= 0) {
    failedAttempts.delete(username.toLowerCase());
    return { locked: false, remainingSeconds: 0 };
  }
  return { locked: true, remainingSeconds: remaining };
}

function recordFailure(username: string): void {
  const key = username.toLowerCase();
  const rec = getRecord(username);
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = new Date(Date.now() + LOCKOUT_SECONDS * 1000);
    rec.count = 0;
  }
  failedAttempts.set(key, rec);
}

function clearFailures(username: string): void {
  failedAttempts.delete(username.toLowerCase());
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Provide a valid username and password." });
    return;
  }

  const { username, password } = parsed.data;

  // Check lockout first — before hitting the DB
  const lockout = checkLockout(username);
  if (lockout.locked) {
    res.status(429).json({
      error: `Account temporarily locked after ${MAX_ATTEMPTS} failed attempts.`,
      remainingSeconds: lockout.remainingSeconds,
    });
    return;
  }

  // Lookup user
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));

  // Inactive account — same 401 message to avoid user enumeration
  if (!user || !user.isActive) {
    recordFailure(username);
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }

  // Password check
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    recordFailure(username);
    const { remainingSeconds } = checkLockout(username);
    if (remainingSeconds > 0) {
      res.status(429).json({
        error: `Account temporarily locked after ${MAX_ATTEMPTS} failed attempts.`,
        remainingSeconds,
      });
    } else {
      const rec = getRecord(username);
      const left = MAX_ATTEMPTS - rec.count;
      res.status(401).json({
        error: "Invalid username or password.",
        attemptsRemaining: left > 0 ? left : 0,
      });
    }
    return;
  }

  // Success — clear failures and issue token
  clearFailures(username);
  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));
  const token = signToken({ userId: user.id, username: user.username, role: user.role });

  res.json(LoginResponse.parse({
    user: {
      id:         user.id,
      username:   user.username,
      email:      user.email,
      role:       user.role,
      isActive:   user.isActive,
      mfaEnabled: user.mfaEnabled,
      lastLogin:  user.lastLogin?.toISOString() ?? null,
      createdAt:  user.createdAt.toISOString(),
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
    res.status(403).json({
      error: "Registration is closed. Contact your administrator to create your account.",
    });
    return;
  }

  const parsed = CreateUserBody.safeParse({ ...req.body, role: "administrator" });
  if (!parsed.success) {
    res.status(400).json({
      error: "Provide a username (3–50 chars), a valid email, and a password of at least 8 characters.",
    });
    return;
  }

  const { password, ...rest } = parsed.data;
  const passwordHash = await hashPassword(password);

  let user: typeof usersTable.$inferSelect;
  try {
    [user] = await db.insert(usersTable).values({ ...rest, passwordHash }).returning();
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "A user with that username or email already exists." });
      return;
    }
    throw err;
  }

  const token = signToken({ userId: user.id, username: user.username, role: user.role });
  res.status(201).json(LoginResponse.parse({
    user: {
      id:         user.id,
      username:   user.username,
      email:      user.email,
      role:       user.role,
      isActive:   user.isActive,
      mfaEnabled: user.mfaEnabled,
      lastLogin:  null,
      createdAt:  user.createdAt.toISOString(),
    },
    token,
  }));
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  if (req.authToken) revokeToken(req.authToken);
  res.json(LogoutResponse.parse({ success: true, message: "Logged out successfully" }));
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(GetCurrentUserResponse.parse({
    id:         user.id,
    username:   user.username,
    email:      user.email,
    role:       user.role,
    isActive:   user.isActive,
    mfaEnabled: user.mfaEnabled,
    lastLogin:  user.lastLogin?.toISOString() ?? null,
    createdAt:  user.createdAt.toISOString(),
  }));
});

export default router;
