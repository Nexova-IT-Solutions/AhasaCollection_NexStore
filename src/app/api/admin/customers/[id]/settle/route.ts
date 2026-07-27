import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!hasPermission(session, "customers.manage")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const customerId = params.id;
    const body = await req.json();
    const { amount, paymentMethod, note } = body;

    if (!amount || amount <= 0 || !paymentMethod) {
      return NextResponse.json(
        { success: false, message: "Invalid amount or payment method" },
        { status: 400 }
      );
    }

    const customer = await db.user.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
    }

    if (customer.outstandingBalance < amount) {
      return NextResponse.json(
        { success: false, message: "Payment amount exceeds outstanding balance." },
        { status: 400 }
      );
    }

    // Atomic transaction for settling debt
    const result = await db.$transaction(async (tx) => {
      // 1. Create CREDIT ledger entry
      const ledgerEntry = await tx.customerLedger.create({
        data: {
          userId: customerId,
          amount: amount,
          type: "CREDIT",
          description: note || "Debt settlement payment",
          paymentMethod: paymentMethod,
        }
      });

      // 2. Decrement User outstandingBalance
      await tx.user.update({
        where: { id: customerId },
        data: { outstandingBalance: { decrement: amount } }
      });

      return ledgerEntry;
    });

    return NextResponse.json({ success: true, ledgerEntry: result });
  } catch (error) {
    console.error("Error settling debt:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
