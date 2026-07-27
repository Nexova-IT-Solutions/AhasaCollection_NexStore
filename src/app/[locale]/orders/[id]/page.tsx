import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { Header, Footer } from "@/components/giftbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  Truck, 
  MapPin, 
  Phone, 
  Mail,
  ArrowLeft 
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getCurrencyServer, formatPriceServer } from "@/lib/currency";

interface OrderDetailsPageProps {
  params: Promise<{ locale: string; id: string }>;
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

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "PAID":
      return "bg-green-100 text-green-800";
    case "FAILED":
      return "bg-red-100 text-red-800";
    case "REFUNDED":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "DELIVERED":
      return <CheckCircle className="w-5 h-5" />;
    case "SHIPPED":
      return <Truck className="w-5 h-5" />;
    default:
      return <Clock className="w-5 h-5" />;
  }
};

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { locale, id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}/sign-in`);
  }

  try {
    // Fetch order from database
    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return (
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-[#1F1720]">Order Not Found</h1>
              <p className="text-[#6B5A64] mt-2">The order you're looking for doesn't exist.</p>
              <Button asChild className="mt-4 bg-[#A7066A]">
                <Link href={`/${locale}/orders`}>Back to Orders</Link>
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    // Verify user owns this order
    if (order.userId !== session.user.id) {
      redirect(`/${locale}`);
    }

    const currency = await getCurrencyServer();
    const formatPrice = (price: number) => formatPriceServer(price, currency);
    const formatDate = (date: Date) => new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 py-8">
            {/* Back Button */}
            <Link href={`/${locale}`} className="inline-flex items-center gap-2 text-gray-500 hover:text-[#A7066A] mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Order Confirmation</h1>
                <div className="mt-2 space-y-1">
                  <p className="text-gray-500">Order Number: <span className="font-mono font-semibold text-gray-900">{order.orderNumber}</span></p>
                  <p className="text-sm text-gray-400">
                    Placed on {formatDate(order.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 px-4 rounded-xl border border-gray-100 shadow-sm">
                {getStatusIcon(order.orderStatus)}
                <Badge className={`${getOrderStatusColor(order.orderStatus)} border-0 shadow-none capitalize`}>
                  {order.orderStatus.toLowerCase()}
                </Badge>
              </div>
            </div>

            {/* Main Grid Structure */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT COLUMN - Main Details (2/3 width) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Order Status Card */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Status</h2>
                  <div className="relative flex flex-col gap-8">
                    {/* Vertical line connector */}
                    <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gray-100" />
                    
                    <div className="relative flex items-center gap-4 z-10">
                      <div className="w-10 h-10 rounded-full bg-[#A7066A] flex items-center justify-center text-white ring-4 ring-[#FCEAF4]">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Order Placed</p>
                        <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    
                    {order.orderStatus !== "PENDING" && (
                      <div className="relative flex items-center gap-4 z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ring-4 ${
                          order.orderStatus === "DELIVERED" ? "bg-[#A7066A] ring-[#FCEAF4]" : "bg-gray-200 ring-gray-50"
                        }`}>
                          <Truck className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">In Transit</p>
                          <p className="text-sm text-gray-500">Your order is on the way</p>
                        </div>
                      </div>
                    )}

                    {order.orderStatus === "DELIVERED" && (
                      <div className="relative flex items-center gap-4 z-10">
                        <div className="w-10 h-10 rounded-full bg-[#A7066A] flex items-center justify-center text-white ring-4 ring-[#FCEAF4]">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Delivered</p>
                          <p className="text-sm text-gray-500">Your order has been delivered</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items Card */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Items</h2>
                  <div className="divide-y divide-gray-100">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                          {item.productImage && (
                            <Image
                              src={item.productImage}
                              alt={item.productName}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{item.productName}</p>
                          <p className="text-sm text-gray-500 mt-1">Qty: <span className="text-gray-900 font-medium">{item.quantity}</span></p>
                          {item.discountName && (
                            <Badge variant="outline" className="mt-2 text-green-600 border-green-100 bg-green-50">
                              {item.discountName}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right flex flex-col justify-center">
                          <p className="font-bold text-gray-900">{formatPrice(item.subtotal)}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatPrice(item.salePrice || item.unitPrice)} / unit</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Details Card */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Delivery Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#A7066A] flex-shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Shipping Address</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {(order.shippingAddress as any).addressLine1}
                          {(order.shippingAddress as any).addressLine2 && <>, {(order.shippingAddress as any).addressLine2}</>}
                          <br />
                          {(order.shippingAddress as any).city}, {(order.shippingAddress as any).postalCode}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#A7066A] flex-shrink-0">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Contact Phone</p>
                        <p className="text-sm text-gray-700 font-medium">{order.customerPhone}</p>
                      </div>
                    </div>
                  </div>

                  {order.giftMessage && (
                    <div className="mt-8 p-4 rounded-xl bg-[#FCEAF4]/30 border border-[#FCEAF4] relative">
                      <p className="text-xs font-bold text-[#A7066A] uppercase tracking-wider mb-2">Gift Message</p>
                      <p className="text-sm text-gray-700 italic leading-relaxed">"{order.giftMessage}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN - Summary & Info (1/3 width) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Order Summary Card */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Subtotal</span>
                      <span className="text-sm font-medium text-gray-900">{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Delivery Fee</span>
                      <span className={`text-sm font-medium ${order.deliveryFee === 0 ? "text-green-600" : "text-gray-900"}`}>
                        {order.deliveryFee === 0 ? "FREE" : formatPrice(order.deliveryFee)}
                      </span>
                    </div>
                    <Separator className="bg-gray-100" />
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-base font-bold text-gray-900">Total</span>
                      <span className="text-xl font-black text-[#A7066A]">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Status & Method Card */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Status</h2>
                  <div className="space-y-6">
                    <Badge className={`${getPaymentStatusColor(order.paymentStatus)} w-full justify-center py-2 text-sm font-bold border-0 shadow-none`}>
                      {order.paymentStatus}
                    </Badge>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Method</span>
                      <span className="text-sm font-semibold text-gray-900">{order.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Information Card */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Contact Information</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Name</span>
                      <span className="text-sm font-medium text-gray-900">{order.customerName}</span>
                    </div>
                    {order.customerEmail && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Email</span>
                        <span className="text-sm font-medium text-gray-900 truncate ml-4" title={order.customerEmail}>
                          {order.customerEmail}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Need Help CTA */}
                <div className="p-6 rounded-2xl bg-gray-900 text-white shadow-lg shadow-gray-200">
                  <h3 className="font-bold text-lg mb-2">Need help?</h3>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">If you have any questions about your order, please contact our support team.</p>
                  <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-800 hover:text-white rounded-xl">
                    Contact Support
                  </Button>
                </div>

              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  } catch (error) {
    console.error("[order-details] Error:", error);
    
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#1F1720]">Error Loading Order</h1>
            <p className="text-[#6B5A64] mt-2">An error occurred while loading your order.</p>
            <Button asChild className="mt-4 bg-[#A7066A]">
              <Link href={`/${locale}`}>Back to Home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
}
