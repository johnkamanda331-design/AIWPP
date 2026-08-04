/**
 * Centralised application constants.
 * Import from here instead of hardcoding values in route/middleware files.
 */
export const CONFIG = {
  SECURITY: {
    BCRYPT_ROUNDS: 10,
    JWT_EXPIRY: "24h",
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX_AUTH: 20,              // max auth attempts per window
  },
  MONITORING: {
    MAX_CHART_POINTS: 40,
    POLL_INTERVAL_MS: 2000,
    HISTORY_DEFAULT_LIMIT: 300,
    HISTORY_MAX_LIMIT: 1000,
    TELEMETRY_RETENTION_DAYS: 30,
  },
  PAGINATION: {
    DEFAULT_LIMIT: 100,
    MAX_LIMIT: 1000,
  },
} as const;
