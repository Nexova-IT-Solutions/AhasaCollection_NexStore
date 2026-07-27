import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";

export async function GET() {
  try {
    const wraps = await withDbRetry(() => db.giftWrap.findMany({
      where: { isActive: true },
      orderBy: [{ price: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
      },
    }), { label: "wrappings" });

    return NextResponse.json({ success: true, data: wraps });
  } catch (error) {
    console.error("[wrappings] DB error after retries:", error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, message: "Service temporarily unavailable" }, { status: 503 });
  }
}
