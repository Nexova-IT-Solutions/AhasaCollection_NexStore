import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const denominations = await db.giftCardDenomination.findMany({
      where: { isActive: true },
      orderBy: { value: "asc" },
    });

    return NextResponse.json({ denominations });
  } catch (error) {
    console.error("[GIFT_CARD_DENOMINATIONS_GET]", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
