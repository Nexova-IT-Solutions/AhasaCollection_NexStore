import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!hasPermission(session, "reports.sales_summary")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const schedule = await db.scheduledReport.findUnique({
      where: { reportType: "SALES_SUMMARY" },
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error("Error fetching report schedule:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!hasPermission(session, "reports.sales_summary")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { enabled, emailAddress, ownerName, scheduleTime } = body;

    const schedule = await db.scheduledReport.upsert({
      where: { reportType: "SALES_SUMMARY" },
      update: {
        enabled: Boolean(enabled),
        emailAddress: emailAddress || "",
        ownerName: ownerName || "",
        scheduleTime: scheduleTime || "00:00",
      },
      create: {
        reportType: "SALES_SUMMARY",
        enabled: Boolean(enabled),
        emailAddress: emailAddress || "",
        ownerName: ownerName || "",
        scheduleTime: scheduleTime || "00:00",
      },
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error("Error saving report schedule:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
