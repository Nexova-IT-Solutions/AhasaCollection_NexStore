import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { ReturnsTable } from "./returns-table";
import { RefreshCcw } from "lucide-react";

const RETURNS_FULL_ACCESS_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"] as const;
const RETURNS_PERMISSION_KEY = "pos.manage_returns";

export const dynamic = "force-dynamic";

export default async function AdminReturnsManagementPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  const role = session.user.role as string;
  const hasFullAccess = RETURNS_FULL_ACCESS_ROLES.includes(role as any);

  if (!hasFullAccess) {
    if (!hasPermission(session, RETURNS_PERMISSION_KEY)) {
      redirect("/admin");
    }
  }

  const resolvedParams = await props.searchParams;
  const page = parseInt(resolvedParams.page as string || "1") || 1;
  const limit = parseInt(resolvedParams.limit as string || "10") || 10;

  // Fetch returns with PENDING status first, then by date
  const [returns, totalCount] = await Promise.all([
    db.returnRequest.findMany({
      orderBy: [
        { status: "asc" },
        { createdAt: "desc" },
      ],
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.returnRequest.count()
  ]);

  // Sort manually to ensure PENDING is at the top
  const sortedReturns = [...returns].sort((a, b) => {
    if (a.status === "PENDING" && b.status !== "PENDING") return -1;
    if (a.status !== "PENDING" && b.status === "PENDING") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const normalizedReturns = sortedReturns.map((item) => ({
    id: item.id,
    orderId: item.orderId,
    orderNumber: item.order.orderNumber,
    customerName: item.order.customerName,
    reason: item.reason,
    status: item.status as "PENDING" | "ACCEPTED" | "REJECTED" | "REFUNDED",
    images: item.images,
    createdAt: item.createdAt.toISOString(),
    adminNote: item.adminNote,
  }));

  return (
    <div className="min-h-screen bg-[#FFF7FB]/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-[#1F1720] flex items-center gap-3">
              <div className="p-2 bg-[#FCEAF4] rounded-xl">
                <RefreshCcw className="h-7 w-7 text-[#A7066A]" />
              </div>
              Return Management
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Review and process customer return requests. Pending requests require your immediate attention.
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <ReturnsTable 
            returns={normalizedReturns} 
            locale={locale} 
            totalCount={totalCount}
            currentPage={page}
            limit={limit}
          />
        </div>
      </div>
    </div>
  );
}
