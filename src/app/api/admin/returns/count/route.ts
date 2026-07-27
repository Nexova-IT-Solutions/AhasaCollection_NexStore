import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as string;
    const hasFullAccess = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(role);

    if (!hasFullAccess) {
      if (!hasPermission(session, "pos.manage_returns")) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const count = await db.returnRequest.count({
      where,
    });

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error("[RETURNS_COUNT_GET]", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
