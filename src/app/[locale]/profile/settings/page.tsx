import { getTranslations } from "next-intl/server";
import { Settings, Bell, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ProfileSettingsForm } from "@/components/profile/ProfileSettingsForm";

export default async function SettingsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  await props.params;
  const t = await getTranslations("Profile");
  const tSettings = await getTranslations("ProfileSettings");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
        <div className="p-3 bg-purple-100 rounded-2xl text-purple-600">
          <Settings className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("settings")}</h1>
          <p className="text-gray-500 mt-1">{tSettings("managePreferences")}</p>
        </div>
      </div>

      <div className="space-y-10">
        {/* Profile Section */}
        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <ProfileSettingsForm />
        </div>

        {/* Notifications Section */}
        <section className="space-y-4 pt-8 border-t border-gray-50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-400" />
            {tSettings("notifications")}
          </h3>
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div>
                <p className="font-semibold text-gray-900">{tSettings("emailNotifications")}</p>
                <p className="text-sm text-gray-500">{tSettings("orderUpdates")}</p>
              </div>
              <Switch checked />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div>
                <p className="font-semibold text-gray-900">{tSettings("promotionalEmails")}</p>
                <p className="text-sm text-gray-500">{tSettings("newCollectionsOffers")}</p>
              </div>
              <Switch />
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="space-y-4 pt-8 border-t border-gray-50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-400" />
            {tSettings("security")}
          </h3>
          <div className="max-w-xl">
            <Button variant="outline" className="rounded-full">{tSettings("changePassword")}</Button>
            <p className="text-xs text-gray-500 mt-4">{tSettings("lastPasswordChange")}</p>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="space-y-4 pt-8 border-t border-gray-50">
          <h3 className="text-lg font-bold text-red-600">{tSettings("dangerZone")}</h3>
          <div className="p-6 border border-red-100 bg-red-50 rounded-3xl">
            <p className="font-semibold text-red-900">{tSettings("deleteAccount")}</p>
            <p className="text-sm text-red-700/70 mb-4">{tSettings("deleteConfirmation")}</p>
            <Button variant="destructive" className="rounded-full">{tSettings("deleteMyAccount")}</Button>
          </div>
        </section>
      </div>
    </div>
  );
}
