import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db, getMoodClient } from "@/lib/db";
import {
  getCategoriesForAdmin,
  getDiscountsForAdmin,
  getMoodsForAdmin,
  getOccasionsForAdmin,
  getRecipientsForAdmin,
} from "@/lib/queries/admin-reference";
import { ProductForm } from "../../product-form";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function AdminProductEditPage({ params }: PageProps) {
  const { locale, id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
    redirect("/");
  }

  const moodClient = getMoodClient();

  const safeRead = async <T,>(operation: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await operation();
    } catch {
      return fallback;
    }
  };

  const [product, categories, availableGiftItems, occasions, recipients, moods, discounts] = await Promise.all([
    safeRead(
      () =>
        db.product.findUnique({
          where: { id },
          select: {
            id: true,
            sku: true,
            name: true,
            nameAr: true,
            description: true,
            shortDescription: true,
            price: true,
            salePrice: true,
            discountId: true,
            stock: true,
            costPrice: true,
            supplierId: true,
            lastSuppliedAt: true,
            isNewArrival: true,
            isTrending: true,
            isTopRated: true,
            isBestSeller: true,
            showInDiscountSection: true,
            showInChocolateSection: true,
            showInSoftToysSection: true,
            isPremiumGiftBox: true,
            isSpecialTouch: true,
            specialTouchOrder: true,
            isAvailableInBuilder: true,
            categoryId: true,
            sizes: true,
            colors: true,
            productImages: true,
            productVariants: true,
            itemsInside: {
              select: {
                itemId: true,
                quantity: true,
                sortOrder: true,
                item: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    stock: true,
                  },
                },
              },
              orderBy: [{ sortOrder: "asc" }, { itemId: "asc" }],
            },
            occasions: {
              select: { id: true, name: true },
            },
            recipients: {
              select: { id: true, name: true, slug: true },
            },
            ...(moodClient
              ? {
                  moods: {
                    select: {
                      mood: {
                        select: { id: true, name: true, icon: true },
                      },
                    },
                  },
                }
              : {}),
          },
        }),
      null
    ),
    safeRead(() => getCategoriesForAdmin(), []),
    safeRead(
      () =>
        db.product.findMany({
          where: {
            isActive: true,
            id: { not: id },
            isPremiumGiftBox: false,
          },
          select: {
            id: true,
            name: true,
            stock: true,
            price: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { name: "asc" },
        }),
      []
    ),
    safeRead(() => getOccasionsForAdmin(), []),
    safeRead(() => getRecipientsForAdmin(), []),
    safeRead(() => getMoodsForAdmin(), []),
    safeRead(() => getDiscountsForAdmin(), []),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-gray-50">
      <ProductForm
        locale={locale}
        mode="edit"
        product={product}
        categories={categories}
        occasions={occasions}
        recipients={recipients}
        moods={moods}
        discounts={discounts}
        availableGiftItems={availableGiftItems}
      />
    </div>
  );
}
