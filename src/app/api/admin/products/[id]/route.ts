import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db, getMoodClient } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { locales } from "@/i18n/config";

const productUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  nameAr: z.string().optional().nullable(),
  sku: z.string()
    .max(20, 'SKU cannot exceed 20 characters')
    .regex(/^[A-Z0-9-]*$/, 'SKU must be uppercase letters, numbers, and hyphens only')
    .optional()
    .or(z.literal('')),
  description: z.string().optional().nullable(),
  shortDescription: z.string().max(250, "Short description cannot exceed 250 characters").optional().nullable(),
  price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  categoryId: z.string().trim().optional().nullable(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  occasionIds: z.array(z.string().trim().min(1)).optional(),
  recipientIds: z.array(z.string().trim().min(1)).optional(),
  moodIds: z.array(z.string().trim().min(1)).optional(),
  images: z.array(z.any()).optional(),
  variants: z.array(z.any()).optional(),
  isActive: z.boolean().optional(),
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

function revalidateHomePaths(id?: string) {
  revalidateTag("admin-products", "max");
  revalidatePath("/");
  revalidatePath("/categories");
  revalidatePath("/occasions");
  revalidatePath("/products/[id]", "page");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/admin/products");
  revalidatePath("/box-builder");
  if (id) {
    revalidatePath(`/admin/products/${id}`);
    revalidatePath(`/admin/products/${id}/edit`);
  }
  for (const locale of locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/categories`);
    revalidatePath(`/${locale}/occasions`);
    revalidatePath(`/${locale}/products/[id]`, "page");
    revalidatePath(`/${locale}/product/[slug]`, "page");
    revalidatePath(`/${locale}/box-builder`);
  }
}

type RouteProps = {
  params: Promise<{ id: string }>;
};

async function authorize() {
  const session = await getServerSession(authOptions);
  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
    return false;
  }
  return true;
}

export async function GET(_req: Request, props: RouteProps) {
  const { id } = await props.params;

  if (!(await authorize())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const moodClient = getMoodClient();

    const product = await db.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        shortDescription: true,
        price: true,
        salePrice: true,
        stock: true,
        costPrice: true,
        supplierId: true,
        lastSuppliedAt: true,
        categoryId: true,
        sizes: true,
        colors: true,
        productImages: true,
        productVariants: true,
        isActive: true,
        isNewArrival: true,
        isTrending: true,
        isTopRated: true,
        isBestSeller: true,
        showInDiscountSection: true,
        showInChocolateSection: true,
        showInSoftToysSection: true,
        isPremiumGiftBox: true,
        isSpecialTouch: true,
        isAvailableInBuilder: true,
        specialTouchOrder: true,
        discountId: true,
        createdAt: true,
        updatedAt: true,
        occasions: {
          select: {
            id: true,
          },
        },
        recipients: {
          select: {
            id: true,
          },
        },
        ...(moodClient
          ? {
              moods: {
                select: {
                  moodId: true,
                },
              },
            }
          : {}),
        itemsInside: {
          select: {
            itemId: true,
            quantity: true,
            sortOrder: true,
          },
          orderBy: [{ sortOrder: "asc" }, { itemId: "asc" }],
        },
      },
    });

    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...product,
      occasionIds: product.occasions.map((occasion) => occasion.id),
      recipientIds: product.recipients.map((recipient) => recipient.id),
      moodIds: "moods" in product ? product.moods.map((mood) => mood.moodId) : [],
      itemsInside: product.itemsInside,
    });
  } catch (error) {
    console.error("Product fetch error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: RouteProps) {
  const { id } = await props.params;

  if (!(await authorize())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const moodClient = getMoodClient();
    const body = await req.json();
    const parsed = productUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const existingProduct = await db.product.findUnique({
      where: { id },
      select: { price: true, isPremiumGiftBox: true },
    });

    if (!existingProduct) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const priceChanged = data.price !== undefined && data.price !== existingProduct.price;
    let affectedBoxIds: string[] = [];

    // If a standard product's price changed, find all Gift Boxes that contain it
    if (priceChanged && !existingProduct.isPremiumGiftBox) {
      const parentBoxes = await db.giftBoxItem.findMany({
        where: { itemId: id },
        select: { boxId: true },
      });
      affectedBoxIds = parentBoxes.map((pb) => pb.boxId);
    }

    const normalizedGiftBoxItems = Array.from(
      new Map(
        (data.giftBoxItems ?? [])
          .filter((entry) => entry.itemId !== id)
          .map((entry, index) => [
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
    let finalPrice = data.price ?? existingProduct.price;
    let finalStock = data.stock;

    if (!data.isPremiumGiftBox && Array.isArray(data.variants) && data.variants.length > 0 && finalStock !== undefined) {
      const variantTotalStock = data.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
      if (variantTotalStock !== finalStock) {
        return NextResponse.json({ 
          message: `Stock mismatch. Expected sum of variant stocks (${variantTotalStock}) to match total stock (${finalStock}).` 
        }, { status: 400 });
      }
    }

    if (data.isPremiumGiftBox && normalizedGiftBoxItems.length > 0) {
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

    const updated = await db.$transaction(async (tx) => {
      const categoryRelation = data.categoryId === undefined
        ? undefined
        : data.categoryId
          ? { connect: { id: data.categoryId } }
          : { disconnect: true };

      const discountRelation = data.discountId === undefined
        ? undefined
        : data.discountId
          ? { connect: { id: data.discountId } }
          : { disconnect: true };

      const supplierRelation = data.supplierId === undefined
        ? undefined
        : data.supplierId
          ? { connect: { id: data.supplierId } }
          : { disconnect: true };

      const productRecord = await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          ...(data.nameAr !== undefined ? { nameAr: data.nameAr } : {}),
          ...(data.sku !== undefined ? { sku: data.sku ? data.sku.trim().toUpperCase() : null } : {}),
          description: data.description,
          ...(data.shortDescription !== undefined ? { shortDescription: data.shortDescription } : {}),
          price: finalPrice,
          stock: finalStock,
          ...(categoryRelation ? { category: categoryRelation } : {}),
          sizes: data.sizes,
          colors: data.colors,
          occasions: data.occasionIds
            ? {
                set: data.occasionIds.map((occasionId) => ({ id: occasionId })),
              }
            : undefined,
          recipients: data.recipientIds
            ? {
                set: data.recipientIds.map((recipientId) => ({ id: recipientId })),
              }
            : undefined,
          ...(moodClient
            ? {
                moods: data.moodIds
                  ? {
                      deleteMany: {},
                      create: data.moodIds.map((moodId) => ({ mood: { connect: { id: moodId } } })),
                    }
                  : undefined,
              }
            : {}),
          productImages: data.images,
          productVariants: data.variants,
          isActive: data.isActive,
          isNewArrival: data.isNewArrival,
          isTrending: data.isTrending,
          isTopRated: data.isTopRated,
          isBestSeller: data.isBestSeller,
          showInDiscountSection: data.showInDiscountSection,
          showInChocolateSection: data.showInChocolateSection,
          showInSoftToysSection: data.showInSoftToysSection,
          isPremiumGiftBox: data.isPremiumGiftBox,
          isSpecialTouch: data.isSpecialTouch,
          isAvailableInBuilder: data.isAvailableInBuilder,
          specialTouchOrder: data.specialTouchOrder,
          salePrice: data.salePrice,
          costPrice: data.costPrice,
          ...(discountRelation ? { discount: discountRelation } : {}),
          ...(supplierRelation ? { supplier: supplierRelation } : {}),
          ...(data.supplierId && data.supplyDate
            ? { lastSuppliedAt: new Date(data.supplyDate) }
            : data.supplierId === null
              ? { lastSuppliedAt: null }
              : {}),
          itemsInside: data.giftBoxItems !== undefined ? {
            deleteMany: {},
            create: normalizedGiftBoxItems.map((entry, index) => ({
              item: { connect: { id: entry.itemId } },
              quantity: entry.quantity,
              sortOrder: entry.sortOrder ?? index,
            }))
          } : undefined,
        },
        select: {
          id: true,
        },
      });

      // CASCADE RECALCULATION: If price changed, update all parent Gift Boxes
      if (affectedBoxIds.length > 0) {
        // Fetch all items for all affected boxes in one go to optimize
        const allBoxItems = await tx.giftBoxItem.findMany({
          where: { boxId: { in: affectedBoxIds } },
          include: {
            item: {
              select: { id: true, price: true },
            },
          },
        });

        // Group items by boxId
        const itemsByBox = allBoxItems.reduce((acc, entry) => {
          if (!acc[entry.boxId]) acc[entry.boxId] = [];
          acc[entry.boxId].push(entry);
          return acc;
        }, {} as Record<string, typeof allBoxItems>);

        for (const boxId of affectedBoxIds) {
          const items = itemsByBox[boxId] || [];
          const newBoxPrice = items.reduce((sum, entry) => {
            // Use the NEW price for the product we just updated, 
            // and the current prices for other items in the box.
            const itemPrice = entry.itemId === id ? finalPrice : entry.item.price;
            return sum + (itemPrice * entry.quantity);
          }, 0);

          await tx.product.update({
            where: { id: boxId },
            data: { price: newBoxPrice },
            select: { id: true },
          });
        }
      }

      // Create supply history record if both supplierId and supplyDate are provided
      if (data.supplierId && data.supplyDate) {
        await tx.productSupply.create({
          data: {
            productId: id,
            supplierId: data.supplierId,
            suppliedAt: new Date(data.supplyDate),
            costPrice: data.costPrice ?? null,
          },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: productRecord.id },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          salePrice: true,
          stock: true,
          categoryId: true,
          sizes: true,
          colors: true,
          productImages: true,
          productVariants: true,
          isActive: true,
          isNewArrival: true,
          isTrending: true,
          isTopRated: true,
          isBestSeller: true,
          showInDiscountSection: true,
          showInChocolateSection: true,
          showInSoftToysSection: true,
          isPremiumGiftBox: true,
          isSpecialTouch: true,
          isAvailableInBuilder: true,
          specialTouchOrder: true,
          discountId: true,
          costPrice: true,
          supplierId: true,
          lastSuppliedAt: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: { id: true, name: true, slug: true },
          },
          occasions: {
            select: { id: true, name: true, slug: true },
          },
          discount: {
            select: {
              id: true,
              name: true,
              value: true,
              type: true,
              isActive: true,
              startsAt: true,
              endsAt: true,
            },
          },
          itemsInside: {
            select: {
              itemId: true,
              quantity: true,
              sortOrder: true,
              item: {
                select: {
                  id: true,
                  name: true,
                  categoryId: true,
                  price: true,
                  stock: true,
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
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    revalidateHomePaths(id);

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }
    if (error?.code === "P2002" && error?.meta?.target?.includes("sku")) {
      return NextResponse.json({ message: "This SKU is already in use by another product" }, { status: 409 });
    }

    console.error("Product update error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, props: RouteProps) {
  const { id } = await props.params;

  if (!(await authorize())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    await db.product.delete({
      where: { id },
    });

    revalidateHomePaths(id);

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    console.error("Product delete error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, props: RouteProps) {
  return PATCH(req, props);
}
