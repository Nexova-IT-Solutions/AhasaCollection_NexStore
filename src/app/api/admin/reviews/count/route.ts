import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReviewStatus } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as string;
    const hasFullAccess = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(role);

    if (!hasFullAccess) {
      if (!hasPermission(session, "catalog.manage_products")) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as ReviewStatus | null;

    const count = await db.review.count({
      where: status ? { status } : {},
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Failed to fetch review count:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
