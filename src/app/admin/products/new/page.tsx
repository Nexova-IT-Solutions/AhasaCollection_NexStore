import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getCategoriesForAdmin,
  getDiscountsForAdmin,
  getMoodsForAdmin,
  getOccasionsForAdmin,
  getRecipientsForAdmin,
} from "@/lib/queries/admin-reference";
import { getAvailableGiftItemsForAdmin } from "@/lib/queries/admin-products";
import { ProductForm } from "../product-form";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AdminProductCreatePage({ params }: PageProps) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
    redirect("/");
  }

  const [categories, occasions, recipients, moods, discounts, availableGiftItems] = await Promise.all([
    getCategoriesForAdmin(),
    getOccasionsForAdmin(),
    getRecipientsForAdmin(),
    getMoodsForAdmin(),
    getDiscountsForAdmin(),
    getAvailableGiftItemsForAdmin(),
  ]);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-gray-50">
      <ProductForm
        locale={locale}
        mode="create"
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
