import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, getMoodClient } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const REQUIRED_FIELD_MESSAGE = "This field is required.";

const moodCreateSchema = z.object({
  name: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  slug: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  description: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});

const moodUpdateSchema = z.object({
  id: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  name: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  slug: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  description: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});

function createSlug(value: string) {
  return value
    .toLowerCase()
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

    const moodClient = getMoodClient();
    if (!moodClient) {
      return NextResponse.json([]);
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

    const [moods, total] = await Promise.all([
      moodClient.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
        ...(hasPagination ? { skip, take } : {}),
      }),
      moodClient.count({ where }),
    ]).catch(() => [[], 0] as const);

    if (!hasPagination) {
      return NextResponse.json(moods);
    }

    return NextResponse.json({
      data: moods,
      total,
      page,
      pageSize: take,
      totalPages: Math.max(1, Math.ceil(total / take!)),
    });
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await authorize())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const moodClient = getMoodClient();
    if (!moodClient) {
      return NextResponse.json({ message: "Mood feature is not available yet. Run Prisma migration and regenerate client." }, { status: 503 });
    }

    const body = await req.json();
    const parsed = moodCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const { name, slug, description, icon, isActive } = parsed.data;

    const mood = await moodClient.create({
      data: {
        name,
        slug: createSlug(slug),
        description,
        icon,
        isActive: isActive ?? true,
      },
    });

    revalidateTag("moods");

    return NextResponse.json(mood, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ message: "Mood with this name or slug already exists" }, { status: 409 });
    }

    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await authorize())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const moodClient = getMoodClient();
    if (!moodClient) {
      return NextResponse.json({ message: "Mood feature is not available yet. Run Prisma migration and regenerate client." }, { status: 503 });
    }

    const body = await req.json();
    const parsed = moodUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const { id, name, slug, description, icon, isActive } = parsed.data;

    const updated = await moodClient.update({
      where: { id },
      data: {
        name,
        slug: createSlug(slug),
        ...(description !== undefined ? { description } : {}),
        ...(icon !== undefined ? { icon } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    revalidateTag("moods");

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Mood not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await authorize())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const moodClient = getMoodClient();
    if (!moodClient) {
      return NextResponse.json({ message: "Mood feature is not available yet. Run Prisma migration and regenerate client." }, { status: 503 });
    }

    const { id } = await req.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json({ message: "Missing mood ID" }, { status: 400 });
    }

    await moodClient.delete({ where: { id } });

    revalidateTag("moods");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Mood not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
