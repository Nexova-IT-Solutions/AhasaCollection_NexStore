import { Prisma } from "@prisma/client";

/**
 * A utility to wrap database calls with exponential backoff retries,
 * specifically targeting transient connection issues (like Supabase PgBouncer pooler).
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; baseDelayMs?: number; label?: string }
): Promise<T> {
  const retries = options?.retries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 500;
  const label = options?.label ?? "query";

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;

      // Check if the error is a known Prisma transient connection error
      let isTransient = false;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P1001: Can't reach database server
        // P1002: The database server was reached but timed out
        // P1017: Server has closed the connection
        if (["P1001", "P1002", "P1017"].includes(error.code)) {
          isTransient = true;
        }
      } else if (error instanceof Prisma.PrismaClientInitializationError) {
        // Sometimes pooler connection errors surface as initialization errors
        isTransient = true;
      } else if (error instanceof Error) {
        // Fallback for generic network errors that Prisma might bubble up
        const msg = error.message.toLowerCase();
        if (msg.includes("fetch failed") || msg.includes("network") || msg.includes("econnrefused") || msg.includes("timeout")) {
          isTransient = true;
        }
      }

      if (!isTransient || attempt > retries) {
        throw error; // Not a transient error, or we exhausted retries
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[db-retry] ${label} failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`);
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
