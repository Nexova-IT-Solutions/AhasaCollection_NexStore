import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, { params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isAuthorized =
    ["SUPER_ADMIN", "DEV_ADMIN"].includes(session.user.role) ||
    hasPermission(session, "purchase_orders.inventory_intake") ||
    hasPermission(session, "catalog.manage_products") ||
    hasPermission(session, "catalog.manage_inventory");

  if (!isAuthorized) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { itemsIntake } = body; // Array of item intake metadata

    if (!Array.isArray(itemsIntake) || itemsIntake.length === 0) {
      return NextResponse.json(
        { message: "At least one item intake specification is required" },
        { status: 400 }
      );
    }

    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
        supplier: true,
      },
    });

    if (!po) {
      return NextResponse.json({ message: "Purchase Order not found" }, { status: 404 });
    }

    if (!["GOODS_RECEIVED", "REVIEWING"].includes(po.status)) {
      return NextResponse.json(
        { message: `Cannot intake inventory for PO in ${po.status} status` },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      for (const intakeSpec of itemsIntake) {
        const poItem = po.items.find((i) => i.id === intakeSpec.poItemId);
        if (!poItem) continue;

        const qtyToAdd = Math.max(0, Number(intakeSpec.acceptedQty ?? poItem.acceptedQty));
        if (qtyToAdd <= 0) continue;

        const costPrice = Number(intakeSpec.costPrice ?? poItem.finalUnitCost ?? poItem.estimatedUnitCost);
        const sellingPrice = Number(intakeSpec.sellingPrice ?? costPrice * 1.2);

        let targetProductId = intakeSpec.productId || poItem.productId;

        if (targetProductId) {
          // Update existing product stock and cost price
          await tx.product.update({
            where: { id: targetProductId },
            data: {
              stock: { increment: qtyToAdd },
              costPrice,
              price: sellingPrice > 0 ? sellingPrice : undefined,
              supplierId: po.supplierId,
              lastSuppliedAt: new Date(),
              outletId: po.outletId || undefined,
            },
          });
        } else {
          // Create new Product if it doesn't exist in catalog yet
          const categoryId = intakeSpec.categoryId;
          if (!categoryId) {
            throw new Error(`Category is required to add new product "${poItem.itemName}" to inventory.`);
          }

          const sku = intakeSpec.sku || poItem.sku || `SKU-PO-${Date.now().toString().slice(-6)}`;

          const newProd = await tx.product.create({
            data: {
              name: poItem.itemName,
              sku,
              categoryId,
              price: sellingPrice > 0 ? sellingPrice : costPrice * 1.2,
              costPrice,
              stock: qtyToAdd,
              supplierId: po.supplierId,
              lastSuppliedAt: new Date(),
              outletId: po.outletId || undefined,
              productImages: intakeSpec.imageUrl ? [{ url: intakeSpec.imageUrl, isMain: true }] : [],
              productVariants: [],
              isActive: true,
            },
          });

          targetProductId = newProd.id;

          // Link product back to PO item
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { productId: newProd.id },
          });
        }

        // Record Supply History log
        await tx.productSupply.create({
          data: {
            productId: targetProductId,
            supplierId: po.supplierId,
            costPrice,
            notes: `Purchase Order Intake (PO: ${po.poNumber}, Accepted Qty: ${qtyToAdd})`,
            suppliedAt: new Date(),
          },
        });
      }

      // Mark PO status as COMPLETED
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: "COMPLETED",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Received items successfully ingested into inventory!",
    });
  } catch (error: any) {
    console.error("[Inventory Intake Error]:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
