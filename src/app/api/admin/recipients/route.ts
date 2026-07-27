import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { revalidateTag } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const REQUIRED_FIELD_MESSAGE = "This field is required.";

const createRecipientSchema = z.object({
  name: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
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
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const take = hasPagination ? Math.min(pageSize, 100) : undefined;
    const skip = hasPagination ? (page - 1) * take! : undefined;

    const [recipients, total] = await Promise.all([
      (db as any).recipient.findMany({
        where,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        ...(hasPagination ? { skip, take } : {}),
      }),
      (db as any).recipient.count({ where }),
    ]);

    if (!hasPagination) {
      return NextResponse.json(recipients);
    }

    return NextResponse.json({
      data: recipients,
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
    const parsed = createRecipientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const { name, slug, isActive } = parsed.data;

    const recipient = await (db as any).recipient.create({
      data: {
        name,
        slug: slugify(slug || name),
        isActive: isActive ?? true,
      },
    });

    revalidateTag("recipients");

    return NextResponse.json(recipient, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ message: "Recipient with this name or slug already exists" }, { status: 409 });
    }

    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
