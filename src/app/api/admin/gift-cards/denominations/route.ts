import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const denominations = await db.giftCardDenomination.findMany({
      orderBy: { value: "asc" },
    });

    return NextResponse.json(denominations);
  } catch (error) {
    console.error("[ADMIN_GIFT_CARD_DENOMINATIONS_GET]", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { value, sortOrder } = body;

    if (!value || typeof value !== "number" || value <= 0) {
      return NextResponse.json({ message: "Value must be a positive number" }, { status: 400 });
    }

    const existing = await db.giftCardDenomination.findUnique({
      where: { value },
    });

    if (existing) {
      return NextResponse.json({ message: "Denomination with this value already exists" }, { status: 409 });
    }

    const denomination = await db.giftCardDenomination.create({
      data: {
        value,
        sortOrder: sortOrder || 0,
        isActive: true,
      },
    });

    return NextResponse.json(denomination, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_GIFT_CARD_DENOMINATIONS_POST]", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
