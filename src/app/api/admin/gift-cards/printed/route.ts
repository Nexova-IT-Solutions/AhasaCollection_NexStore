import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "POS_ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, initialValue, count = 1 } = await req.json();

    if (!initialValue || initialValue <= 0) {
      return NextResponse.json({ error: "Initial value must be greater than 0" }, { status: 400 });
    }

    if (count > 1) {
      // Batch registration
      const newCards = [];
      for (let i = 0; i < count; i++) {
        const randomCode = crypto.randomBytes(6).toString('hex').toUpperCase();
        const formattedCode = `${randomCode.slice(0, 4)}-${randomCode.slice(4, 8)}-${randomCode.slice(8, 12)}`;
        
        newCards.push({
          code: formattedCode,
          initialValue: Number(initialValue),
          balance: Number(initialValue),
          type: "PRINTED" as any,
          status: "AVAILABLE",
          isActive: true,
        });
      }

      await db.giftCard.createMany({
        data: newCards
      });

      return NextResponse.json({ success: true, message: `${count} cards registered successfully` });
    } else {
      // Single card registration
      const finalCode = code || crypto.randomBytes(6).toString('hex').toUpperCase();
      
      const card = await db.giftCard.create({
        data: {
          code: finalCode,
          initialValue: Number(initialValue),
          balance: Number(initialValue),
          type: "PRINTED" as any,
          status: "AVAILABLE",
          isActive: true,
        }
      });

      return NextResponse.json({ success: true, card });
    }

  } catch (error: any) {
    console.error("[ADMIN_GIFT_CARD_POST]", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Gift card code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
