import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AddressList } from "@/components/profile/AddressList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "My Addresses | GiftBox Lanka",
  description: "Manage your billing and shipping addresses for GiftBox Lanka.",
};

export const dynamic = "force-dynamic";

export default async function AddressesPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const locale = params.locale;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}/sign-in?callbackUrl=/${locale}/profile/addresses`);
  }

  const addresses = await db.address.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "desc" },
    ],
  });

  const t = await getTranslations("Addresses");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
          <MapPin className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("title")}</h1>
          <p className="text-gray-500 mt-1">{t("description")}</p>
        </div>
      </div>

      <AddressList initialAddresses={addresses} locale={locale} />
    </div>
  );
}
