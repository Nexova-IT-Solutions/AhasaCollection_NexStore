import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    // 1. Capture query arguments cleanly from the incoming request context
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "12", 10));

    // Dynamic Filter Params
    const search = searchParams.get("search") || "";
    const minPrice = parseFloat(searchParams.get("minPrice") || "0");
    const maxPrice = parseFloat(searchParams.get("maxPrice") || "999999");
    const categories = searchParams.get("categories")?.split(",").filter(Boolean) || [];
    const occasions = searchParams.get("occasions")?.split(",").filter(Boolean) || [];
    const recipients = searchParams.get("recipients")?.split(",").filter(Boolean) || [];
    const inStock = searchParams.get("inStock") === "true";

    // 2. Calculate the offset slice values
    const skipValue = (page - 1) * limit;

    // 3. Fetch Global Settings Configuration with safe fallback
    let hideOutOfStock = false;
    try {
      const settings = await (db as any).adminSetting.findFirst();
      hideOutOfStock = settings?.hideOutOfStockInBuilder ?? false;
    } catch {
      try {
        const shippingConfig = await db.shippingConfig.findFirst();
        hideOutOfStock = shippingConfig?.hideOutOfStockProducts ?? false;
      } catch {
        hideOutOfStock = false;
      }
    }

    // Common WHERE clause mapping
    const whereClause: Prisma.ProductWhereInput = {
      isActive: true,
      isAvailableInBuilder: true,
      NOT: [
        { productImages: { equals: Prisma.JsonNull } },
        { productImages: { equals: [] } },
        { productImages: { equals: "[]" } }
      ],
      ...(hideOutOfStock || inStock ? { stock: { gt: 0 } } : {}),
      price: {
        gte: minPrice,
        lte: maxPrice,
      },
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categories.length > 0) {
      const categoryRows = await db.category.findMany({
        where: {
          slug: { in: categories }
        },
        select: {
          id: true,
          subCategories: {
            select: {
              id: true
            }
          }
        }
      });

      const categoryIds = categoryRows.flatMap(cat => [
        cat.id,
        ...cat.subCategories.map(sub => sub.id)
      ]);

      whereClause.categoryId = { in: categoryIds };
    }

    if (occasions.length > 0) {
      whereClause.occasions = {
        some: {
          id: { in: occasions }
        }
      };
    }

    if (recipients.length > 0) {
      whereClause.recipients = {
        some: {
          id: { in: recipients }
        }
      };
    }

    // 4. Concurrent Execution via Prisma Transaction using skip and take
    const [totalItems, products] = await db.$transaction([
      db.product.count({ where: whereClause }),
      db.product.findMany({
        where: whereClause,
        include: {
          category: true,
          occasions: true,
          recipients: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: skipValue,
        take: limit, // Binds dynamically to the request parameters
      })
    ]);

    // 5. Array Normalization Clean-up stage to eliminate empty-image elements
    const items = products
      .map((p) => {
        let imagesList: string[] = [];

        // Parse and extract images list safely
        if (Array.isArray(p.productImages)) {
          imagesList = (p.productImages as any[])
            .map((img) => (typeof img === "string" ? img : img?.url || img?.image || img))
            .filter(Boolean);
        } else if (typeof p.productImages === "string") {
          try {
            const parsed = JSON.parse(p.productImages);
            if (Array.isArray(parsed)) {
              imagesList = parsed
                .map((img) => (typeof img === "string" ? img : img?.url || img?.image || img))
                .filter(Boolean);
            }
          } catch {
            if (p.productImages.trim().length > 0) {
              imagesList = [p.productImages.trim()];
            }
          }
        }

        // Return null to drop the item if no valid image strings are found
        if (imagesList.length === 0) {
          return null;
        }

        return {
          id: p.id,
          name: p.name,
          slug: p.sku || p.id, // Fallback to id if sku missing
          description: p.description || "",
          shortDescription: p.description || "",
          price: p.price,
          salePrice: p.salePrice,
          images: imagesList,
          categoryId: p.categoryId || "",
          category: p.category?.slug || "addon",
          occasions: p.occasions.map((o) => o.slug),
          recipients: p.recipients.map((r) => r.slug),
          inStock: p.stock > 0,
          capacityUnits: p.builderCapacityUnits || 1,
          averageRating: p.averageRating,
          reviewCount: p.reviewCount,
          sizes: p.sizes,
          colors: p.colors,
          productVariants: p.productVariants,
        };
      })
      .filter(Boolean); // Safely strip out the null entries

    // Calculate dynamic paging metrics
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      items,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error("[BOX_BUILDER_ITEMS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
