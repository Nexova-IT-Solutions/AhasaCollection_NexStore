import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isAuthorized =
    ["SUPER_ADMIN", "DEV_ADMIN"].includes(session.user.role) ||
    hasPermission(session, "catalog.stock_admin") ||
    hasPermission(session, "reports.stock_audit");

  if (!isAuthorized) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") ?? "50", 10);
    const search = url.searchParams.get("search") ?? "";
    const outletId = url.searchParams.get("outletId") ?? "";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";

    const where: any = {};

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: "insensitive" } },
        { productSku: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
      ];
    }

    if (outletId) {
      where.OR = [
        { sourceOutletId: outletId },
        { targetOutletId: outletId },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [transfers, total] = await Promise.all([
      db.stockTransferLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.stockTransferLog.count({ where }),
    ]);

    // Resolve outlet names and performer info
    const [outlets, performers] = await Promise.all([
      db.outlet.findMany({ select: { id: true, name: true } }),
      db.user.findMany({
        where: { id: { in: [...new Set(transfers.map((t) => t.performedById))] } },
        select: { id: true, name: true, email: true },
      }),
    ]);

    const outletMap = Object.fromEntries(outlets.map((o) => [o.id, o.name]));
    const userMap = Object.fromEntries(performers.map((u) => [u.id, u.name || u.email]));

    const enriched = transfers.map((t) => ({
      ...t,
      sourceOutletName: t.sourceOutletId ? (outletMap[t.sourceOutletId] ?? "Unknown") : "—",
      targetOutletName: t.targetOutletId ? (outletMap[t.targetOutletId] ?? "Unknown") : "—",
      performedByName: userMap[t.performedById] ?? "Unknown",
    }));

    return NextResponse.json({ transfers: enriched, total, page, pageSize });
  } catch (error: any) {
    console.error("[Stock Transfers Report Error]:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
