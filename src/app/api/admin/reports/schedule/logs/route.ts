import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!hasPermission(session, "reports.sales_summary")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const logs = await db.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error("Error fetching email logs:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
