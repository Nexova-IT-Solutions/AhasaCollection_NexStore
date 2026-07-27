import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ReviewsAdminClient } from "./reviews-admin-client";
import { Skeleton } from "@/components/ui/skeleton";

export default async function AdminReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user || ((session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN") && session.user.role !== "PRODUCT_MANAGER")) {
    redirect(`/${locale || "en"}/sign-in`);
  }

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <Suspense fallback={<ReviewsLoadingSkeleton />}>
        <ReviewsAdminClient />
      </Suspense>
    </div>
  );
}

function ReviewsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-[#F3EDF1]" />
          <Skeleton className="h-4 w-64 bg-[#F3EDF1]" />
        </div>
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 bg-[#F3EDF1]" />
        <Skeleton className="h-10 w-44 bg-[#F3EDF1]" />
      </div>
      <div className="border border-brand-border rounded-xl overflow-hidden">
        <div className="h-12 bg-[#F3EDF1]/50" />
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-12 w-full bg-[#F3EDF1]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
