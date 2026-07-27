import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";

export async function GET() {
  try {
    const gateways = await withDbRetry(() => db.paymentGateway.findMany({
      where: { isActive: true },
      select: {
        name: true,
        feeType: true,
        feeValue: true,
        mode: true,
        // config is EXCLUDED for security
      }
    }), { label: "payment-gateways" });

    return NextResponse.json({
      success: true,
      data: gateways
    });
  } catch (error) {
    console.error("[payment-gateways] DB error after retries:", error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, message: "Service temporarily unavailable" }, { status: 503 });
  }
}
