import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { CONFIG } from "./lib/config";

// ── Startup validation ───────────────────────────────────────────────────────
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET === "aippmcs-dev-secret-change-in-prod") {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET must be set to a strong random value in production. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  logger.warn(
    "SESSION_SECRET is using the insecure development default — " +
    "set a strong value via REPLIT Secrets before deploying"
  );
}

const app: Express = express();

// ── Trust the Replit proxy so rate-limiter reads the real client IP ───────────
// Replit terminates TLS at its edge and forwards requests via a single proxy.
// Setting trust proxy = 1 tells express-rate-limit to read X-Forwarded-For.
app.set("trust proxy", 1);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,     // configure explicitly before enabling
    crossOriginEmbedderPolicy: false, // needed for Replit iframe preview
  })
);

// ── CORS — allow only Replit preview and localhost ───────────────────────────
const ALLOWED_ORIGIN_PATTERNS = [
  /\.replit\.dev$/,
  /\.repl\.co$/,
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // same-origin or non-browser
      if (ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin))) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

// ── Request logging ──────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Auth rate limiting (applied before the main router) ──────────────────────
const authRateLimiter = rateLimit({
  windowMs: CONFIG.SECURITY.RATE_LIMIT_WINDOW_MS,
  max: CONFIG.SECURITY.RATE_LIMIT_MAX_AUTH,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  skip: () => process.env.NODE_ENV === "test",
});

app.use("/api/auth", authRateLimiter);

app.use("/api", router);

export default app;
