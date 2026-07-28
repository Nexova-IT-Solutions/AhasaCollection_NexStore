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
      // ── Step 1: Resolve target placement from PO destination ──
      let targetRepoId: string | null = null;
      let targetOutletId: string | null = null;

      if (po.outletId) {
        // Check if it's a Repository ID first
        const repoExists = await tx.repository.findUnique({ where: { id: po.outletId } });
        if (repoExists) {
          targetRepoId = repoExists.id;
        } else {
          // Fall back to Outlet check
          const outletExists = await tx.outlet.findUnique({ where: { id: po.outletId } });
          if (outletExists) {
            targetOutletId = outletExists.id;
          }
        }
      }

      // Try outletName if ID resolution failed
      if (!targetRepoId && !targetOutletId && po.outletName) {
        const repoByName = await tx.repository.findFirst({
          where: { name: { equals: po.outletName, mode: "insensitive" } },
        });
        if (repoByName) {
          targetRepoId = repoByName.id;
        }
      }

      // ── Fallback: default to Warehouse one if still nothing resolved ──
      if (!targetRepoId && !targetOutletId) {
        const defaultRepo = await tx.repository.findFirst({
          where: { name: { contains: "Warehouse", mode: "insensitive" } },
          orderBy: { createdAt: "asc" },
        }) ?? await tx.repository.findFirst({ orderBy: { createdAt: "asc" } });
        if (defaultRepo) {
          targetRepoId = defaultRepo.id;
        }
      }

      // ── When destination is a repo, outletId must be null (and vice versa) ──
      // Using explicit null so Prisma clears the opposite field on every product update
      const placementUpdate = targetRepoId
        ? { repositoryId: targetRepoId, outletId: null }
        : { repositoryId: null, outletId: targetOutletId };

      for (const intakeSpec of itemsIntake) {
        const poItem = po.items.find((i) => i.id === intakeSpec.poItemId);
        if (!poItem) continue;

        const qtyToAdd = Math.max(0, Number(intakeSpec.acceptedQty ?? poItem.acceptedQty));
        if (qtyToAdd <= 0) continue;

        const costPrice = Number(intakeSpec.costPrice ?? poItem.finalUnitCost ?? poItem.estimatedUnitCost);
        const sellingPrice = Number(intakeSpec.sellingPrice ?? costPrice * 1.2);

        let targetProductId = intakeSpec.productId || poItem.productId;

        if (targetProductId) {
          // Update existing product — increment stock and force correct placement
          await tx.product.update({
            where: { id: targetProductId },
            data: {
              stock: { increment: qtyToAdd },
              costPrice,
              price: sellingPrice > 0 ? sellingPrice : undefined,
              supplierId: po.supplierId,
              lastSuppliedAt: new Date(),
              ...placementUpdate,
              shortDescription: intakeSpec.shortDescription || undefined,
              description: intakeSpec.description || undefined,
              weightGrams: intakeSpec.weightGrams ? Number(intakeSpec.weightGrams) : undefined,
              rackNumber: intakeSpec.rackNumber || undefined,
              rowNumber: intakeSpec.rowNumber || undefined,
              binLocation: intakeSpec.binLocation || undefined,
              isbn: intakeSpec.isbn || undefined,
              author: intakeSpec.author || undefined,
              publisher: intakeSpec.publisher || undefined,
              isNewArrival: Boolean(intakeSpec.isNewArrival),
              isTrending: Boolean(intakeSpec.isTrending),
              isTopRated: Boolean(intakeSpec.isTopRated),
              isBestSeller: Boolean(intakeSpec.isBestSeller),
              showInDiscountSection: Boolean(intakeSpec.showInDiscountSection),
              showInChocolateSection: Boolean(intakeSpec.showInChocolateSection),
              showInSoftToysSection: Boolean(intakeSpec.showInSoftToysSection),
            },
          });
        } else {
          // ── SKU Upsert: before creating, check if a matching SKU already exists ──
          const rawSku = intakeSpec.sku || poItem.sku;
          const normalizedSku = rawSku ? String(rawSku).trim().toUpperCase() : null;

          const skuMatch = normalizedSku
            ? await tx.product.findFirst({ where: { sku: normalizedSku } })
            : null;

          if (skuMatch) {
            // SKU matched — increment stock and apply correct placement
            targetProductId = skuMatch.id;
            await tx.product.update({
              where: { id: skuMatch.id },
              data: {
                stock: { increment: qtyToAdd },
                costPrice,
                price: sellingPrice > 0 ? sellingPrice : undefined,
                supplierId: po.supplierId,
                lastSuppliedAt: new Date(),
                ...placementUpdate,
              },
            });

            // Link PO item back to the existing matched product
            await tx.purchaseOrderItem.update({
              where: { id: poItem.id },
              data: { productId: skuMatch.id },
            });
          } else {
            // No SKU match — create new Product in catalog
            const categoryId = intakeSpec.categoryId;
            if (!categoryId) {
              throw new Error(`Category is required to add new product "${poItem.itemName}" to inventory.`);
            }

            const sku = normalizedSku || `SKU-PO-${Date.now().toString().slice(-6)}`;

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
                ...placementUpdate,
                productImages: intakeSpec.imageUrl ? [{ url: intakeSpec.imageUrl, isMain: true }] : [],
                productVariants: [],
                isActive: true,
                shortDescription: intakeSpec.shortDescription || null,
                description: intakeSpec.description || null,
                weightGrams: intakeSpec.weightGrams ? Number(intakeSpec.weightGrams) : null,
                rackNumber: intakeSpec.rackNumber || null,
                rowNumber: intakeSpec.rowNumber || null,
                binLocation: intakeSpec.binLocation || null,
                isbn: intakeSpec.isbn || null,
                author: intakeSpec.author || null,
                publisher: intakeSpec.publisher || null,
                isNewArrival: Boolean(intakeSpec.isNewArrival),
                isTrending: Boolean(intakeSpec.isTrending),
                isTopRated: Boolean(intakeSpec.isTopRated),
                isBestSeller: Boolean(intakeSpec.isBestSeller),
                showInDiscountSection: Boolean(intakeSpec.showInDiscountSection),
                showInChocolateSection: Boolean(intakeSpec.showInChocolateSection),
                showInSoftToysSection: Boolean(intakeSpec.showInSoftToysSection),
              },
            });

            targetProductId = newProd.id;

            // Link product back to PO item
            await tx.purchaseOrderItem.update({
              where: { id: poItem.id },
              data: { productId: newProd.id },
            });
          }
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
