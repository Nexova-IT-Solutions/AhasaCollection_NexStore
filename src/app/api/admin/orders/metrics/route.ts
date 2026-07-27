import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as string;
  const hasFullAccess = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(role);

  if (!hasFullAccess) {
    if (!hasPermission(session, "pos.manage_orders")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
  }

  const pendingOrders = await db.order.count({ where: { orderStatus: "PENDING" } });
  const totalOrders = await db.order.count();

  return NextResponse.json({ success: true, pendingOrders, totalOrders });
}
