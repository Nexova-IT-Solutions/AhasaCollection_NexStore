import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const updateWrapSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  description: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().url("Image URL must be a valid URL").optional().or(z.literal("")).nullable(),
  price: z.number().min(0, "Price cannot be negative").optional(),
  isActive: z.boolean().optional(),
});

async function authorize() {
  const session = await getServerSession(authOptions);
  return Boolean(session && ["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await authorize())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateWrapSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const wrap = await db.giftWrap.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
        ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl || null } : {}),
        ...(parsed.data.price !== undefined ? { price: parsed.data.price } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
    });

    return NextResponse.json(wrap);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Wrapping option not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await authorize())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    await db.giftWrap.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Wrapping option not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
