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
    hasPermission(session, "purchase_orders.create") ||
    hasPermission(session, "purchase_orders.approve") ||
    hasPermission(session, "catalog.stock_admin");

  if (!isAuthorized) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
    const search = url.searchParams.get("search") ?? "";
    const status = url.searchParams.get("status") ?? "";
    const supplierId = url.searchParams.get("supplierId") ?? "";

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: "insensitive" } },
        { requestedByName: { contains: search, mode: "insensitive" } },
        { remarks: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
        { items: { some: { itemName: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [purchaseOrders, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true, contactName: true, phoneNumber: true, email: true },
          },
          items: true,
          receipts: {
            take: 1,
            orderBy: { receivedAt: "desc" },
          },
          payments: {
            orderBy: { paidAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json({ purchaseOrders, total, page, pageSize });
  } catch (error: any) {
    console.error("[Purchase Orders List Error]:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isAuthorized =
    ["SUPER_ADMIN", "DEV_ADMIN"].includes(session.user.role) ||
    hasPermission(session, "purchase_orders.create") ||
    hasPermission(session, "catalog.stock_admin");

  if (!isAuthorized) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      requestDate,
      branchId,
      branchName,
      supplierId,
      requestType,
      priority,
      expectedDeliveryDate,
      remarks,
      items,
    } = body;

    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "Supplier and at least one item are required" },
        { status: 400 }
      );
    }

    // Verify supplier exists
    const supplier = await db.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return NextResponse.json({ message: "Supplier not found" }, { status: 404 });
    }

    // Generate PO Request Number POR-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await db.purchaseOrder.count({
      where: {
        createdAt: {
          gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        },
      },
    });

    const sequenceNum = String(countThisYear + 1).padStart(4, "0");
    const poNumber = `POR-${currentYear}-${sequenceNum}`;

    // Calculate total estimated cost
    const totalEstimatedCost = items.reduce(
      (sum: number, item: any) =>
        sum + (Number(item.requestedQty) || 0) * (Number(item.estimatedUnitCost) || 0),
      0
    );

    const newPO = await db.purchaseOrder.create({
      data: {
        poNumber,
        requestDate: requestDate ? new Date(requestDate) : new Date(),
        requestedById: session.user.id,
        requestedByName: session.user.name || session.user.email || "System User",
        outletId: branchId || null,
        outletName: branchName || null,
        supplierId,
        requestType: requestType || "RESTOCK",
        priority: priority || "NORMAL",
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        remarks: remarks || null,
        status: "PENDING_APPROVAL",
        totalEstimatedCost,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || null,
            itemName: item.itemName,
            sku: item.sku || null,
            requestedQty: Math.max(1, Number(item.requestedQty) || 1),
            unit: item.unit || "Pcs",
            estimatedUnitCost: Math.max(0, Number(item.estimatedUnitCost) || 0),
            reason: item.reason || null,
          })),
        },
      },
      include: {
        supplier: true,
        items: true,
      },
    });

    return NextResponse.json({ success: true, purchaseOrder: newPO });
  } catch (error: any) {
    console.error("[Create Purchase Order Error]:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
