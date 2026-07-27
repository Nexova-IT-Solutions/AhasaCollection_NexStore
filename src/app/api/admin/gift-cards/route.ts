import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Number.parseInt(searchParams.get("page") || "", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "", 10);
    const hasPagination = Number.isFinite(page) && Number.isFinite(pageSize) && page > 0 && pageSize > 0;

    const where = q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" as const } },
            { currency: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const take = hasPagination ? Math.min(pageSize, 100) : undefined;
    const skip = hasPagination ? (page - 1) * take! : undefined;

    const [giftCards, total] = await Promise.all([
      db.giftCard.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(hasPagination ? { skip, take } : {}),
      }),
      db.giftCard.count({ where }),
    ]);

    if (!hasPagination) {
      return NextResponse.json(giftCards);
    }

    return NextResponse.json({
      data: giftCards,
      total,
      page,
      pageSize: take,
      totalPages: Math.max(1, Math.ceil(total / take!)),
    });
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { code, initialValue, currency, image, expiresAt, isPhysical } = body;

    if (!code || !initialValue) {
      return NextResponse.json({ message: "Code and initial value are required" }, { status: 400 });
    }

    const newGiftCard = await db.giftCard.create({
      data: {
        code,
        initialValue: parseFloat(initialValue),
        balance: parseFloat(initialValue),
        currency: currency || "LKR",
        image: image || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isPhysical: !!isPhysical,
      }
    });

    return NextResponse.json(newGiftCard, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: "Gift card with this code already exists" }, { status: 409 });
    }
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id, code, balance, isActive, image, expiresAt, isPhysical } = await req.json();
    if (!id) return NextResponse.json({ message: "Missing gift card ID" }, { status: 400 });

    const updated = await db.giftCard.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(balance !== undefined && { balance: parseFloat(balance) }),
        ...(isActive !== undefined && { isActive }),
        ...(image !== undefined && { image }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(isPhysical !== undefined && { isPhysical }),
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ message: "Missing gift card ID" }, { status: 400 });

    await db.giftCard.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
