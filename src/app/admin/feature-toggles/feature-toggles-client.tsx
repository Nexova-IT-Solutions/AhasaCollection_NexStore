"use client";

import * as React from "react";
import useSWR, { useSWRConfig } from "swr";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, Image, Gift, Heart, Percent, CreditCard, Box, Star, ArrowRightLeft, Building2, Truck, Save, Loader2, RefreshCw, Globe, MessageCircle, Coins, Split, BarChart3, Banknote, Package, PackageX, ShoppingCart, ClipboardCheck, PieChart, Users } from "lucide-react";

interface FeatureTogglesClientProps {
  initialToggles: Record<string, boolean>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function FeatureTogglesClient({ initialToggles }: FeatureTogglesClientProps) {
  const { toast } = useToast();
  const { mutate } = useSWRConfig();
  
  // Use SWR for real-time feature state sync
  const { data: toggles, error, isLoading } = useSWR<Record<string, boolean>>(
    "/api/admin/feature-toggles",
    fetcher,
    {
      fallbackData: initialToggles,
      revalidateOnFocus: false,
    }
  );

  const [localToggles, setLocalToggles] = React.useState<Record<string, boolean>>(initialToggles);
  const [isSaving, setIsSaving] = React.useState(false);

  // SWR fetch for shipping config / currency
  const { data: configData, mutate: mutateConfig } = useSWR("/api/shipping-config", fetcher);
  const [currency, setCurrency] = React.useState("LKR");

  React.useEffect(() => {
    if (configData?.success && configData?.data?.currency) {
      setCurrency(configData.data.currency);
    }
  }, [configData]);

  // Sync SWR data with local form state when loaded
  React.useEffect(() => {
    if (toggles) {
      setLocalToggles(toggles);
    }
  }, [toggles]);

  const handleToggleChange = (key: string, checked: boolean) => {
    setLocalToggles((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save feature toggles
      const response = await fetch("/api/admin/feature-toggles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ toggles: localToggles }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save feature toggles");
      }

      // 2. Save currency configuration
      const configRes = await fetch("/api/admin/shipping-config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currency }),
      });

      if (!configRes.ok) {
        const configErr = await configRes.json().catch(() => ({}));
        throw new Error(configErr.message || "Failed to save currency configuration");
      }

      toast({
        title: "Configuration Saved",
        description: "Feature toggles and currency settings updated and synced successfully.",
      });

      // Mutate SWR keys globally to update the sidebar in real time
      await mutate("/api/admin/feature-toggles");
      await mutateConfig();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (toggles) {
      setLocalToggles(toggles);
    }
  };

  // Group Configurations
  const storefrontFeatures = [
    { key: "storefront_banners", label: "Promo Banners", icon: Image, desc: "Control home screen slides and banners" },
    { key: "storefront_occasions", label: "Occasions", icon: Gift, desc: "Manage gifting event categories" },
    { key: "storefront_recipients", label: "Recipients", icon: Heart, desc: "Manage recipient relationship tags" },
    { key: "storefront_discounts", label: "Discount", icon: Percent, desc: "Manage checkout promo codes & reductions" },
    { key: "storefront_giftcards", label: "Gift Cards", icon: CreditCard, desc: "Manage physical and digital gift cards" },
    { key: "storefront_wrapping", label: "Gift Wrapping", icon: Box, desc: "Manage custom packaging options" },
  ];

  const operationsFeatures = [
    { key: "operations_reviews", label: "Reviews", icon: Star, desc: "Moderate user testimonials & product reviews" },
    { key: "operations_returns", label: "Returns", icon: ArrowRightLeft, desc: "Process order refunds and returns" },
    { key: "operations_suppliers", label: "Suppliers", icon: Building2, desc: "Manage distributor contacts & inventory history" },
    { key: "operations_shipping", label: "Shipping", icon: Truck, desc: "Configure carrier fees & delivery coverage" },
    { key: "operations_split_payment", label: "Split Payment", icon: Split, desc: "Enable split billing/payment options in POS Checkout" },
    { key: "operations_reports", label: "Reports", icon: BarChart3, desc: "Enable or disable all reports in the system" },
  ];

  const reportsFeatures = [
    { key: "reports_sales_summary", label: "Sales Summary", icon: BarChart3, desc: "Overview of total sales and performance" },
    { key: "reports_cash_close", label: "Cash Close (EOD)", icon: Banknote, desc: "End of day cash and shift reports" },
    { key: "reports_stock_drilldown", label: "Stock Drill-down", icon: Package, desc: "Detailed inventory levels by item" },
    { key: "reports_out_of_stock", label: "Out of Stock Items", icon: PackageX, desc: "Track depleted inventory" },
    { key: "reports_item_movement", label: "Item Movement", icon: ShoppingCart, desc: "Analyze product sales velocity" },
    { key: "reports_stock_audit", label: "Stock Audit", icon: ClipboardCheck, desc: "Audit logs for inventory changes" },
    { key: "reports_supplier_products", label: "Supplier Products", icon: Truck, desc: "Items supplied per vendor" },
    { key: "reports_category_sales", label: "Category Sales", icon: PieChart, desc: "Sales distribution by category" },
    { key: "reports_customer_insights", label: "Customer Insights", icon: Users, desc: "Analytics on customer purchasing behavior" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-3xl border border-brand-border bg-gradient-to-r from-white via-[#FFF7FB] to-[#FCEAF4] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#1F1720] tracking-tight">Feature Toggles</h1>
            <p className="text-sm text-[#6B5A64]">
              Enable or disable navigation menus and underlying system modules in real time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full bg-white/80 border-[#A7066A] text-[#A7066A] font-bold uppercase tracking-wider px-3 py-1">
              for dev admin only
            </Badge>
          </div>
        </div>
      </div>

      {/* Global Settings */}
      <Card className="border-brand-border shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b border-brand-border/60 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-bold text-[#1F1720]">Global System Settings</CardTitle>
          <CardDescription className="text-xs">Configure high-level system behaviors</CardDescription>
        </CardHeader>
        <CardContent className="p-6 divide-y divide-brand-border/40 space-y-4">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-[#1F1720]">Enabled StoreFront Website</CardTitle>
                <CardDescription className="text-xs">
                  When disabled, the public storefront is closed and users are redirected to a simplified email/password login.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={localToggles.storefront_website_enabled !== false}
              onCheckedChange={(checked) => handleToggleChange("storefront_website_enabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-pink-50 text-pink-700">
                <Box className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-[#1F1720]">Gift Boxes Available</CardTitle>
                <CardDescription className="text-xs">
                  Disable this to hide giftbox and box building options throughout the system.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={localToggles.giftboxes_available !== false}
              onCheckedChange={(checked) => handleToggleChange("giftboxes_available", checked)}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-brand-border/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-50 text-green-700">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-[#1F1720]">WhatsApp Enabled</CardTitle>
                <CardDescription className="text-xs">
                  Disable this to hide WhatsApp floating action buttons and slip upload integrations.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={localToggles.whatsapp_enabled !== false}
              onCheckedChange={(checked) => handleToggleChange("whatsapp_enabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-brand-border/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-[#1F1720]">System Currency</CardTitle>
                <CardDescription className="text-xs">
                  Set the dynamic base currency formatting across the entire application storefront, POS, and admin.
                </CardDescription>
              </div>
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-10 px-3 border border-brand-border rounded-xl bg-white text-[#1F1720] text-sm focus:outline-none focus:border-[#A7066A] shadow-sm font-semibold"
            >
              <option value="LKR">LKR (Rs.)</option>
              <option value="USD">USD ($)</option>
              <option value="OMR">OMR (Oman Rial)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Storefront Group */}
        <Card className="border-brand-border shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="border-b border-brand-border/60 bg-slate-50/50 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#FCEAF4] text-[#A7066A]">
                    <LayoutGrid className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-[#1F1720]">Storefront Section</CardTitle>
                    <CardDescription className="text-xs">Manage visibility of client-facing configs</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={!!localToggles.storefront_section}
                  onCheckedChange={(checked) => handleToggleChange("storefront_section", checked)}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {storefrontFeatures.map((feat) => {
                const Icon = feat.icon;
                const parentEnabled = !!localToggles.storefront_section;
                return (
                  <div
                    key={feat.key}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                      !parentEnabled
                        ? "bg-slate-50 opacity-40 border-slate-200"
                        : localToggles[feat.key] !== false
                        ? "bg-[#FFF7FB] border-[#FCEAF4]"
                        : "bg-white border-brand-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${localToggles[feat.key] !== false && parentEnabled ? "bg-[#FCEAF4] text-[#A7066A]" : "bg-slate-100 text-slate-500"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1F1720]">{feat.label}</p>
                        <p className="text-xs text-[#6B5A64]">{feat.desc}</p>
                      </div>
                    </div>
                    <Switch
                      disabled={!parentEnabled}
                      checked={parentEnabled && localToggles[feat.key] !== false}
                      onCheckedChange={(checked) => handleToggleChange(feat.key, checked)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </div>
        </Card>

        {/* Operations Group */}
        <Card className="border-brand-border shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="border-b border-brand-border/60 bg-slate-50/50 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-[#1F1720]">Operations Section</CardTitle>
                    <CardDescription className="text-xs">Manage inventory, shipping, and returns</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={!!localToggles.operations_section}
                  onCheckedChange={(checked) => handleToggleChange("operations_section", checked)}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {operationsFeatures.map((feat) => {
                const Icon = feat.icon;
                const parentEnabled = !!localToggles.operations_section;
                return (
                  <div
                    key={feat.key}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                      !parentEnabled
                        ? "bg-slate-50 opacity-40 border-slate-200"
                        : localToggles[feat.key] !== false
                        ? "bg-purple-50/30 border-purple-100"
                        : "bg-white border-brand-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${localToggles[feat.key] !== false && parentEnabled ? "bg-purple-50 text-purple-700" : "bg-slate-100 text-slate-500"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1F1720]">{feat.label}</p>
                        <p className="text-xs text-[#6B5A64]">{feat.desc}</p>
                      </div>
                    </div>
                    <Switch
                      disabled={!parentEnabled}
                      checked={parentEnabled && localToggles[feat.key] !== false}
                      onCheckedChange={(checked) => handleToggleChange(feat.key, checked)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </div>
        </Card>

        <Card className="rounded-3xl border-brand-border bg-white shadow-sm overflow-hidden lg:col-span-2">
          <div className="bg-gradient-to-br from-white to-blue-50/30 h-full">
            <CardHeader className="pb-4 border-b border-brand-border bg-white/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-[#1F1720]">Reports & Analytics</CardTitle>
                    <CardDescription className="text-xs">Manage individual reports access</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={!!localToggles.operations_reports}
                  onCheckedChange={(checked) => handleToggleChange("operations_reports", checked)}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportsFeatures.map((feat) => {
                  const Icon = feat.icon;
                  const parentEnabled = !!localToggles.operations_reports;
                  return (
                    <div
                      key={feat.key}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                        !parentEnabled
                          ? "bg-slate-50 opacity-40 border-slate-200"
                          : localToggles[feat.key] !== false
                          ? "bg-blue-50/30 border-blue-100"
                          : "bg-white border-brand-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${localToggles[feat.key] !== false && parentEnabled ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1F1720]">{feat.label}</p>
                          <p className="text-xs text-[#6B5A64]">{feat.desc}</p>
                        </div>
                      </div>
                      <Switch
                        disabled={!parentEnabled}
                        checked={parentEnabled && localToggles[feat.key] !== false}
                        onCheckedChange={(checked) => handleToggleChange(feat.key, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end items-center gap-3 pt-4 border-t border-brand-border">
        <Button
          variant="outline"
          onClick={handleReset}
          className="rounded-xl border-brand-border hover:bg-slate-100 hover:text-slate-900 font-semibold"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset Changes
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-xl bg-[#A7066A] hover:bg-[#8A0558] text-white font-semibold shadow-sm px-6"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving Toggles...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Toggles
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
