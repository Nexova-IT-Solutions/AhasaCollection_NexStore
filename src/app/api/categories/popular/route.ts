import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 3600;

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: {
        isActive: true,
        isPopular: true,
      },
      take: 5,
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching popular categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
