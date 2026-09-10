/**
 * Server-only production fallbacks when the host has not injected env
 * (user-owned Vercel project). Live preview ignores this and stays on PGLite.
 * Prefer a real `DATABASE_URL` env var when one is available.
 */
export const vercelDatabaseUrl =
  "postgresql://neondb_owner:npg_S23okJxywzEQ@ep-ancient-dream-aex3zrb2-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";
