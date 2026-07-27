import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { buildAdminOrderWhere, ADMIN_ORDERS_PAGE_SIZE } from "@/lib/admin-orders";
import { ordersSearchParamsCache } from "./search-params";
import { OrdersMetrics } from "./orders-metrics";
import { OrdersTable } from "./orders-table";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Roles that can access orders without needing a specific privilege key */
const ORDERS_FULL_ACCESS_ROLES = ["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"] as const;

/** Permission key that grants order access for restricted roles (e.g. POS_ADMIN) */
const ORDERS_PERMISSION_KEY = "pos.manage_orders";

export default async function AdminOrdersPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  const role = session.user.role as string;
  const hasFullAccess = ORDERS_FULL_ACCESS_ROLES.includes(role as any);

  if (!hasFullAccess) {
    if (!hasPermission(session, ORDERS_PERMISSION_KEY)) {
      redirect("/admin");
    }
  }

  const query = await searchParams;
  const { q, status, payment, type, page } = ordersSearchParamsCache.parse(query);
  const currentPage = Math.max(page, 1);
  const limit = parseInt(query.limit as string || "10") || ADMIN_ORDERS_PAGE_SIZE;
  const where = buildAdminOrderWhere({ q, status, payment, type });

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * limit,
    take: limit,
    include: { 
      items: {
        select: {
          productId: true,
          productName: true,
        }
      },
      _count: { select: { items: true } } 
    },
  });

  const totalCount = await db.order.count({ where });
  const totalOrders = await db.order.count();
  const pendingOrders = await db.order.count({ where: { orderStatus: "PENDING" } });
  const revenueAggregate = await db.order.aggregate({
    where: { paymentStatus: "PAID" },
    _sum: { total: true },
  });
  const todaysOrders = await db.order.count({
    where: {
      createdAt: {
        gte: startOfToday(),
      },
    },
  });

  const normalizedOrders = orders.map((order) => {
    const hasDigital = order.items.some((i) => i.productId === "digital-gift-card");
    const hasPaper = order.items.some((i) => i.productName.toLowerCase().includes("paper gift card"));
    const hasStandard = order.items.some(
      (i) => i.productId !== "digital-gift-card" && !i.productName.toLowerCase().includes("paper gift card")
    );

    const types: string[] = [];
    if (hasDigital) types.push("DIGITAL");
    if (hasPaper) types.push("PAPER");
    if (hasStandard) types.push("STANDARD");

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      total: order.total,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      itemsCount: order._count.items,
      types,
    };
  });

  return (
    // <main> in layout.tsx is now overflow-y-auto — it owns page scrolling.
    // This page renders in a flat column; <main> provides the scrollbar.
    <div className="bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 min-h-full">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 md:px-8 lg:px-10">

        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-[#1F1720]">Orders Management</h1>
          <p className="text-sm text-[#6B5A64]">Search, filter, and monitor order flow from one operational dashboard.</p>
        </div>

        <OrdersMetrics
          totalOrders={totalOrders}
          pendingOrders={pendingOrders}
          totalRevenue={revenueAggregate._sum.total ?? 0}
          todaysOrders={todaysOrders}
        />

        <OrdersTable 
          key={`${currentPage}-${limit}-${q}-${status}-${payment}-${type}`}
          locale={locale} 
          orders={normalizedOrders} 
          totalCount={totalCount} 
          currentUserRole={session.user.role} 
        />

      </div>
    </div>
  );
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
