import { NextResponse } from "next/server";
import { getVisibleCategories } from "@/lib/categories";
import { getStoreConfig } from "@/lib/store-config";

export async function GET() {
  try {
    const config = await getStoreConfig();
    const hideEmpty = config.hideEmptyCategories;

    const rootCategories = await getVisibleCategories({
      hideEmpty,
      includeChildren: true
    });

    // Map children to match the Header's expected "children" property name
    const categories = rootCategories.map(cat => ({
      ...cat,
      children: cat.subCategories
    }));

    return NextResponse.json(categories);
  } catch (error) {
    console.error("[categories] DB error after retries:", error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, message: "Service temporarily unavailable" }, { status: 503 });
  }
}
