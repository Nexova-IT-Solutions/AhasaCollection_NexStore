import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "DEV_ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    if (body.confirmation !== "WIPE PRODUCTION DATA") {
      return new NextResponse("Invalid confirmation", { status: 400 });
    }

    const {
      wipeOrders = true,
      wipePurchaseOrders = false,
      wipeProducts = false,
      wipeCategories = false,
      wipeOutlets = false,
      wipeRepositories = false,
      wipeUsers = true,
    } = body.targets || {};

    // Execute the wipe in a transaction, safely ordering deletions to respect foreign keys
    await prisma.$transaction(async (tx) => {
      // 1. Wipe Orders & POS Sales Data if selected (or required as dependency)
      if (wipeOrders || wipeProducts || wipeOutlets || wipeRepositories) {
        await tx.stockTransferLog.deleteMany();
        await tx.shiftReconciliation.deleteMany();
        await tx.shiftCashCount.deleteMany();
        await tx.orderItemReturn.deleteMany();
        await tx.returnRequest.deleteMany();
        await tx.review.deleteMany();
        await tx.orderItem.deleteMany();
        await tx.orderStatusHistory.deleteMany();
        await tx.giftCardRedemption.deleteMany();

        await tx.order.updateMany({ data: { appliedGiftCardId: null } });
        await tx.giftCard.updateMany({ data: { purchasedInOrderId: null, orderId: null, orderItemId: null } });

        await tx.giftCard.deleteMany();
        await tx.order.deleteMany();
        await tx.posShift.deleteMany();
      }

      // 2. Wipe Purchase Orders & Supplier Payments if selected
      if (wipePurchaseOrders || wipeProducts) {
        await tx.purchaseOrderReceiptItem.deleteMany();
        await tx.purchaseOrderReceipt.deleteMany();
        await tx.supplierPayment.deleteMany();
        await tx.purchaseOrderItem.deleteMany();
        await tx.purchaseOrder.deleteMany();
      }

      // 3. Wipe Products (GiftBoxItems, ProductMood, ProductSupply, Product) if selected
      if (wipeProducts || wipeCategories || wipeOutlets || wipeRepositories) {
        await tx.giftBoxItem.deleteMany();
        await tx.productSupply.deleteMany();
        await tx.productMood.deleteMany();
        await tx.product.deleteMany();
      }

      // 4. Wipe Categories if selected
      if (wipeCategories) {
        // Disconnect parent categories first
        await tx.category.updateMany({ data: { parentId: null } });
        await tx.category.deleteMany();
      }

      // 5. Wipe Outlets if selected
      if (wipeOutlets) {
        await tx.user.updateMany({ data: { outletId: null } });
        await tx.outlet.deleteMany();
      }

      // 6. Wipe Repositories if selected
      if (wipeRepositories) {
        await tx.repository.deleteMany();
      }

      // 7. Wipe Customer Accounts & Sessions if selected
      if (wipeUsers || wipeOrders) {
        await tx.customerLedger.deleteMany();
        await tx.cart.deleteMany();
        await tx.session.deleteMany();
        await tx.account.deleteMany();
        await tx.address.deleteMany();

        if (wipeUsers) {
          await tx.user.deleteMany({
            where: {
              role: "USER"
            }
          });
        }
      }
    }, {
      maxWait: 10000,
      timeout: 60000,
    });

    return NextResponse.json({ success: true, message: "Selected data wiped successfully" });
  } catch (error: any) {
    console.error("Wipe Data Error:", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
