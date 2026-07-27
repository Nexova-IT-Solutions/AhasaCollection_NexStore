import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { Header, Footer } from "@/components/giftbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  ArrowLeft 
} from "lucide-react";
import Link from "next/link";

interface OrdersPageProps {
  params: Promise<{ locale: string }>;
}

const getOrderStatusColor = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "PROCESSING":
      return "bg-blue-100 text-blue-800";
    case "SHIPPED":
      return "bg-purple-100 text-purple-800";
    case "DELIVERED":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    case "REFUNDED":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatPrice = (price: number) => `LKR ${price.toLocaleString()}`;
const formatDate = (date: Date) => new Date(date).toLocaleDateString("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}/sign-in`);
  }

  const orders = await db.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 md:px-8 lg:px-10 py-6">
          {/* Back Button */}
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 text-[#6B5A64] hover:text-[#A7066A] mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1F1720]">Your Orders</h1>
            <p className="text-[#6B5A64] mt-1">View and track your past orders</p>
          </div>

          {orders.length === 0 ? (
            <Card className="border-brand-border text-center py-12">
              <Package className="w-12 h-12 text-[#6B5A64] mx-auto mb-4 opacity-50" />
              <h2 className="text-lg font-semibold text-[#1F1720]">No Orders Yet</h2>
              <p className="text-[#6B5A64] mt-2">You haven't placed any orders yet.</p>
              <Button asChild className="mt-4 bg-[#A7066A]">
                <Link href={`/${locale}`}>Start Shopping</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Link key={order.id} href={`/${locale}/orders/${order.id}`}>
                  <Card className="border-brand-border hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-semibold text-[#1F1720]">{order.orderNumber}</p>
                            <Badge className={`${getOrderStatusColor(order.orderStatus)}`}>
                              {order.orderStatus}
                            </Badge>
                          </div>
                          <p className="text-sm text-[#6B5A64]">
                            {order.items.length} {order.items.length === 1 ? "item" : "items"}
                          </p>
                          <p className="text-xs text-[#6B5A64] mt-1">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#1F1720]">{formatPrice(order.total)}</p>
                          <p className="text-sm text-[#6B5A64] mt-1">
                            {(order.shippingAddress as any).city}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
