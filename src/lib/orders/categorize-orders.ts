export type CustomerOrderLike = {
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  returnRequest?: any | null;
};

export type OrderCategoryKey = "toPay" | "toShip" | "toReceive" | "toReview" | "returns";

export type CategorizedOrders<T> = {
  all: T[];
  toPay: T[];
  toShip: T[];
  toReceive: T[];
  toReview: T[];
  returns: T[];
};

export function getOrderCategory<T extends CustomerOrderLike>(order: T): OrderCategoryKey {
  const orderStatus = order.orderStatus?.toUpperCase() || "";
  const paymentStatus = order.paymentStatus?.toUpperCase() || "";
  const paymentMethod = order.paymentMethod?.toUpperCase() || "";

  // A return request exists OR status is CANCELLED/REFUNDED
  if (order.returnRequest || ["CANCELLED", "REFUNDED"].includes(orderStatus)) {
    return "returns";
  }

  if (
    ["PENDING", "FAILED"].includes(paymentStatus) &&
    paymentMethod !== "COD" &&
    !["CANCELLED", "REFUNDED"].includes(orderStatus)
  ) {
    return "toPay";
  }

  if (
    (paymentStatus === "PAID" || paymentMethod === "COD") &&
    ["PENDING", "CONFIRMED", "PROCESSING"].includes(orderStatus)
  ) {
    return "toShip";
  }

  if (orderStatus === "SHIPPED") {
    return "toReceive";
  }

  if (orderStatus === "DELIVERED") {
    return "toReview";
  }

  return "returns";
}

export function categorizeOrders<T extends CustomerOrderLike>(orders: T[]): CategorizedOrders<T> {
  const categorized: CategorizedOrders<T> = {
    all: orders,
    toPay: [],
    toShip: [],
    toReceive: [],
    toReview: [],
    returns: [],
  };

  for (const order of orders) {
    const category = getOrderCategory(order);
    categorized[category].push(order);
  }

  return categorized;
}
