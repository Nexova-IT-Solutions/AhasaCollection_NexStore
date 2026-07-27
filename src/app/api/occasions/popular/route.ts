import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 3600;

export async function GET() {
  try {
    const occasions = await db.occasion.findMany({
      where: {
        isActive: true,
        isPopular: true,
      },
      take: 5,
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json(occasions);
  } catch (error) {
    console.error("Error fetching popular occasions:", error);
    return NextResponse.json({ error: "Failed to fetch occasions" }, { status: 500 });
  }
}
