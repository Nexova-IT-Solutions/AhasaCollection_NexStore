import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { value, isActive, sortOrder } = body;

    const denomination = await db.giftCardDenomination.update({
      where: { id },
      data: {
        ...(value !== undefined && { value }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(denomination);
  } catch (error: any) {
    console.error("[ADMIN_GIFT_CARD_DENOMINATION_PATCH]", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ message: "Denomination with this value already exists" }, { status: 409 });
    }
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    await db.giftCardDenomination.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_GIFT_CARD_DENOMINATION_DELETE]", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
