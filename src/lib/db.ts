/**
 * @file src/lib/db.ts
 * @description Production-grade Prisma Client singleton for serverless (Vercel) + Supabase PgBouncer.
 *
 * Key design decisions:
 *  - Global singleton pattern prevents re-instantiation across hot-reloads in dev
 *    AND across concurrent serverless function invocations in production.
 *  - connection_limit=1 in the DATABASE_URL (transaction mode pooler) ensures each
 *    Vercel function only ever holds ONE connection from the Supabase PgBouncer pool.
 *    This is the most critical lever to avoid EMAXCONNSESSION.
 *  - Structured logging is environment-aware: full query tracing in dev, errors only
 *    in production to avoid log volume noise.
 *  - The version key (`prisma_v8_sb`) should be bumped whenever the Prisma schema
 *    has a breaking model change, to force re-initialisation in all envs.
 */

import { PrismaClient, Prisma } from "@prisma/client";

// ─── Logging Configuration ────────────────────────────────────────────────────

type LogLevel = Prisma.LogLevel;

const devLogs: LogLevel[] = ["warn", "error"];
const prodLogs: LogLevel[] = ["warn", "error"];

const logConfig = process.env.NODE_ENV === "production" ? prodLogs : devLogs;

// ─── Factory ──────────────────────────────────────────────────────────────────

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: logConfig,
    // Datasource override is NOT needed here; the connection strings are fully
    // configured via DATABASE_URL / DIRECT_URL in the environment (see .env.local
    // and Vercel environment variables). PgBouncer parameters (?pgbouncer=true
    // &connection_limit=1) must be encoded in DATABASE_URL at the env level.
    //
    // Do NOT pass `datasources: { db: { url: ... } }` here unless you have a
    // dynamic multi-tenant use case — it bypasses prisma.schema validation.
  });
}

// ─── Global Key ───────────────────────────────────────────────────────────────
//
// Bump this key when there is a breaking schema change that would make a cached
// client instance invalid (e.g. new model or renamed relation).
const GLOBAL_KEY = "prisma_v12_sb" as const;

type GlobalPrismaStore = {
  [GLOBAL_KEY]?: PrismaClient;
};

// Cast globalThis once — avoids type errors without polluting global namespace.
const globalStore = globalThis as unknown as GlobalPrismaStore;

// ─── Singleton Export ─────────────────────────────────────────────────────────
//
// In production:  a new PrismaClient is created per cold-start (Vercel isolate
//                 lifetime). The `??` prevents double-init within the same isolate.
// In development: the client is pinned to `globalThis` so Next.js HMR doesn't
//                 create a new pool on every file change.

export const db: PrismaClient =
  globalStore[GLOBAL_KEY] ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  // Only persist on globalThis in development; production Vercel functions
  // are isolated per-invocation anyway.
  globalStore[GLOBAL_KEY] = db;
}

// ─── Mood Model Helper ────────────────────────────────────────────────────────
//
// The `mood` relation is accessed dynamically to support optional schema
// configurations where the Mood model may not be present in every deployment.

export function getMoodClient(): {
  findMany: (...args: unknown[]) => Promise<unknown>;
  create: (...args: unknown[]) => Promise<unknown>;
  update: (...args: unknown[]) => Promise<unknown>;
  delete: (...args: unknown[]) => Promise<unknown>;
} | null {
  try {
    const moodClient = (db as unknown as Record<string, unknown>)["mood"];

    if (
      !moodClient ||
      typeof moodClient !== "object" ||
      typeof (moodClient as Record<string, unknown>)["findMany"] !== "function"
    ) {
      return null;
    }

    return moodClient as ReturnType<typeof getMoodClient>;
  } catch {
    return null;
  }
}