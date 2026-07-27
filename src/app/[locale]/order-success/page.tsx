"use client";

import Link from "next/link";
import { Header, Footer, CartDrawer } from "@/components/giftbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Package, Truck, Phone, Mail, MapPin } from "lucide-react";

export default function OrderSuccessPage() {
  // Generate a random order number for demo
  const orderNumber = `GB${Date.now().toString().slice(-8)}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="max-w-lg w-full text-center">
          {/* Success Icon */}
          <div className="mb-6 animate-fade-in">
            <div className="w-24 h-24 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1720] mb-3">
            Order Placed Successfully!
          </h1>
          <p className="text-[#6B5A64] text-lg mb-2">
            Thank you for your order
          </p>
          <p className="text-[#6B5A64]">
            We&apos;ve sent a confirmation to your email
          </p>

          {/* Order Number */}
          <Card className="mt-8 border-brand-border bg-[#FCEAF4]/30">
            <CardContent className="p-6">
              <p className="text-sm text-[#6B5A64] mb-1">Order Number</p>
              <p className="text-2xl font-bold text-[#A7066A]">{orderNumber}</p>
            </CardContent>
          </Card>

          {/* What's Next */}
          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold text-[#1F1720]">What Happens Next?</h2>
            
            <div className="grid gap-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-brand-border">
                <div className="w-10 h-10 rounded-full bg-[#FCEAF4] flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-[#A7066A]" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-[#1F1720]">Order Preparation</h3>
                  <p className="text-sm text-[#6B5A64]">We&apos;ll prepare your gift with care and attention to detail.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-brand-border">
                <div className="w-10 h-10 rounded-full bg-[#FCEAF4] flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-[#A7066A]" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-[#1F1720]">On The Way</h3>
                  <p className="text-sm text-[#6B5A64]">Your gift will be delivered on your selected date and time.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-brand-border">
                <div className="w-10 h-10 rounded-full bg-[#FCEAF4] flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-[#A7066A]" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-[#1F1720]">Delivered</h3>
                  <p className="text-sm text-[#6B5A64]">Your loved one receives their special gift!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
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

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline" className="border-brand-border">
              <Link href="/">Continue Shopping</Link>
            </Button>
            <Button asChild className="bg-[#A7066A] hover:bg-[#8B0557]">
              <Link href="/box-builder">Build Another Box</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
