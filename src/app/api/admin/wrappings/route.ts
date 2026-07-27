import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const createWrapSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().url("Image URL must be a valid URL").optional().or(z.literal("")).nullable(),
  price: z.number().min(0, "Price cannot be negative"),
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
    const page = Number.parseInt(searchParams.get("page") || "", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "", 10);
    const hasPagination = Number.isFinite(page) && Number.isFinite(pageSize) && page > 0 && pageSize > 0;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const take = hasPagination ? Math.min(pageSize, 100) : undefined;
    const skip = hasPagination ? (page - 1) * take! : undefined;

    const [wraps, total] = await Promise.all([
      db.giftWrap.findMany({
        where,
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        ...(hasPagination ? { skip, take } : {}),
      }),
      db.giftWrap.count({ where }),
    ]);

    if (!hasPagination) {
      return NextResponse.json(wraps);
    }

    return NextResponse.json({
      data: wraps,
      total,
      page,
      pageSize: take,
      totalPages: Math.max(1, Math.ceil(total / take!)),
    });
  } catch {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await authorize())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createWrapSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const wrap = await db.giftWrap.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        imageUrl: parsed.data.imageUrl || null,
        price: parsed.data.price,
        isActive: parsed.data.isActive ?? true,
      },
    });

    return NextResponse.json(wrap, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
