import type { Request, Response, NextFunction } from "express";
import { verifyToken, isTokenRevoked, type JwtPayload } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      /** Raw bearer token — stored here so logout can revoke it. */
      authToken?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.slice(7);

  if (isTokenRevoked(token)) {
    res.status(401).json({ error: "Token has been revoked. Please log in again." });
    return;
  }

  try {
    req.user = verifyToken(token);
    req.authToken = token; // stash for logout revocation
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
