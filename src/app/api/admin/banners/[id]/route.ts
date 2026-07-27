import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"] as const;

export async function PUT(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED_ROLES.includes(session.user?.role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { isActive, slideInterval } = body;

    // Resolve images array (support both new `images[]` and legacy `imageUrl`)
    let rawImages: string[] | undefined;
    if (Array.isArray(body?.images)) {
      rawImages = (body.images as unknown[])
        .filter((s): s is string => typeof s === "string" && s.trim() !== "")
        .map((s) => s.trim());
    } else if (typeof body?.imageUrl === "string" && body.imageUrl.trim()) {
      rawImages = [body.imageUrl.trim()];
    }

    const updatedBanner = await db.$transaction(async (tx) => {
      const currentBanner = await tx.promoBanner.findUnique({ where: { id } });

      if (!currentBanner) {
        throw new Error("BANNER_NOT_FOUND");
      }

      // If activating, deactivate other banners with same key
      if (isActive === true && !currentBanner.isActive) {
        await tx.promoBanner.updateMany({
          where: { key: currentBanner.key, id: { not: id }, isActive: true },
          data: { isActive: false },
        });
      }

      return tx.promoBanner.update({
        where: { id },
        data: {
          ...(rawImages && rawImages.length > 0
            ? { images: rawImages, imageUrl: rawImages[0] }
            : {}),
          ...(typeof slideInterval === "number" && slideInterval > 0
            ? { slideInterval }
            : {}),
          ...(typeof isActive === "boolean" ? { isActive } : {}),
        },
      });
    });

    return NextResponse.json(updatedBanner);
  } catch (error: any) {
    if (error?.message === "BANNER_NOT_FOUND" || error?.code === "P2025") {
      return NextResponse.json({ message: "Banner not found" }, { status: 404 });
    }

    console.error("Error updating banner:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ALLOWED_ROLES.includes(session.user?.role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await context.params;

    await db.promoBanner.delete({ where: { id } });

    return NextResponse.json({ message: "Banner deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Banner not found" }, { status: 404 });
    }

    console.error("Error deleting banner:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
