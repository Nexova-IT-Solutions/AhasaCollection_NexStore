import { NextResponse } from "next/server";
import { db, getMoodClient } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { locales } from "@/i18n/config";

const REQUIRED_FIELD_MESSAGE = "This field is required.";

const productCreateSchema = z.object({
  name: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  nameAr: z.string().optional().nullable(),
  sku: z.string()
    .max(20, 'SKU cannot exceed 20 characters')
    .regex(/^[A-Z0-9-]*$/, 'SKU must be uppercase letters, numbers, and hyphens only')
    .optional()
    .or(z.literal('')),
  description: z.string().optional(),
  shortDescription: z.string().max(250, "Short description cannot exceed 250 characters").optional().nullable(),
  price: z.coerce.number().positive(REQUIRED_FIELD_MESSAGE),
  stock: z.coerce.number().int().nonnegative(REQUIRED_FIELD_MESSAGE),
  categoryId: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  occasionIds: z.array(z.string().trim().min(1)).optional(),
  recipientIds: z.array(z.string().trim().min(1)).optional(),
  moodIds: z.array(z.string().trim().min(1)).optional().default([]),
  images: z.array(z.any()).optional(),
  variants: z.array(z.any()).optional(),
  isNewArrival: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isTopRated: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  showInDiscountSection: z.boolean().optional(),
  showInChocolateSection: z.boolean().optional(),
  showInSoftToysSection: z.boolean().optional(),
  isPremiumGiftBox: z.boolean().optional(),
  isSpecialTouch: z.boolean().optional(),
  isAvailableInBuilder: z.boolean().optional(),
  specialTouchOrder: z.coerce.number().int().min(0).optional(),
  discountId: z.string().trim().optional().nullable(),
  giftBoxItems: z
    .array(
      z.object({
        itemId: z.string().trim().min(1),
        quantity: z.coerce.number().int().min(1).default(1),
        sortOrder: z.coerce.number().int().min(0).default(0),
      })
    )
    .optional(),
  salePrice: z.coerce.number().min(0).optional().nullable(),
  costPrice: z.coerce.number().min(0).optional().nullable(),
  supplierId: z.string().trim().optional().nullable(),
  supplyDate: z.string().optional().nullable(),
});

