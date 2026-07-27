"use client";

import { useMemo, useState } from "react";
import { Search, ShoppingBag, WalletCards, Truck, PackageCheck, Star, RefreshCcw, Ticket, Gift } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { OrderHistoryCard, type OrderHistoryCardOrder } from "@/components/profile/orders/order-history-card";
import { OrderEmptyState } from "@/components/profile/orders/order-empty-state";
import { categorizeOrders, type CategorizedOrders, type OrderCategoryKey } from "@/lib/orders/categorize-orders";

import { DigitalAssetCard, type DigitalGiftCard } from "@/components/profile/orders/digital-asset-card";

declare module "@/components/profile/orders/order-history-card" {
  interface OrderHistoryCardOrder {
    purchasedGiftCards?: DigitalGiftCard[];
  }
}

type CustomerOrdersClientProps = {
  locale: string;
  orders: OrderHistoryCardOrder[];
  giftCards: DigitalGiftCard[];
};

type TabKey = "all" | OrderCategoryKey | "digital";

const tabConfig: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "toShip", label: "To Ship" },
  { key: "toReceive", label: "To Receive" },
  { key: "toReview", label: "To Review" },
  { key: "digital", label: "Digital Products" },
  { key: "returns", label: "Returns" },
];

export function CustomerOrdersClient({ locale, orders, giftCards }: CustomerOrdersClientProps) {
  const t = useTranslations("ProfileOrders");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const isDigitalOrder = (order: OrderHistoryCardOrder) => {
    if (!order.items || order.items.length === 0) return false;
    return order.items.every(item => 
      item.productId === "digital-gift-card" || 
      item.productId?.startsWith("giftcard-") ||
      item.productName.toLowerCase().includes("e-gift card") ||
      item.productName.toLowerCase().includes("gift voucher")
    );
  };

  const categorized = useMemo(() => {
    const cats = categorizeOrders(orders);
    
    // Explicitly filter out digital orders from physical fulfillment tabs
    const physicalTabs: Array<keyof CategorizedOrders<OrderHistoryCardOrder>> = ["toShip", "toReceive", "toReview", "returns"];
    physicalTabs.forEach(tab => {
      if (cats[tab]) {
        cats[tab] = cats[tab].filter(order => !isDigitalOrder(order));
      }
    });
    
    return cats;
  }, [orders]);

  const activeOrders = useMemo(() => {
    if (activeTab === "digital") return [];
    const source = activeTab === "all" ? categorized.all : (categorized[activeTab as OrderCategoryKey] || []);
    const query = searchTerm.trim().toLowerCase();

    if (!query) return source;

    return source.filter((order) => {
      const inOrderNumber = order.orderNumber.toLowerCase().includes(query);
      const inProducts = order.items.some((item) => item.productName.toLowerCase().includes(query));
      return inOrderNumber || inProducts;
    });
  }, [activeTab, categorized, searchTerm]);

  const activeGiftCards = useMemo(() => {
    if (activeTab !== "digital" && activeTab !== "all") return [];
    const query = searchTerm.trim().toLowerCase();
    if (!query) return giftCards;

    return giftCards.filter((gc) => {
      const inCode = gc.code.toLowerCase().includes(query);
      const inOrderNumber = gc.order?.orderNumber.toLowerCase().includes(query);
      return inCode || inOrderNumber;
    });
  }, [giftCards, searchTerm, activeTab]);

  const { myGiftCards, giftedCards } = useMemo(() => {
    const gifted = activeGiftCards.filter((gc) => !!gc.recipientEmail);
    const mine = activeGiftCards.filter((gc) => !gc.recipientEmail);
    return { myGiftCards: mine, giftedCards: gifted };
  }, [activeGiftCards]);

  const hasSearch = searchTerm.trim().length > 0;

  const getEmptyTitleKey = (key: TabKey) => key === "all" ? "defaultTitle" : `${key}Title`;
  const getEmptyDescKey = (key: TabKey) => key === "all" ? "defaultDesc" : `${key}Desc`;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">{t("myOrders")}</h1>
        <p className="text-sm text-gray-500">{t("ordersSubtitle")}</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-11 rounded-xl border-gray-200 bg-white pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="gap-4">
        <TabsList className="scrollbar-hide flex h-auto w-full snap-x snap-mandatory flex-nowrap items-center justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabConfig.map((tab) => {
            let count = 0;
            if (tab.key === "all") count = categorized.all.length + giftCards.length;
            else if (tab.key === "digital") count = giftCards.length;
            else count = (categorized[tab.key as OrderCategoryKey] || []).length;

            return (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="snap-start rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 data-[state=active]:border-[#A7066A] data-[state=active]:bg-[#FCEAF4] data-[state=active]:text-[#A7066A]"
              >
                <span>{t(`tabs.${tab.key}`)}</span>
                {count > 0 ? (
                  <Badge className="ml-1 rounded-full bg-[#A7066A] px-1.5 py-0 text-[10px] text-white hover:bg-[#A7066A]">
                    {count}
                  </Badge>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tabConfig.map((tab) => {
          if (tab.key === "digital") {
            return (
              <TabsContent key={tab.key} value={tab.key} className="space-y-8">
                {activeGiftCards.length > 0 ? (
                  <>
                    {myGiftCards.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                          <Ticket className="size-4 text-[#A7066A]" />
                          <h2 className="text-sm font-bold text-gray-900">{t("myGiftCards")}</h2>
                        </div>
                        <div className="space-y-4">
                          {myGiftCards.map((gc) => (
                            <DigitalAssetCard key={gc.id} giftCard={gc} />
                          ))}
                        </div>
                      </div>
                    )}

                    {giftedCards.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                          <Gift className="size-4 text-[#A7066A]" />
                          <h2 className="text-sm font-bold text-gray-900">{t("giftedToOthers")}</h2>
                        </div>
                        <div className="space-y-4">
                          {giftedCards.map((gc) => (
                            <DigitalAssetCard key={gc.id} giftCard={gc} isGiftedView={true} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <OrderEmptyState
                    icon={Ticket}
                    title={hasSearch ? t("emptyState.searchTitle", { tabName: t(`tabs.${tab.key}`) }) : t("emptyState.digitalTitle")}
                    description={
                      hasSearch
                        ? t("emptyState.searchDesc")
                        : t("emptyState.digitalDesc")
                    }
                  />
                )}
              </TabsContent>
            );
          }

          const tabOrders = tab.key === "all" ? categorized.all : (categorized[tab.key as OrderCategoryKey] || []);
          const visibleOrders = activeTab === tab.key ? activeOrders : tabOrders;

          return (
            <TabsContent key={tab.key} value={tab.key} className="space-y-6">
              {visibleOrders.length > 0 ? (
                visibleOrders.map((order) => {
                  const hasDigitalAssets = order.purchasedGiftCards && order.purchasedGiftCards.length > 0;
                  const isPurelyDigital = order.items && order.items.length > 0 && order.items.every((item) => 
                    item.product?.isEGiftCard === true || 
                    item.productId === "digital-gift-card" || 
                    item.productId?.startsWith("giftcard-")
                  );
                  const isGift = order.isGift || !!order.recipientEmail;

                  // SCENARIO 1: PURE DIGITAL ORDER
                  if (isPurelyDigital && hasDigitalAssets && tab.key === "all") {
                    return (
                      <div key={order.id} className="flex flex-col gap-4">
                        {order.purchasedGiftCards!.map((gc) => (
                          <DigitalAssetCard key={gc.id} giftCard={gc} isGiftedView={isGift} />
                        ))}
                      </div>
                    );
                  }

                  // Force 0 delivery fee for pure digital orders in other tabs (though they should be filtered out)
                  const displayTotal = isPurelyDigital ? (order.total - (order.deliveryFee || 0)) : order.total;
                  const displayOrder = isPurelyDigital ? { ...order, total: displayTotal } : order;

                  // SCENARIO 2: MIXED OR PURE PHYSICAL ORDER
                  return (
                    <div key={order.id} className="flex flex-col gap-4">
                      {/* Render Physical Card */}
                      <OrderHistoryCard
                        locale={locale}
                        order={displayOrder}
                        context={tab.key === "all" ? "all" : (tab.key as OrderCategoryKey)}
                      />
                      
                      {/* Render associated digital assets if it's a mixed order */}
                      {tab.key === "all" && !isPurelyDigital && hasDigitalAssets && (
                        <div className="pl-4 border-l-2 border-[#FCEAF4] space-y-4 ml-4">
                          <div className="flex items-center gap-2 px-2">
                            <Ticket className="size-3.5 text-[#A7066A]" />
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t("linkedDigitalAssets")}</h2>
                          </div>
                          {order.purchasedGiftCards!.map((gc) => (
                            <DigitalAssetCard key={gc.id} giftCard={gc} isGiftedView={isGift} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <OrderEmptyState
                  icon={getEmptyIcon(tab.key)}
                  title={hasSearch ? t("emptyState.searchTitle", { tabName: t(`tabs.${tab.key}`) }) : t(`emptyState.${getEmptyTitleKey(tab.key)}` as any)}
                  description={
                    hasSearch
                      ? t("emptyState.searchDesc")
                      : t(`emptyState.${getEmptyDescKey(tab.key)}` as any)
                  }
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function getEmptyIcon(tab: TabKey) {
  if (tab === "toShip") return Truck;
  if (tab === "toReceive") return PackageCheck;
  if (tab === "toReview") return Star;
  if (tab === "returns") return RefreshCcw;
  return ShoppingBag;
}
