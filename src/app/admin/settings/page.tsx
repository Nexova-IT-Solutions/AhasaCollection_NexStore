import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getStoreConfig } from "@/lib/store-config";
import { Settings, CreditCard, ChevronRight, Truck } from "lucide-react";
import { StoreSettingsForm } from "@/components/admin/settings/StoreSettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    redirect("/admin");
  }

  const config = await getStoreConfig();

  const serializedConfig = {
    id: config.id,
    deliveryFee: config.deliveryFee,
    freeDeliveryThreshold: config.freeDeliveryThreshold,
    expressDeliveryFee: config.expressDeliveryFee,
    isDeliveryEnabled: config.isDeliveryEnabled,
    deliveryNote: config.deliveryNote,
    hideOutOfStockProducts: config.hideOutOfStockProducts,
    hideEmptyCategories: config.hideEmptyCategories,
    updatedAt: config.updatedAt.toISOString(),
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto space-y-8 px-4 md:px-8 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-border pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FCEAF4] rounded-xl">
              <Settings className="w-6 h-6 text-[#A7066A]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1F1720]">
                Store Settings
              </h1>
              <p className="text-[#6B5A64] mt-1">
                Configure global store behavior and visibility rules.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <StoreSettingsForm config={serializedConfig} />
          </div>

          <div className="space-y-6">
            <Card className="border-brand-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#1F1720]">
                  System Navigation
                </CardTitle>
                <p className="text-sm text-[#6B5A64]">
                  Access other system-level configurations.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  href={`/admin/settings/payments`}
                  className="group flex items-center justify-between rounded-xl border border-brand-border bg-[#FAFAFA] p-4 transition-all hover:border-[#A7066A] hover:bg-[#FCEAF4]/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white p-2 text-[#A7066A] shadow-sm ring-1 ring-brand-border group-hover:bg-[#A7066A] group-hover:text-white transition-colors">
                      <CreditCard className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1F1720]">
                        Payment Configuration
                      </p>
                      <p className="text-xs text-[#6B5A64]">
                        Manage payment methods and gateways.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-[#6B5A64] group-hover:text-[#A7066A] transition-colors" />
                </Link>

                <Link
                  href={`/admin/settings/shipping`}
                  className="group flex items-center justify-between rounded-xl border border-brand-border bg-[#FAFAFA] p-4 transition-all hover:border-[#A7066A] hover:bg-[#FCEAF4]/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white p-2 text-[#A7066A] shadow-sm ring-1 ring-brand-border group-hover:bg-[#A7066A] group-hover:text-white transition-colors">
                      <Truck className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1F1720]">
                        Shipping Configuration
                      </p>
                      <p className="text-xs text-[#6B5A64]">
                        Manage delivery fees, thresholds, and cities.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-[#6B5A64] group-hover:text-[#A7066A] transition-colors" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
