import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { revalidateTag } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const REQUIRED_FIELD_MESSAGE = "This field is required.";

const updateRecipientSchema = z.object({
  name: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE).optional(),
  slug: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE).optional(),
  isActive: z.boolean().optional(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

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
    const parsed = updateRecipientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const updated = await (db as any).recipient.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.slug !== undefined ? { slug: slugify(parsed.data.slug) } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
    });

    revalidateTag("recipients");

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ message: "Recipient with this name or slug already exists" }, { status: 409 });
    }

    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Recipient not found" }, { status: 404 });
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

    await (db as any).recipient.delete({ where: { id } });

    revalidateTag("recipients");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2003") {
      return NextResponse.json({ message: "Cannot delete recipient because it is used by products" }, { status: 409 });
    }

    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Recipient not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
