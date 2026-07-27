import { db } from "@/lib/db";
import { startOfDay, startOfMonth, endOfDay, subDays } from "date-fns";

export async function getAdminDashboardStats() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);

  // 1. Today's Sales (LKR)
  const todaySales = await db.order.aggregate({
    _sum: {
      total: true,
    },
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
      // Optionally filter by payment status if needed
      // paymentStatus: "PAID", 
    },
  });

  // 2. Daily Order Count
  const dailyOrderCount = await db.order.count({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  // 3. Monthly Revenue (LKR)
  const monthlyRevenue = await db.order.aggregate({
    _sum: {
      total: true,
    },
    where: {
      createdAt: {
        gte: monthStart,
      },
    },
  });

  // 4. Today's Profit (LKR)
  // Need to fetch order items for today's orders and their products' cost prices
  const todayOrderItems = await db.orderItem.findMany({
    where: {
      order: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    },
    include: {
      order: true,
    },
  });

  // Get product cost prices for these items
  const productIds = [...new Set(todayOrderItems.map((item) => item.productId))];
  const products = await db.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      costPrice: true,
    },
  });

  const productCostMap = new Map(products.map((p) => [p.id, p.costPrice ?? 0]));

  const todayProfit = todayOrderItems.reduce((acc, item) => {
    const costPrice = productCostMap.get(item.productId) ?? 0;
    const itemProfit = item.subtotal - (costPrice * item.quantity);
    return acc + itemProfit;
  }, 0);

  // 5. Top Products (by sales volume)
  const topProductsRaw = await db.orderItem.groupBy({
    by: ["productId"],
    _sum: {
      quantity: true,
    },
    orderBy: {
      _sum: {
        quantity: "desc",
      },
    },
    take: 5,
  });

  const topProductIds = topProductsRaw.map(p => p.productId);
  const productsForNames = await db.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true }
  });
  const nameMap = new Map(productsForNames.map(p => [p.id, p.name]));

  // 6. Unrated Products (products missing reviews)
  const unratedProducts = await db.product.findMany({
    where: {
      reviewCount: 0,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      productImages: true,
    },
    take: 5,
    orderBy: {
      createdAt: "desc",
    },
  });

  // 7. Out-of-Stock Products (items with 0 quantity)
  const outOfStockProducts = await db.product.findMany({
    where: {
      stock: 0,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
      productImages: true,
      sku: true,
      supplier: {
        select: {
          name: true,
        },
      },
    },
    take: 5,
  });

  // 8. Weekly Order Counts (actual daily counts for the last 7 days)
  const sevenDaysAgo = startOfDay(subDays(now, 6));
  const recentOrdersList = await db.order.findMany({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      createdAt: true,
    },
  });

  const weeklyOrderVolume = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(now, 6 - i);
    const dayStart = startOfDay(d);
    const dayEnd = endOfDay(d);
    return recentOrdersList.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= dayStart && orderDate <= dayEnd;
    }).length;
  });

  return {
    kpis: {
      todaySales: todaySales._sum.total ?? 0,
      todayProfit: todayProfit,
      dailyOrderCount: dailyOrderCount,
      monthlyRevenue: monthlyRevenue._sum.total ?? 0,
    },
    topProducts: topProductsRaw.map((p) => ({
      id: p.productId,
      name: nameMap.get(p.productId) || "Unknown Product",
      sales: p._sum.quantity ?? 0,
    })),
    unratedProducts,
    outOfStockProducts,
    weeklyOrderVolume,
  };
}
