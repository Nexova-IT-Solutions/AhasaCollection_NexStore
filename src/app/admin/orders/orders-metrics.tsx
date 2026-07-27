import { CalendarDays, CircleDollarSign, Clock3, ShoppingCart } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/admin-orders";
import { cn } from "@/lib/utils";

type OrdersMetricsProps = {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  todaysOrders: number;
};

const baseCard = "rounded-2xl border shadow-sm";

export function OrdersMetrics({ totalOrders, pendingOrders, totalRevenue, todaysOrders }: OrdersMetricsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="Total Orders"
        value={totalOrders.toLocaleString()}
        icon={ShoppingCart}
        helper="All orders in the system"
      />
      <MetricCard
        title="Pending Orders"
        value={pendingOrders.toLocaleString()}
        icon={Clock3}
        helper="Requires operational attention"
        highlighted={pendingOrders > 0}
      />
      <MetricCard
        title="Total Revenue"
        value={formatCurrency(totalRevenue)}
        icon={CircleDollarSign}
        helper="Paid orders only"
      />
      <MetricCard
        title="Today's Orders"
        value={todaysOrders.toLocaleString()}
        icon={CalendarDays}
        helper="Placed since midnight"
      />
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  helper,
  highlighted = false,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  helper: string;
  highlighted?: boolean;
}) {
  return (
    <Card
      className={cn(
        baseCard,
        highlighted ? "border-yellow-300 bg-yellow-50" : "border-brand-border bg-white"
      )}
    >
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6B5A64]">{title}</p>
          <p className={cn("text-2xl font-bold", highlighted ? "text-red-700" : "text-[#1F1720]")}>{value}</p>
          <p className="text-xs text-[#6B5A64]">{helper}</p>
        </div>
        <div className={cn("rounded-2xl p-3", highlighted ? "bg-yellow-100 text-yellow-800" : "bg-slate-100 text-[#A7066A]")}> 
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
