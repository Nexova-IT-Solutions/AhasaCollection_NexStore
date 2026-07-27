import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const REQUIRED_FIELD_MESSAGE = "This field is required.";

const provinceSchema = z.object({
  name: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
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

    const where = q
      ? {
          name: { contains: q, mode: "insensitive" as const },
        }
      : undefined;

    const provinces = await db.province.findMany({
      where,
      include: {
        _count: {
          select: { cities: true }
        }
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(provinces);
  } catch (error) {
    console.error("[provinces GET] Error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await authorize())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = provinceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const { name, isActive } = parsed.data;

    const province = await db.province.create({
      data: {
        name,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(province, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ message: "Province with this name already exists" }, { status: 409 });
    }
    console.error("[provinces POST] Error:", error);
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
      return NextResponse.json({ message: "Missing province ID" }, { status: 400 });
    }

    const updated = await db.province.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[provinces PATCH] Error:", error);
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
      return NextResponse.json({ message: "Missing province ID" }, { status: 400 });
    }

    await db.province.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[provinces DELETE] Error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
