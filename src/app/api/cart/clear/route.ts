import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      // It's okay if they aren't logged in, they only have a local cart anyway
      return NextResponse.json({ message: "Not logged in, local cart only" }, { status: 200 });
    }

    await db.cart.updateMany({
      where: { userId: session.user.id },
      data: { items: "[]" }
    });

    return NextResponse.json({ message: "Cart cleared successfully", success: true });
  } catch (error) {
    console.error("[CART_CLEAR_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
