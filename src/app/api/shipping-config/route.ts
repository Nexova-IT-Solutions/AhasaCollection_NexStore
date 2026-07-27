import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureShippingConfig } from "@/lib/shipping-config";
import { withDbRetry } from "@/lib/db-retry";

/**
 * GET /api/shipping-config
 * Public endpoint to fetch shipping configuration
 * Guarantees a default config exists via upsert
 */
export async function GET(request: NextRequest) {
  try {
    const config = await withDbRetry(() => ensureShippingConfig(db as any), { label: "shipping-config" });

    return NextResponse.json(
      {
        success: true,
        data: config,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[shipping-config] DB error after retries:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        success: false,
        message: "Service temporarily unavailable",
      },
      { status: 503 }
    );
  }
}
