import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { CONFIG } from "./config";

const JWT_SECRET = process.env.SESSION_SECRET ?? "aippmcs-dev-secret-change-in-prod";

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: CONFIG.SECURITY.JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, CONFIG.SECURITY.BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── Token revocation ────────────────────────────────────────────────────────
// In-memory blocklist — cleared on process restart.
// Replace with a Redis SET or DB table for persistence across restarts.

const _revokedTokens = new Set<string>();

export function revokeToken(token: string): void {
  _revokedTokens.add(token);
}

export function isTokenRevoked(token: string): boolean {
  return _revokedTokens.has(token);
}
