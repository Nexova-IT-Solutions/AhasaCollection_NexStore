import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const REQUIRED_FIELD_MESSAGE = "This field is required.";

const citySchema = z.object({
  name: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  provinceId: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  fee: z.coerce.number().min(0, REQUIRED_FIELD_MESSAGE),
  isActive: z.boolean().optional(),
});

async function authorize() {
  const session = await getServerSession(authOptions);
  return Boolean(session && ["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string));
}

export async function GET(req: Request) {
  try {
    if (!(await authorize())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const provinceId = searchParams.get("provinceId") || "";

    const where: any = {};
    if (q) {
      where.name = { contains: q, mode: "insensitive" as const };
    }
    if (provinceId) {
      where.provinceId = provinceId;
    }

    const cities = await db.city.findMany({
      where,
      include: {
        province: {
          select: { name: true }
        }
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(cities);
  } catch (error) {
    console.error("[cities GET] Error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await authorize())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = citySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const { name, provinceId, fee, isActive } = parsed.data;

    const city = await db.city.create({
      data: {
        name,
        provinceId,
        fee,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(city, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ message: "City with this name already exists in this province" }, { status: 409 });
    }
    console.error("[cities POST] Error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await authorize())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ message: "Missing city ID" }, { status: 400 });
    }

    const updated = await db.city.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[cities PATCH] Error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await authorize())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ message: "Missing city ID" }, { status: 400 });
    }

    await db.city.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[cities DELETE] Error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
