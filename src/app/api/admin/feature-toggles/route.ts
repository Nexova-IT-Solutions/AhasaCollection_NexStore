import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFeatureToggles } from "@/lib/queries/feature-toggles";

export async function GET() {

  try {
    const toggles = await getFeatureToggles();
    return NextResponse.json(toggles);
  } catch (error) {
    console.error("Failed to fetch feature toggles API:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "DEV_ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { toggles } = body; // expect format: { storefront_section: true, storefront_banners: false, ... }

    if (!toggles || typeof toggles !== "object") {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const updates = Object.entries(toggles).map(([key, isActive]) => {
      return db.featureToggle.upsert({
        where: { key },
        update: { isActive: !!isActive },
        create: { key, isActive: !!isActive },
      });
    });

    await db.$transaction(updates);

    const response = NextResponse.json({ message: "Feature toggles updated successfully" });

    // Set cookies for critical toggles to prevent hydration/layout flash
    if (toggles.storefront_website_enabled !== undefined) {
      response.cookies.set("storefront_website_enabled", toggles.storefront_website_enabled ? "true" : "false", {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
    }
    if (toggles.giftboxes_available !== undefined) {
      response.cookies.set("giftboxes_available", toggles.giftboxes_available ? "true" : "false", {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
    }
    if (toggles.storefront_giftcards !== undefined) {
      response.cookies.set("storefront_giftcards", toggles.storefront_giftcards ? "true" : "false", {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    console.error("Failed to update feature toggles API:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
