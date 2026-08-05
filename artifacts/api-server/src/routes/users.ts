import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetUsersResponse,
  CreateUserBody,
  CreateUserResponse,
  UpdateUserBody,
  UpdateUserParams,
  UpdateUserResponse,
  DeleteUserParams,
  DeleteUserResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { hashPassword } from "../lib/auth";

const router: IRouter = Router();

function mapUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    mfaEnabled: u.mfaEnabled,
    lastLogin: u.lastLogin?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/users", requireAuth, requireRole("administrator"), async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(GetUsersResponse.parse(users.map(mapUser)));
});

router.post("/users", requireAuth, requireRole("administrator"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password, ...rest } = parsed.data;
  const passwordHash = await hashPassword(password);

  let user: typeof usersTable.$inferSelect;
  try {
    [user] = await db.insert(usersTable).values({ ...rest, passwordHash }).returning();
  } catch (err: any) {
    // PostgreSQL unique-constraint violation: code 23505
    if (err?.code === "23505") {
      res.status(409).json({ error: "A user with that username or email already exists." });
      return;
    }
    throw err;
  }
  res.status(201).json(CreateUserResponse.parse(mapUser(user)));
});

router.put("/users/:id", requireAuth, requireRole("administrator"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const idParsed = UpdateUserParams.safeParse({ id: parseFloat(raw) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (password) updateData.passwordHash = await hashPassword(password);

  const [updated] = await db.update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, idParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(UpdateUserResponse.parse(mapUser(updated)));
});

router.delete("/users/:id", requireAuth, requireRole("administrator"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const idParsed = DeleteUserParams.safeParse({ id: parseFloat(raw) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  // Prevent deleting yourself
  if (idParsed.data.id === req.user!.userId) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  const [deleted] = await db.delete(usersTable)
    .where(eq(usersTable.id, idParsed.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(DeleteUserResponse.parse({ success: true, message: "User deleted" }));
});

export default router;
