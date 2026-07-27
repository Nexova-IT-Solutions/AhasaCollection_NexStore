import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DenominationsClient } from "./denominations-client";

export default async function DenominationsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(session.user.role as string)) {
    redirect("/");
  }

  const denominations = await db.giftCardDenomination.findMany({
    orderBy: {
      value: "asc",
    },
  });

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1F1720]">Gift Card Denominations</h1>
          <p className="text-[#6B5A64] mt-1">Manage available price options for gift cards on the storefront.</p>
        </div>

        <DenominationsClient initialData={denominations} />
      </div>
    </div>
  );
}
