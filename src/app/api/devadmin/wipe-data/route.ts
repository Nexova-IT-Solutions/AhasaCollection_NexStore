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

    // Execute the wipe in a transaction, safely ordering deletions to respect foreign keys
    await prisma.$transaction(async (tx) => {
      // 1. Delete deeply nested POS records
      await tx.shiftReconciliation.deleteMany();
      await tx.shiftCashCount.deleteMany();
      
      // 2. Delete Order dependencies (Returns, Reviews, Items, History)
      await tx.orderItemReturn.deleteMany();
      await tx.returnRequest.deleteMany();
      await tx.review.deleteMany();
      await tx.orderItem.deleteMany();
      await tx.orderStatusHistory.deleteMany();
      await tx.giftCardRedemption.deleteMany();

      // 3. Break cyclical dependencies between Orders and GiftCards before deletion
      await tx.order.updateMany({ data: { appliedGiftCardId: null } });
      await tx.giftCard.updateMany({ data: { purchasedInOrderId: null, orderId: null, orderItemId: null } });

      // 4. Delete GiftCards and Orders
      await tx.giftCard.deleteMany();
      await tx.order.deleteMany();
      
      // 5. Delete POS Shifts (since orders referencing them are gone)
      await tx.posShift.deleteMany();

      // 6. Delete Customer dependencies
      await tx.customerLedger.deleteMany();
      await tx.cart.deleteMany();
      await tx.session.deleteMany();
      await tx.account.deleteMany();
      await tx.address.deleteMany();

      // 7. Finally, delete all non-admin users
      await tx.user.deleteMany({
        where: {
          role: "USER"
        }
      });
    }, {
      maxWait: 10000, // 10 seconds max wait to start transaction
      timeout: 30000, // 30 seconds max execution time for wiping
    });

    return NextResponse.json({ success: true, message: "Production data wiped successfully" });
  } catch (error: any) {
    console.error("Wipe Data Error:", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
