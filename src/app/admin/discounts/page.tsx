import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DiscountsClient } from "./discounts-client";

export default async function AdminDiscountsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
    redirect("/");
  }

  const discountModel = (db as any).discount;

  const discounts = discountModel
    ? await discountModel.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { products: true },
          },
        },
      })
    : [];

  return (
    <div className="w-full bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10">
        <DiscountsClient initialDiscounts={discounts} />
      </div>
    </div>
  );
}
