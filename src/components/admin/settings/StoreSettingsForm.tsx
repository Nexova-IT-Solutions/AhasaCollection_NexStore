"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, EyeOff, Package, FolderX } from "lucide-react";
import type { StoreConfig } from "@/types/settings";

interface StoreSettingsFormProps {
  config: StoreConfig;
}

export function StoreSettingsForm({ config }: StoreSettingsFormProps) {
  const { toast } = useToast();
  const [hideOutOfStock, setHideOutOfStock] = useState(
    config.hideOutOfStockProducts
  );
  const [hideEmptyCategories, setHideEmptyCategories] = useState(
    config.hideEmptyCategories
  );
  const [savingField, setSavingField] = useState<string | null>(null);

  const handleToggle = async (
    field: "hideOutOfStockProducts" | "hideEmptyCategories",
    checked: boolean
  ) => {
    const setter =
      field === "hideOutOfStockProducts"
        ? setHideOutOfStock
        : setHideEmptyCategories;
    const previousValue =
      field === "hideOutOfStockProducts" ? hideOutOfStock : hideEmptyCategories;

    setter(checked);
    setSavingField(field);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: checked }),
      });

      if (!res.ok) {
        throw new Error("Failed to update settings");
      }

      const messages: Record<string, { on: string; off: string }> = {
        hideOutOfStockProducts: {
          on: "Out-of-stock products will be hidden from the storefront.",
          off: "Out-of-stock products will now appear on the storefront.",
        },
        hideEmptyCategories: {
          on: "Empty categories will be hidden from the storefront.",
          off: "All categories will now appear on the storefront.",
        },
      };

      toast({
        title: "Settings updated",
        description: checked ? messages[field].on : messages[field].off,
      });
    } catch {
      // Revert on error
      setter(previousValue);
      toast({
        title: "Failed to update settings",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Inventory Visibility Card */}
      <Card className="border-brand-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-[#1F1720]">
            <EyeOff className="w-5 h-5 text-[#A7066A]" />
            Inventory Visibility
          </CardTitle>
          <p className="text-sm text-[#6B5A64]">
            Control how out-of-stock products and empty categories appear on your
            storefront.
          </p>
        </CardHeader>
        <CardContent className="space-y-0">
          {/* Hide Out-of-Stock Products */}
          <div className="flex items-center justify-between rounded-xl border border-brand-border bg-[#FAFAFA] p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#FCEAF4] rounded-lg mt-0.5">
                <Package className="w-4 h-4 text-[#A7066A]" />
              </div>
              <div>
                <Label
                  htmlFor="hide-oos-toggle"
                  className="text-sm font-semibold text-[#1F1720] cursor-pointer"
                >
                  Automatically hide out-of-stock items
                </Label>
                <p className="text-xs text-[#6B5A64] mt-1 max-w-md">
                  When enabled, products with stock ≤ 0 will not appear in
                  storefront listings. They remain accessible via direct link for
                  SEO purposes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              {savingField === "hideOutOfStockProducts" && (
                <RefreshCw className="w-4 h-4 text-[#A7066A] animate-spin" />
              )}
              <Switch
                id="hide-oos-toggle"
                checked={hideOutOfStock}
                onCheckedChange={(checked) =>
                  handleToggle("hideOutOfStockProducts", checked)
                }
                disabled={savingField !== null}
              />
            </div>
          </div>

          <Separator className="my-4" />

          {/* Hide Empty Categories */}
          <div className="flex items-center justify-between rounded-xl border border-brand-border bg-[#FAFAFA] p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#FCEAF4] rounded-lg mt-0.5">
                <FolderX className="w-4 h-4 text-[#A7066A]" />
              </div>
              <div>
                <Label
                  htmlFor="hide-empty-categories-toggle"
                  className="text-sm font-semibold text-[#1F1720] cursor-pointer"
                >
                  Hide empty categories
                </Label>
                <p className="text-xs text-[#6B5A64] mt-1 max-w-md">
                  When enabled, categories where all items are out of stock will
                  not appear in the storefront navigation or listings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              {savingField === "hideEmptyCategories" && (
                <RefreshCw className="w-4 h-4 text-[#A7066A] animate-spin" />
              )}
              <Switch
                id="hide-empty-categories-toggle"
                checked={hideEmptyCategories}
                onCheckedChange={(checked) =>
                  handleToggle("hideEmptyCategories", checked)
                }
                disabled={savingField !== null}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
