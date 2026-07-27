import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Number.parseInt(searchParams.get("page") || "", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "", 10);
    const hasPagination = Number.isFinite(page) && Number.isFinite(pageSize) && page > 0 && pageSize > 0;

    const where = q
      ? {
          name: { contains: q, mode: "insensitive" as const },
        }
      : undefined;

    const take = hasPagination ? Math.min(pageSize, 100) : undefined;
    const skip = hasPagination ? (page - 1) * take! : undefined;

    const [templates, total] = await Promise.all([
      db.permissionTemplate.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { users: true },
          },
        },
        ...(hasPagination ? { skip, take } : {}),
      }),
      db.permissionTemplate.count({ where }),
    ]);

    if (!hasPagination) {
      return NextResponse.json(templates);
    }

    return NextResponse.json({
      data: templates,
      total,
      page,
      pageSize: take,
      totalPages: Math.max(1, Math.ceil(total / take!)),
    });
  } catch (error) {
    console.error("Fetch templates error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, permissions } = body;

    if (!name || !permissions) {
      return NextResponse.json({ message: "Name and permissions are required" }, { status: 400 });
    }

    const existing = await db.permissionTemplate.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ message: "Template with this name already exists" }, { status: 409 });
    }

    const template = await db.permissionTemplate.create({
      data: {
        name,
        permissions,
      },
    });

    revalidateTag("admin-permission-templates");
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
