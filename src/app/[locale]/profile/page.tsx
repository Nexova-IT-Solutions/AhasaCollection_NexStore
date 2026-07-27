import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { 
  CreditCard, 
  ArrowRight,
  CheckCircle2,
  Settings
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { RecentlyViewedSection } from "@/components/profile/RecentlyViewedSection";

export default async function ProfileDashboard(props: {
  params: Promise<{ locale: string }>;
}) {
  await props.params;
  const session = await getServerSession(authOptions);
  const t = await getTranslations("Profile");

  if (!session?.user?.id) return null;

  // Fetch some summary data
  const [addressCount, defaultShipping] = await Promise.all([
    db.address.count({ where: { userId: session.user.id } }),
    db.address.findFirst({ where: { userId: session.user.id, type: "DELIVERY", isDefault: true } }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header / Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          {t("welcome")} {session.user?.name || "User"}! 👋
        </h1>
        <p className="text-gray-500 mt-1">{t("manageProfileDesc")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl border border-gray-100 bg-gray-50 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">{t("accountStatus")}</h3>
            <div className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              {t("active")}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200/50">
            <p className="text-xs text-gray-400 font-medium">{t("memberSince")}</p>
            <p className="text-sm font-semibold text-gray-700">March 2024</p>
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-gray-100 bg-gray-50 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">{t("addresses")}</h3>
            <div className="text-xl font-bold text-gray-900">
              {addressCount === 1 ? t("savedAddressSingular") : t("savedAddressesPlural", { count: addressCount })}
            </div>
            {defaultShipping && (
              <p className="text-sm text-gray-500 mt-2 truncate max-w-full">
                 🏠 {defaultShipping.city}
              </p>
            )}
          </div>
          <Link href="/profile/addresses" className="mt-4 text-[#A7066A] text-sm font-bold flex items-center gap-1 hover:underline group">
            {t("manageAddresses")}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 pt-8 border-t border-gray-50">
        <div className="flex gap-4 items-start p-6 rounded-3xl hover:bg-gray-50 transition-colors cursor-pointer group">
          <div className="p-3 bg-blue-100 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900">{t("billing")}</h4>
            <p className="text-sm text-gray-500 mt-1">{t("updateBilling")}</p>
            <Link href="/profile/billing" className="text-xs text-[#A7066A] font-bold uppercase tracking-widest mt-3 block hover:underline">
              {t("goBilling")}
            </Link>
          </div>
        </div>

        <div className="flex gap-4 items-start p-6 rounded-3xl hover:bg-gray-50 transition-colors cursor-pointer group">
          <div className="p-3 bg-purple-100 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-200">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900">{t("settings")}</h4>
            <p className="text-sm text-gray-500 mt-1">{t("manageNotificationsSecurity")}</p>
            <Link href="/profile/settings" className="text-xs text-[#A7066A] font-bold uppercase tracking-widest mt-3 block hover:underline">
              {t("viewSettings")}
            </Link>
          </div>
        </div>
      </div>

      <RecentlyViewedSection />
    </div>
  );
}
