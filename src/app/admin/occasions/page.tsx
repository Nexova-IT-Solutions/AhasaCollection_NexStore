import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { OccasionsClient } from "./occasions-client";

export default async function AdminOccasionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
    redirect("/"); 
  }

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page as string || "1") || 1;
  const limit = parseInt(resolvedParams.limit as string || "10") || 10;

  const [occasions, totalCount] = await Promise.all([
    db.occasion.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.occasion.count(),
  ]);

  return (
    <div className="w-full bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10">
        <OccasionsClient 
          initialOccasions={occasions} 
          totalCount={totalCount}
          currentPage={page}
          limit={limit}
        />
      </div>
    </div>
  );
}
