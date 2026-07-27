import { db } from "@/lib/db";
import Link from "next/link";
import { Header, Footer, CartDrawer } from "@/components/giftbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Package, Truck, Phone, Mail, Inbox, Building2, Info, MessageCircle, Landmark } from "lucide-react";
import { SuccessClient } from "./SuccessClient";
import { OrderDetailActions } from "@/components/profile/orders/order-detail-actions";
import { ResendGiftCardButton } from "./ResendGiftCardButton";
import { isFeatureEnabled } from "@/lib/queries/feature-toggles";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id: orderId } = await params;

  const isWhatsappEnabled = await isFeatureEnabled("whatsapp_enabled");

  // Fetch order details to check for digital items
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      bankAccount: true,
      _count: {
        select: {
          purchasedGiftCards: true,
        },
      },
      purchasedGiftCards: {
        select: {
          id: true,
          deliveryStatus: true,
          code: true,
        }
      },
      giftCardsIssued: {
        select: {
          id: true,
          deliveryStatus: true,
          code: true,
        }
      }
    },
  });

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#1F1720]">Order Not Found</h1>
            <p className="text-[#6B5A64] mt-2">We couldn't find the details for this order.</p>
            <Button asChild className="mt-4 bg-[#A7066A]">
              <Link href={`/${locale}`}>Back to Home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Logic to determine if the order is digital-only
  // Digital items are identified by productId starting with 'giftcard-' or the pseudo-ID 'digital-gift-card'
  const isDigitalOnly = order.items.every(
    (item) =>
      item.productId === "digital-gift-card" ||
      item.productId.startsWith("giftcard-")
  );

  const hasGiftCards = order._count.purchasedGiftCards > 0 || order.items.some(i => i.productId === "digital-gift-card");
  const isPaid = order.paymentStatus === "PAID" || order.paymentStatus === "CONFIRMED";
  const isBankTransfer = order.paymentMethod === "BANK_TRANSFER";

  // Fetch active bank accounts if it's a bank transfer, prioritizing the specifically selected one
  const bankAccounts = isBankTransfer 
    ? (order.bankAccount ? [order.bankAccount] : await db.bankAccount.findMany({ where: { isActive: true } }))
    : [];

  const allGiftCards = [...(order.purchasedGiftCards || []), ...(order.giftCardsIssued || [])];
  const anyFailed = allGiftCards.some(gc => gc.deliveryStatus === "FAILED");
  const anyPending = allGiftCards.some(gc => gc.deliveryStatus === "PENDING");
  const allSent = allGiftCards.length > 0 && allGiftCards.every(gc => gc.deliveryStatus === "SENT");

  const gateway = isBankTransfer
    ? await db.paymentGateway.findUnique({ where: { name: "BANK_TRANSFER" } })
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SuccessClient shouldPoll={anyPending} />
      <Header />
      <CartDrawer />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-lg w-full text-center">
          <div className="mb-6 animate-fade-in">
            <div className="w-24 h-24 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1720] mb-3">
            Order Placed Successfully!
          </h1>
          <p className="text-[#6B5A64] text-lg mb-2">Thank you for your order</p>
          <p className="text-[#6B5A64]">
            We&apos;ve sent a confirmation to <span className="font-medium text-[#1F1720]">{order.customerEmail}</span>
          </p>

          <Card className="mt-8 border-brand-border bg-[#FCEAF4]/30">
            <CardContent className="p-6">
              <p className="text-sm text-[#6B5A64] mb-1">Order ID</p>
              <p className="text-base sm:text-lg font-semibold text-[#A7066A] break-all">
                {order.orderNumber || "PROCESSING"}
              </p>
            </CardContent>
          </Card>

          <div className="mt-8 space-y-4">
            {isBankTransfer && (
              <div className="p-6 rounded-2xl bg-brand-light/20 border-2 border-dashed border-[#A7066A]/30 space-y-5 animate-in zoom-in-95 duration-500">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-white border-4 border-[#FCEAF4] flex items-center justify-center shadow-sm">
                    <Building2 className="w-8 h-8 text-[#A7066A]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1F1720]">Pending Bank Transfer</h3>
                  <p className="text-sm text-[#6B5A64]">Please complete your payment to the following account(s):</p>
                </div>

                <div className="grid gap-4">
                  {bankAccounts.map((account) => (
                    <div key={account.id} className="p-5 rounded-2xl bg-white border border-brand-border shadow-md hover:shadow-lg transition-shadow text-left">
                      <div className="flex items-center gap-2 mb-3">
                        <Landmark className="w-4 h-4 text-[#A7066A]" />
                        <p className="text-xs font-bold text-[#A7066A] uppercase tracking-widest">{account.bankName}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1 border-b border-brand-border/30">
                          <span className="text-[10px] text-[#6B5A64] font-bold uppercase tracking-wider">Account Name</span>
                          <span className="text-sm font-bold text-[#1F1720]">{account.accountName}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-brand-border/30">
                          <span className="text-[10px] text-[#6B5A64] font-bold uppercase tracking-wider">Account Number</span>
                          <span className="text-sm font-bold text-[#1F1720] font-mono tracking-wider">{account.accountNumber}</span>
                        </div>
                        {account.branchName && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-[10px] text-[#6B5A64] font-bold uppercase tracking-wider">Branch</span>
                            <span className="text-sm font-bold text-[#1F1720]">{account.branchName}</span>
                          </div>
                        )}
                      </div>
                      {account.instructions && (
                        <div className="mt-4 p-3 rounded-xl bg-[#FCEAF4]/30 border border-[#A7066A]/10 text-left">
                          <p className="text-[11px] text-[#6B5A64] italic leading-relaxed">
                            {account.instructions}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {isWhatsappEnabled ? (
                  <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-100 w-full">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shadow-sm">
                      <MessageCircle className="w-6 h-6 text-green-600 fill-green-600/10" />
                    </div>
                    <div className="text-center space-y-3">
                      <div>
                        <p className="text-xs font-bold text-green-800 uppercase tracking-widest">Verification Step</p>
                        <p className="text-xs text-green-700 mt-1 font-medium">
                          Once paid, please send your bank slip via WhatsApp to speed up fulfillment.
                        </p>
                      </div>
                      <Button asChild className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-full px-8 h-11 shadow-lg hover:shadow-xl transition-all duration-300">
                        <a 
                          href={`https://wa.me/94779911825?text=${encodeURIComponent(`Hello, here is my bank slip for Order ID: ${order.orderNumber || orderId}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <MessageCircle className="w-5 h-5 fill-white text-white" />
                          Send Slip via WhatsApp
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 w-full">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shadow-sm">
                      <Landmark className="w-6 h-6 text-slate-600" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-widest">Order Processing</p>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        Once paid, your order transfer will be verified and processed by our team.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <h2 className="text-lg font-semibold text-[#1F1720]">What Happens Next?</h2>

            <div className="grid gap-4">
              {isDigitalOnly ? (
                /* Digital-only order message */
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-brand-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {isBankTransfer ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Inbox className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-[#1F1720] text-lg">Verification Pending</h3>
                        <p className="text-sm text-[#6B5A64] mt-1 leading-relaxed">
                          {isWhatsappEnabled 
                            ? "Gift cards will be emailed once your bank transfer is verified. Please send your bank slip via WhatsApp to speed up the process."
                            : "Gift cards will be emailed once your bank transfer is verified."}
                        </p>
                      </div>
                    </>
                  ) : allSent ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Inbox className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-[#1F1720] text-lg">Email Delivered</h3>
                        <p className="text-sm text-[#6B5A64] mt-1 leading-relaxed">
                          Your digital gift card has been successfully generated and sent to your email address. Please check your inbox (and spam folder) for the code.
                        </p>
                      </div>
                    </>
                  ) : anyFailed ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-[#1F1720] text-lg">Delivery Issues</h3>
                        <p className="text-sm text-[#6B5A64] mt-1 leading-relaxed">
                          We encountered an issue sending your gift card email. Our team has been notified, but you can also try resending it from your order details.
                        </p>
                        <ResendGiftCardButton orderId={orderId} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Inbox className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-[#1F1720] text-lg">Generating Gift Card</h3>
                        <p className="text-sm text-[#6B5A64] mt-1 leading-relaxed">
                          Your digital gift card is being generated and will be sent to your email shortly. This usually takes less than a minute.
                        </p>
                        <ResendGiftCardButton orderId={orderId} />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Normal physical order messages */
                <>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-brand-border">
                    <div className="w-10 h-10 rounded-full bg-[#FCEAF4] flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-[#A7066A]" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-[#1F1720]">Order Preparation</h3>
                      <p className="text-sm text-[#6B5A64]">
                        We&apos;ll prepare your gift with care and attention to detail.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-brand-border">
                    <div className="w-10 h-10 rounded-full bg-[#FCEAF4] flex items-center justify-center flex-shrink-0">
                      <Truck className="w-5 h-5 text-[#A7066A]" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-[#1F1720]">On The Way</h3>
                      <p className="text-sm text-[#6B5A64]">
                        Your gift will be delivered on your selected date and time.
                      </p>
                    </div>
                  </div>


                </>
              )}
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-[#FCEAF4]/50 border border-brand-border">
            <p className="text-sm text-[#6B5A64] mb-3">Need help with your order?</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <a href="tel:+94123456789" className="flex items-center gap-2 text-[#A7066A] hover:underline">
                <Phone className="w-4 h-4" />
                +94 123 456 789
              </a>
              <a href="mailto:hello@soharpets.com" className="flex items-center gap-2 text-[#A7066A] hover:underline">
                <Mail className="w-4 h-4" />
                hello@soharpets.com
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            {hasGiftCards && (
              <OrderDetailActions 
                orderId={order.id} 
                orderNumber={order.orderNumber} 
                hasGiftCards={hasGiftCards} 
                isPaid={isPaid} 
              />
            )}
            <Button asChild variant="outline" className="border-brand-border h-12 px-8 rounded-full">
              <Link href={`/${locale}`}>Continue Shopping</Link>
            </Button>
            <Button asChild className="bg-[#A7066A] hover:bg-[#8B0557] h-12 px-8 rounded-full shadow-lg shadow-[#A7066A]/20">
              <Link href={`/${locale}/profile/orders`}>View My Orders</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
