import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-retry";

export async function GET() {
  try {
    const cities = await withDbRetry(() => db.city.findMany({
      where: { isActive: true, province: { isActive: true } },
      include: { province: { select: { name: true } } },
      orderBy: { name: "asc" },
    }), { label: "shipping-cities" });
    
    const formatted = cities.map((c) => ({
      id: c.id,
      name: c.name,
      fee: c.fee,
      isActive: c.isActive,
      provinceName: c.province.name,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("[shipping-cities] DB error after retries:", error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, message: "Service temporarily unavailable" }, { status: 503 });
  }
}
