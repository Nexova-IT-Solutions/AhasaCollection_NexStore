import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { BannersClient } from "./banners-client";

export default async function AdminBannersPage() {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
    redirect("/");
  }

  const banners = await db.promoBanner.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Serialise dates so the client receives plain strings
  const serialised = banners.map((b) => ({
    ...b,
    // Normalise: if images array is empty but imageUrl exists, backfill
    images: Array.isArray(b.images) && b.images.length > 0 ? b.images : b.imageUrl ? [b.imageUrl] : [],
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  return (
    <div className="w-full bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10">
        <BannersClient initialBanners={serialised} />
      </div>
    </div>
  );
}
