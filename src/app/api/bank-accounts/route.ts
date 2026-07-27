import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";

/**
 * GET /api/bank-accounts
 * Public endpoint to fetch active bank accounts for checkout
 */
export async function GET() {
  try {
    const bankAccounts = await withDbRetry(() => db.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    }), { label: "bank-accounts" });

    return NextResponse.json({
      success: true,
      data: bankAccounts,
    });
  } catch (error) {
    console.error("[bank-accounts] DB error after retries:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        success: false,
        message: "Service temporarily unavailable",
      },
      { status: 503 }
    );
  }
}
