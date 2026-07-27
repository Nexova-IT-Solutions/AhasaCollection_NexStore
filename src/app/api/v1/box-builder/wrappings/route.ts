import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const wrappings = await db.giftWrap.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        price: "asc",
      },
    });

    return NextResponse.json(wrappings);
  } catch (error) {
    console.error("[WRAPPINGS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
