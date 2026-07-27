import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { CategoriesClient } from "./categories-client";

export default async function AdminCategoriesPage({
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

  // 1. Count only the top-level (root) categories
  const totalCount = await db.category.count({
    where: { parentId: null }
  });

  // 2. Fetch root categories for the current page slice
  const rootCategories = await db.category.findMany({
    where: { parentId: null },
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
    },
    orderBy: { name: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  // 3. Fetch all subcategories so they can be nested under the retrieved root categories
  const subCategories = await db.category.findMany({
    where: { parentId: { not: null } },
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
    },
    orderBy: { name: "asc" },
  });

  const normalizedCategories = [...rootCategories, ...subCategories].map((category) => ({
    ...category,
    parent: null,
    children: [],
  }));

  return (
    <div className="bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 min-h-full">
      <div className="max-w-[1600px] w-full mx-auto px-4 md:px-8 lg:px-10">
        <CategoriesClient 
          key={`${page}-${limit}`}
          initialCategories={normalizedCategories} 
          totalCount={totalCount}
          currentPage={page}
          limit={limit}
        />
      </div>
    </div>
  );
}
