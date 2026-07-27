import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { AddressList } from "@/components/profile/AddressList";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function BillingPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const t = await getTranslations("Addresses");
  const p = await getTranslations("Profile");

  if (!session?.user?.id) return null;

  // Fetch only billing addresses for this page
  const billingAddresses = await db.address.findMany({
    where: {
      userId: session.user.id,
      type: "BILLING",
    },
    orderBy: { isDefault: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
        <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
          <CreditCard className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{p("billing")}</h1>
          <p className="text-gray-500 mt-1">{p("updateBilling")}</p>
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-100 text-blue-800 rounded-3xl p-6">
        <ShieldCheck className="h-6 w-6 text-blue-600" />
        <AlertTitle className="font-bold mb-1">Secure Billing</AlertTitle>
        <AlertDescription className="text-sm opacity-90">
          Your billing information is encrypted and stored securely. We do not store full credit card details on our servers.
        </AlertDescription>
      </Alert>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          Saved Billing Addresses
        </h3>
        <AddressList initialAddresses={billingAddresses} defaultType="BILLING" locale={params.locale} />
      </div>

      {/* Payment Methods Placeholder */}
      <div className="mt-12 pt-12 border-t border-gray-50">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Methods</h3>
        <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
          <p className="text-gray-500 font-medium">No payment methods saved.</p>
          <p className="text-sm text-gray-400 mt-1">Payment methods are added during checkout.</p>
        </div>
      </div>
    </div>
  );
}
