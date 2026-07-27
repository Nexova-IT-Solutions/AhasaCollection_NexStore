import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ShippingConfigForm } from "./shipping-config-form";
import { ProvincesCitiesManager } from "./provinces-cities-manager";

export default async function AdminShippingSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    redirect("/");
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1F1720]">Shipping Settings</h1>
          <p className="mt-1 text-sm text-[#6B5A64]">Manage delivery fees, provinces, cities, and shipping configuration.</p>
        </div>

        {/* Top row: Shipping config + Province/City manager */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Card className="rounded-2xl border border-brand-border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#1F1720]">Shipping Configuration</CardTitle>
              <CardDescription>Update default delivery fees, free delivery threshold, and shipping options</CardDescription>
            </CardHeader>
            <CardContent>
              <ShippingConfigForm />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-brand-border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#1F1720]">Provinces & Cities</CardTitle>
              <CardDescription>
                Add provinces and their cities with custom delivery fees. Active cities appear in the customer checkout.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProvincesCitiesManager />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
