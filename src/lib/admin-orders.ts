import { Prisma } from "@prisma/client";

export const ADMIN_ORDER_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PACKED", label: "Packed" },
  { value: "READY_TO_SHIP", label: "Ready To Ship" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

export const ADMIN_PAYMENT_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

type AdminOrderStatusValue = (typeof ADMIN_ORDER_STATUS_OPTIONS)[number]["value"];
type AdminPaymentStatusValue = (typeof ADMIN_PAYMENT_STATUS_OPTIONS)[number]["value"];

export const ADMIN_ORDERS_PAGE_SIZE = 10;

export function buildAdminOrderWhere({
  q,
  status,
  payment,
  type,
}: {
  q?: string;
  status?: string;
  payment?: string;
  type?: string;
}): Prisma.OrderWhereInput {
  const trimmedQuery = q?.trim();
  const normalizedStatus = (status || "").trim().toUpperCase();
  const normalizedPayment = (payment || "").trim().toUpperCase();
  const normalizedType = (type || "").trim().toUpperCase();

  const orderStatus = ADMIN_ORDER_STATUS_OPTIONS.some((option) => option.value === normalizedStatus)
    ? (normalizedStatus as AdminOrderStatusValue)
    : undefined;

  const paymentStatus = ADMIN_PAYMENT_STATUS_OPTIONS.some((option) => option.value === normalizedPayment)
    ? (normalizedPayment as AdminPaymentStatusValue)
    : undefined;

  let typeFilter: Prisma.OrderWhereInput = {};
  if (normalizedType === "DIGITAL") {
    typeFilter = {
      items: {
        some: { productId: "digital-gift-card" },
      },
    };
  } else if (normalizedType === "PAPER") {
    typeFilter = {
      items: {
        some: { productName: { contains: "Paper Gift Card", mode: "insensitive" } },
      },
    };
  } else if (normalizedType === "STANDARD") {
    typeFilter = {
      items: {
        none: {
          OR: [
            { productId: "digital-gift-card" },
            { productName: { contains: "Paper Gift Card", mode: "insensitive" } },
          ],
        },
      },
    };
  }

  return {
    ...(trimmedQuery
      ? {
          OR: [
            { orderNumber: { contains: trimmedQuery, mode: "insensitive" } },
            { customerName: { contains: trimmedQuery, mode: "insensitive" } },
            { customerEmail: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(orderStatus ? { orderStatus } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...typeFilter,
  };
}

export function formatOrderStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount);
}