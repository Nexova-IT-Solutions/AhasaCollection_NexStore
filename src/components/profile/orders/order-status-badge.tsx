import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OrderStatusBadgeProps = {
  status: string;
  type?: "ORDER" | "PAYMENT";
  className?: string;
};

const orderStatusClasses: Record<string, string> = {
  PENDING: "border-yellow-200 bg-yellow-100 text-yellow-800",
  CONFIRMED: "border-blue-200 bg-blue-100 text-blue-800",
  PROCESSING: "border-purple-200 bg-purple-100 text-purple-800",
  PACKED: "border-cyan-200 bg-cyan-100 text-cyan-800",
  READY_TO_SHIP: "border-sky-200 bg-sky-100 text-sky-800",
  SHIPPED: "border-indigo-200 bg-indigo-100 text-indigo-800",
  DELIVERED: "border-emerald-200 bg-emerald-100 text-emerald-800",
  CANCELLED: "border-red-200 bg-red-100 text-red-800",
  REFUNDED: "border-slate-200 bg-slate-100 text-slate-700",
};

const paymentStatusClasses: Record<string, string> = {
  PENDING: "border-yellow-200 bg-yellow-100 text-yellow-800",
  PAID: "border-emerald-200 bg-emerald-100 text-emerald-800",
  FAILED: "border-red-200 bg-red-100 text-red-800",
  CANCELLED: "border-red-200 bg-red-100 text-red-800",
  REFUNDED: "border-slate-200 bg-slate-100 text-slate-700",
};

function toLabel(value: string) {
  return (value || "UNKNOWN").replaceAll("_", " ");
}

export function OrderStatusBadge({ status, type = "ORDER", className }: OrderStatusBadgeProps) {
  const normalized = status?.toUpperCase() || "UNKNOWN";
  const colorClass = type === "PAYMENT" ? paymentStatusClasses[normalized] : orderStatusClasses[normalized];

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        colorClass || "border-slate-200 bg-slate-100 text-slate-700",
        className
      )}
    >
      {toLabel(normalized)}
    </Badge>
  );
}