function revalidateHomePaths() {
  revalidateTag("admin-products", "max");
  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/box-builder");
  for (const locale of locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/box-builder`);
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const moodClient = getMoodClient();
    const { searchParams } = new URL(req.url);
    const mood = searchParams.get("mood")?.trim();
    const q = searchParams.get("q")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const occasion = searchParams.get("occasion")?.trim() || "";
    const pageRaw = Number(searchParams.get("page"));
    const pageSizeRaw = Number(searchParams.get("pageSize"));
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw >= 20 && pageSizeRaw <= 50 ? Math.floor(pageSizeRaw) : 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (mood && moodClient) {
      where.moods = {
        some: {
          mood: {
            slug: mood,
          },
        },
      };
    }

    if (category) {
      where.categoryId = category;
    }

    if (occasion) {
      where.occasions = {
        some: {
          id: occasion,
        },
      };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { id: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { occasions: { some: { name: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const [products, totalCount] = await db.$transaction([
      db.product.findMany({
        where,
        select: {
          id: true,
          sku: true,
          name: true,
          description: true,
          shortDescription: true,
          price: true,
          stock: true,
          categoryId: true,
          category: {
            select: { id: true, name: true },
          },
          occasions: {
            select: { id: true, name: true, slug: true },
          },
          sizes: true,
          colors: true,
          productImages: true,
          productVariants: true,
          isActive: true,
          showInChocolateSection: true,
          showInSoftToysSection: true,
          createdAt: true,
          ...(moodClient
            ? {
                moods: {
                  select: {
                    mood: {
                      select: { id: true, name: true, slug: true, icon: true },
                    },
                  },
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.product.count({ where }),
    ]);

    return NextResponse.json({
      items: products,
      totalCount,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    });
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const moodClient = getMoodClient();
    const body = await req.json();
    const parsed = productCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const {
      name,
      nameAr,
      sku,
      description,
      shortDescription,
      price,
      stock,
      categoryId,
      sizes,
      colors,
      occasionIds,
      recipientIds,
      moodIds,
      images,
      variants,
      isNewArrival,
      isTrending,
      isTopRated,
      isBestSeller,
      showInDiscountSection,
      showInChocolateSection,
      showInSoftToysSection,
      isPremiumGiftBox,
      isSpecialTouch,
      isAvailableInBuilder,
      specialTouchOrder,
      giftBoxItems,
      discountId,
      salePrice,
      costPrice,
      supplierId,
      supplyDate,
    } = parsed.data;

    const normalizedGiftBoxItems = Array.from(
      new Map(
        (giftBoxItems ?? []).map((entry, index) => [
          entry.itemId,
          {
            itemId: entry.itemId,
            quantity: Math.max(1, Number(entry.quantity) || 1),
            sortOrder: Number.isInteger(entry.sortOrder) ? entry.sortOrder : index,
          },
        ])
      ).values()
    );

    // 2. STRICTOR BACKEND RECALCULATION
    let finalPrice = price;
    let finalStock = stock;

    if (!isPremiumGiftBox && Array.isArray(variants) && variants.length > 0) {
      const variantTotalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      if (variantTotalStock !== finalStock) {
        return NextResponse.json({ 
          message: `Stock mismatch. Expected sum of variant stocks (${variantTotalStock}) to match total stock (${finalStock}).` 
        }, { status: 400 });
      }
    }

    if (isPremiumGiftBox && normalizedGiftBoxItems.length > 0) {
      // Fetch current DB state for all included products
      const dbItems = await db.product.findMany({
        where: { id: { in: normalizedGiftBoxItems.map((i) => i.itemId) } },
        select: { id: true, price: true, stock: true },
      });

      // Recalculate strict backend price
      finalPrice = normalizedGiftBoxItems.reduce((sum, giftItem) => {
        const dbItem = dbItems.find((i) => i.id === giftItem.itemId);
        return sum + (dbItem ? dbItem.price * giftItem.quantity : 0);
      }, 0);

      // Recalculate strict backend effective stock
      finalStock = normalizedGiftBoxItems.length > 0 ? Math.min(...normalizedGiftBoxItems.map((giftItem) => {
        const dbItem = dbItems.find((i) => i.id === giftItem.itemId);
        return dbItem ? Math.floor(dbItem.stock / giftItem.quantity) : 0;
      })) : 0;
    }

    const newProduct = await db.$transaction(
      async (tx) => {
        const productRecord = await tx.product.create({
          data: {
            name,
            nameAr: nameAr ?? null,
            sku: sku ? sku.trim().toUpperCase() : null,
            description,
            shortDescription: shortDescription ?? null,
            price: finalPrice,
            stock: finalStock,
            category: { connect: { id: categoryId } },
            sizes: sizes || [],
            colors: colors || [],
            occasions: {
              connect: Array.isArray(occasionIds)
                ? occasionIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0).map((id: string) => ({ id }))
                : [],
            },
            recipients: {
              connect: Array.isArray(recipientIds)
                ? recipientIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0).map((id: string) => ({ id }))
                : [],
            },
            ...(moodClient
              ? {
                  moods: {
                    create: Array.isArray(moodIds)
                      ? moodIds
                          .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
                          .map((id: string) => ({ mood: { connect: { id } } }))
                      : [],
                  },
                }
              : {}),
            productImages: images || [],
            productVariants: variants || [],
            isNewArrival: Boolean(isNewArrival),
            isTrending: Boolean(isTrending),
            isTopRated: Boolean(isTopRated),
            isBestSeller: Boolean(isBestSeller),
            showInDiscountSection: Boolean(showInDiscountSection),
            showInChocolateSection: Boolean(showInChocolateSection),
            showInSoftToysSection: Boolean(showInSoftToysSection),
            isPremiumGiftBox: Boolean(isPremiumGiftBox),
            isSpecialTouch: Boolean(isSpecialTouch),
            isAvailableInBuilder: Boolean(isAvailableInBuilder),
            specialTouchOrder: Number.isFinite(specialTouchOrder) ? Number(specialTouchOrder) : 0,
            ...(discountId ? { discount: { connect: { id: discountId } } } : {}),
            salePrice: salePrice ?? null,
            itemsInside: normalizedGiftBoxItems.length
              ? {
                  create: normalizedGiftBoxItems.map((entry, index) => ({
                    item: { connect: { id: entry.itemId } },
                    quantity: entry.quantity,
                    sortOrder: entry.sortOrder ?? index,
                  })),
                }
              : undefined,
            costPrice: costPrice ?? null,
            ...(supplierId ? { supplier: { connect: { id: supplierId } } } : {}),
            ...(supplierId && supplyDate ? { lastSuppliedAt: new Date(supplyDate) } : {}),
          },
          select: {
            id: true,
            category: true,
            occasions: {
              select: { id: true, name: true, slug: true },
            },
            discount: true,
            itemsInside: {
              include: {
                item: {
                  select: {
                    id: true,
                    name: true,
                    categoryId: true,
                  },
                },
              },
              orderBy: [{ sortOrder: "asc" }, { itemId: "asc" }],
            },
            ...(moodClient
              ? {
                  moods: {
                    select: {
                      mood: {
                        select: { id: true, name: true, slug: true, icon: true },
                      },
                    },
                  },
                }
              : {}),
          },
        });

        // Create supply history record if both supplierId and supplyDate are provided
        if (supplierId && supplyDate) {
          await tx.productSupply.create({
            data: {
              productId: productRecord.id,
              supplierId: supplierId,
              suppliedAt: new Date(supplyDate),
              costPrice: costPrice ?? null,
            },
          });
        }

        return productRecord;
      },
      {
        maxWait: 5000,
        timeout: 15000,
      }
    );

    revalidateHomePaths();

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002" && error.meta?.target?.includes("sku")) {
      return NextResponse.json({ message: "This SKU is already in use by another product" }, { status: 409 });
    }
    console.error("Product creation error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
