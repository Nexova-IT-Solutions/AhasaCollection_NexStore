import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";

function revalidateStorefront() {
  revalidatePath("/");
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    
    // Parse limit and page query parameters from the URL as integers
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const limit = parseInt(searchParams.get("limit") || searchParams.get("pageSize") || "10", 10) || 10;
    
    const hasPagination = !isNaN(page) && !isNaN(limit) && page > 0 && limit > 0;
    const skip = hasPagination ? (page - 1) * limit : undefined;
    const take = hasPagination ? Math.min(limit, 100) : undefined;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    // Fetch categories and total count sequentially to avoid Prisma pool timeouts under connection limits
    const categories = await db.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        parentId: true,
        isActive: true,
        isPopular: true,
        createdAt: true,
        parentCategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
      ...(hasPagination ? { skip, take } : {}),
    });

    const total = await db.category.count({ where });

    const categoriesWithChildren = categories.map((category) => ({
      ...category,
      subCategories: [],
    }));

    if (!hasPagination) {
      return NextResponse.json(categoriesWithChildren);
    }

    return NextResponse.json({
      data: categoriesWithChildren,
      total,
      page,
      pageSize: take,
      totalPages: Math.max(1, Math.ceil(total / take!)),
    });
  } catch (error) {
    console.error("GET_CATEGORIES_ERROR:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, image, parentId } = body;

    if (!name) {
      return NextResponse.json({ message: "Category name is required" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    const newCategory = await db.category.create({
      data: {
        name,
        slug,
        description,
        image,
        parentId: parentId || null
      },
      include: {
        parentCategory: true,
        subCategories: true
      }
    });

    revalidateStorefront();
  revalidateTag("categories");

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: "Category with this name or slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, image, parentId, isActive, isPopular } = body;

    if (id === undefined || id === null || String(id).trim() === "") {
      return NextResponse.json(
        { error: "Missing required identifier: Category ID" },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};

    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
    }
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (parentId !== undefined) updateData.parentId = parentId || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isPopular !== undefined) updateData.isPopular = isPopular;

    const updated = await db.category.update({
      where: { id: String(id) },
      data: updateData,
      include: {
        parentCategory: true,
        subCategories: true,
      },
    });

    revalidateStorefront();
    revalidateTag("categories");

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("CRITICAL_PATCH_CATEGORY_ERROR:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Unique constraint violation: A category with this name or slug already exists." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal Server Error", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ message: "Missing category ID" }, { status: 400 });

    await db.category.delete({ where: { id } });
    revalidateStorefront();
    revalidateTag("categories");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
