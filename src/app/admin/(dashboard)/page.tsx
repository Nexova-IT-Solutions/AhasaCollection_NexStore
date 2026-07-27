import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || ((session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN") && session.user.role !== "ADMIN")) {
    redirect("/"); 
  }
  let kpis = {
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    outOfStockItems: 0,
  };
  let recentOrders: Array<{ id: string; customer: string; amount: number; status: string }> = [];
  
  try {
    const [
      customerCount,
      outOfStockCount,
    ] = await Promise.all([
      db.user.count({ where: { role: "USER" } }),
      db.product.count({ where: { stock: { lte: 0 } } }),
    ]);
    kpis = {
      totalSales: 0,
      totalOrders: 0,
      totalCustomers: customerCount,
      outOfStockItems: outOfStockCount,
    };

    // Placeholder table shape until Order model is introduced.
    recentOrders = [];
  } catch (error) {
    console.error("Failed to fetch dashboard counts:", error);
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto space-y-8 px-4 md:px-8 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-border pb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#1F1720]">Admin POS Dashboard</h1>
            <p className="text-[#6B5A64] mt-1">Touch-friendly controls for store operations and fast navigation.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Total Sales" value={`LKR ${kpis.totalSales.toLocaleString()}`} icon={DollarSign} accent="text-emerald-700" bgClass="bg-emerald-50" />
            <KpiCard title="Orders" value={kpis.totalOrders.toLocaleString()} icon={ShoppingCart} accent="text-blue-700" bgClass="bg-blue-50" />
            <KpiCard title="Customers" value={kpis.totalCustomers.toLocaleString()} icon={Users} accent="text-amber-700" bgClass="bg-amber-50" />
            <KpiCard title="Out-of-Stock" value={kpis.outOfStockItems.toLocaleString()} icon={AlertTriangle} accent="text-rose-700" bgClass="bg-rose-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <section className="flex h-full flex-col space-y-3">
            <h2 className="text-sm font-bold text-[#6B5A64] uppercase tracking-wider">Recent Orders</h2>
            <Card className="h-full rounded-2xl border-brand-border shadow-sm">
              <CardContent className="flex h-full flex-1 flex-col p-0">
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-slate-50 border-b border-brand-border">
                      <tr>
                        <th className="px-5 py-3 text-left font-semibold text-[#6B5A64]">ID</th>
                        <th className="px-5 py-3 text-left font-semibold text-[#6B5A64]">Customer</th>
                        <th className="px-5 py-3 text-left font-semibold text-[#6B5A64]">Amount</th>
                        <th className="px-5 py-3 text-left font-semibold text-[#6B5A64]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.length > 0 ? (
                        recentOrders.slice(0, 5).map((order) => (
                          <tr key={order.id} className="border-b border-brand-border/70 last:border-b-0">
                            <td className="px-5 py-3 font-medium text-[#1F1720]">{order.id}</td>
                            <td className="px-5 py-3 text-[#1F1720]">{order.customer}</td>
                            <td className="px-5 py-3 text-[#1F1720]">LKR {order.amount.toLocaleString()}</td>
                            <td className="px-5 py-3">
                              <span className="inline-flex rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-semibold">
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-[#6B5A64]">
                            No recent orders available yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="flex h-full flex-col space-y-3">
            <h2 className="text-sm font-bold text-[#6B5A64] uppercase tracking-wider">Inventory Alerts</h2>
            <Card className="h-full rounded-2xl border-brand-border shadow-sm bg-white">
              <CardHeader className="border-b border-brand-border pb-4">
                <CardTitle className="text-base font-bold text-[#1F1720]">Low Stock Overview</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 items-stretch p-5">
                <div className="grid w-full gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Out of stock items</p>
                    <p className="mt-2 text-3xl font-black text-rose-700">{kpis.outOfStockItems.toLocaleString()}</p>
                    <p className="mt-1 text-sm text-rose-700/80">Products require immediate restock attention.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6B5A64]">Operational focus</p>
                    <p className="mt-2 text-lg font-bold text-[#1F1720]">Keep the catalog balanced</p>
                    <p className="mt-1 text-sm text-[#6B5A64]">Review stock movement and replenish fast-moving items regularly.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  accent,
  bgClass,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  bgClass: string;
}) {
  return (
    <Card className={`border border-brand-border shadow-sm rounded-xl overflow-hidden ${bgClass}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-4 pt-3">
        <CardTitle className="text-[11px] font-bold text-[#6B5A64] uppercase tracking-wide">{title}</CardTitle>
        <Icon className={`w-5 h-5 ${accent}`} />
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="text-xl font-bold text-[#1F1720]">{value}</div>
      </CardContent>
    </Card>
  );
}

