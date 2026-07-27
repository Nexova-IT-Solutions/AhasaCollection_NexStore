import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const occasions = await db.occasion.findMany({
      where: {
        isActive: true,
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json(occasions);
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
