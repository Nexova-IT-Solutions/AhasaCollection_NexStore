import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN", "PRODUCT_MANAGER"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const where = q
      ? {
          name: { contains: q, mode: "insensitive" as const },
        }
      : {};

    const outlets = await db.outlet.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(outlets);
  } catch (error) {
    console.error("GET_OUTLETS_ERROR:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DEV_ADMIN") {
      return NextResponse.json({ message: "Unauthorized: DEV_ADMIN only" }, { status: 403 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ message: "Outlet name is required" }, { status: 400 });
    }

    const newOutlet = await db.outlet.create({
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(newOutlet, { status: 201 });
  } catch (error: any) {
    console.error("POST_OUTLET_ERROR:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DEV_ADMIN") {
      return NextResponse.json({ message: "Unauthorized: DEV_ADMIN only" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, isActive } = body;

    if (!id) {
      return NextResponse.json({ message: "Missing outlet ID" }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }
    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }

    const updated = await db.outlet.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH_OUTLET_ERROR:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DEV_ADMIN") {
      return NextResponse.json({ message: "Unauthorized: DEV_ADMIN only" }, { status: 403 });
    }

    const { id, deleteWithContent } = await req.json();
    if (!id) return NextResponse.json({ message: "Missing outlet ID" }, { status: 400 });

    if (deleteWithContent) {
      // Find staff users belonging to this outlet to find orders associated with this outlet
      const outletStaff = await db.user.findMany({
        where: { outletId: id },
        select: { id: true },
      });
      const staffUserIds = outletStaff.map((u) => u.id);

      await db.$transaction(async (tx) => {
        // 1. Find order IDs placed by users in this outlet
        const ordersToDelete = await tx.order.findMany({
          where: { userId: { in: staffUserIds } },
          select: { id: true },
        });
        const orderIds = ordersToDelete.map((o) => o.id);

        if (orderIds.length > 0) {
          // Delete OrderItemReturns, OrderItems, OrderStatusHistories
          await tx.orderItemReturn.deleteMany({ where: { orderId: { in: orderIds } } });
          await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
          await tx.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
          await tx.order.deleteMany({ where: { id: { in: orderIds } } });
        }

        // 2. Delete products tagged to this outlet
        await tx.product.deleteMany({
          where: { outletId: id },
        });

        // 3. Unassign staff users or delete them? Unassign staff users to keep dev admin accounts safe
        await tx.user.updateMany({
          where: { outletId: id },
          data: { outletId: null },
        });

        // 4. Finally delete the outlet itself
        await tx.outlet.delete({ where: { id } });
      });
    } else {
      // Soft unassign products & staff then delete outlet
      await db.product.updateMany({
        where: { outletId: id },
        data: { outletId: null },
      });
      await db.user.updateMany({
        where: { outletId: id },
        data: { outletId: null },
      });
      await db.outlet.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE_OUTLET_ERROR:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
