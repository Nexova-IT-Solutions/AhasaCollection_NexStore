import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ALLOWED_BANNER_KEYS = ["promo_1", "promo_2"] as const;
const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"] as const;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED_ROLES.includes(session.user?.role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number.parseInt(searchParams.get("page") || "", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "", 10);
    const key = (searchParams.get("key") || "").trim();
    const hasPagination = Number.isFinite(page) && Number.isFinite(pageSize) && page > 0 && pageSize > 0;

    const where = key ? { key: { contains: key, mode: "insensitive" as const } } : undefined;
    const take = hasPagination ? Math.min(pageSize, 100) : undefined;
    const skip = hasPagination ? (page - 1) * take! : undefined;

    const [banners, total] = await Promise.all([
      db.promoBanner.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(hasPagination ? { skip, take } : {}),
      }),
      db.promoBanner.count({ where }),
    ]);

    if (!hasPagination) {
      return NextResponse.json(banners);
    }

    return NextResponse.json({
      data: banners,
      total,
      page,
      pageSize: take,
      totalPages: Math.max(1, Math.ceil(total / take!)),
    });
  } catch (error) {
    console.error("Error fetching banners:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED_ROLES.includes(session.user?.role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const normalizedKey = String(body?.key ?? "").trim().toLowerCase();

    // Support both legacy single imageUrl and new images array
    const rawImages: string[] = Array.isArray(body?.images)
      ? body.images.filter((s: unknown) => typeof s === "string" && s.trim()).map((s: string) => s.trim())
      : [];
    // Fallback: if caller passed a single imageUrl (backward compat)
    if (rawImages.length === 0 && typeof body?.imageUrl === "string" && body.imageUrl.trim()) {
      rawImages.push(body.imageUrl.trim());
    }

    const slideInterval = typeof body?.slideInterval === "number" && body.slideInterval > 0
      ? body.slideInterval
      : 3000;
    const isActive = Boolean(body?.isActive ?? true);

    if (!normalizedKey || rawImages.length === 0) {
      return NextResponse.json(
        { message: "Key and at least one image are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_BANNER_KEYS.includes(normalizedKey as (typeof ALLOWED_BANNER_KEYS)[number])) {
      return NextResponse.json(
        { message: "Invalid banner key. Allowed keys: promo_1, promo_2" },
        { status: 400 }
      );
    }

    // Check if banner with this key already exists
    const existingBanner = await db.promoBanner.findUnique({
      where: { key: normalizedKey },
    });

    if (existingBanner) {
      return NextResponse.json(
        {
          message: `A banner already exists for the "${normalizedKey}" slot. Please edit or delete the existing banner instead.`,
        },
        { status: 409 }
      );
    }

    const newBanner = await db.$transaction(async (tx) => {
      if (isActive) {
        await tx.promoBanner.updateMany({
          where: { key: normalizedKey, isActive: true },
          data: { isActive: false },
        });
      }

      return tx.promoBanner.create({
        data: {
          key: normalizedKey,
          imageUrl: rawImages[0],   // backward compat
          images: rawImages,
          slideInterval,
          isActive,
        },
      });
    });

    return NextResponse.json(newBanner, { status: 201 });
  } catch (error) {
    console.error("Error creating banner:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
