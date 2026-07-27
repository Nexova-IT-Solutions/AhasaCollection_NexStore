import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const cities = await db.city.findMany({
      where: {
        isActive: true,
        province: {
          isActive: true,
        },
        name: {
          contains: q,
          mode: "insensitive",
        },
      },
      include: {
        province: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 15,
      orderBy: {
        name: "asc",
      },
    });

    const formattedData = cities.map((city) => ({
      id: city.id,
      cityName: city.name,
      provinceId: city.provinceId,
      provinceName: city.province.name,
      fee: city.fee,
    }));

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("[shipping-cities search GET] Error:", error);
    return NextResponse.json({ success: false, message: "Internal Error" }, { status: 500 });
  }
}
