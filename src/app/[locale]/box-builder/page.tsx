"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Header, Footer, CartDrawer } from "@/components/giftbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useBoxBuilderStore, useCartStore } from "@/store";
import { BoxBuilderItem } from "@/types";
import { toast } from "sonner";
import { ProductVariationDialog } from "@/components/byob/ProductVariationDialog";
import {
  ChevronRight,
  Plus,
  Minus,
  Check,
  Search,
  ShoppingBag,
  Gift,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  Package,
  Info,
  Trash2,
  ChevronDown,
  Truck,
  Heart,
  CreditCard,
  LayoutGrid,
  List,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const normalizeToArray = (field: any): any[] => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    const trimmed = field.trim();
    if (trimmed === '' || trimmed === '[]' || trimmed === 'null') return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      // Fallback for strings like "Red|Blue" or "Red,Blue"
      return trimmed.split(/[,|]/).filter(Boolean);
    }
  }
  // If it's a standalone object, wrap it in an array
  if (typeof field === 'object') return [field];
  return [];
};

const steps = [
  { id: 1, name: "Wrapping", icon: Sparkles },
  { id: 2, name: "Add Items", icon: Gift },
  { id: 3, name: "Message", icon: MessageSquare },
  { id: 4, name: "Review", icon: ShoppingBag },
];

interface FilterOptions {
  categories: {
    id: string;
    name: string;
    subCategories?: { id: string; name: string }[];
  }[];
  occasions: { id: string, name: string }[];
  recipients: { id: string, name: string }[];
  priceRange: { min: number, max: number };
}

interface InTheBoxProps {
  addedItems: Array<{
    productId: string;
    name: string;
    quantity: number;
    image: string;
    price: number;
    selectedSize?: string;
    selectedColor?: string;
  }>;
  removeItem: (id: string, selectedSize?: string, selectedColor?: string) => void;
  showTitle?: boolean;
}

const InTheBox: React.FC<InTheBoxProps> = ({ addedItems, removeItem, showTitle = true }) => {
  const t = useTranslations("BoxBuilder");
  return (
    <div className="space-y-6">
      {showTitle && (
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 tracking-tighter uppercase">
          <span className="w-1.5 h-6 bg-[#A7066A] rounded-full" /> {t("inTheBox")}
        </h3>
      )}
      <div className="space-y-4">
        {addedItems.map(item => (
          <div key={`${item.productId}-${item.selectedSize || ""}-${item.selectedColor || ""}`} className="flex items-center gap-6 group p-4 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 relative overflow-hidden border border-slate-50 shrink-0 transform group-hover:scale-105 transition-transform">
              <Image src={item.image} alt={item.name} fill className="object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-slate-800">{item.name}</p>
              {(item.selectedSize || item.selectedColor) && (
                <p className="text-[11px] text-slate-400 font-bold mb-1">
                  {item.selectedSize && `Size: ${item.selectedSize}`}
                  {item.selectedSize && item.selectedColor && " | "}
                  {item.selectedColor && `Color: ${item.selectedColor}`}
                </p>
              )}
              <p className="text-[10px] font-black text-[#A7066A]/60 uppercase">{t("quantity")} {item.quantity}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-sm font-black text-slate-800">LKR {(item.price * item.quantity).toLocaleString()}</span>
              <button
                onClick={() => removeItem(item.productId, item.selectedSize, item.selectedColor)}
                className="p-2 rounded-xl hover:bg-red-50 text-slate-200 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface TailoringProps {
  selectedWrapping: { name: string; price: number; image?: string; imageUrl?: string } | null;
}

const Tailoring: React.FC<TailoringProps> = ({ selectedWrapping }) => {
  const t = useTranslations("BoxBuilder");
  const imageUrl = selectedWrapping?.imageUrl || selectedWrapping?.image || "";
  const formatPrice = (price: number) => `LKR ${price.toLocaleString()}`;
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 tracking-tighter uppercase">
        <span className="w-1.5 h-6 bg-slate-800 rounded-full" /> {t("tailoring")}
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-6 group p-4 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            {imageUrl ? (
              <div className="w-16 h-16 rounded-2xl bg-slate-50 relative overflow-hidden border border-slate-50 shrink-0 transform group-hover:scale-105 transition-transform">
                <Image src={imageUrl} alt={selectedWrapping?.name || "Wrap"} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#FCEAF4] text-[#A7066A] flex items-center justify-center font-black italic shadow-inner shrink-0 transform group-hover:scale-105 transition-transform">W</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Gift Wrapping</p>
              <p className="text-sm font-black text-slate-800 truncate">{selectedWrapping?.name || t("signatureStandard")}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-sm font-black text-slate-800">
              {selectedWrapping ? (selectedWrapping.price === 0 ? t("free") : formatPrice(selectedWrapping.price)) : t("free")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Commitment: React.FC = () => {
  const t = useTranslations("BoxBuilder");
  return (
    <Card className="rounded-[3rem] border-[#FCEAF4] bg-white p-10 space-y-6 shadow-2xl shadow-[#A7066A]/5 ring-4 ring-[#FCEAF4]/50">
      <div className="space-y-2">
        <p className="text-center text-[10px] font-black text-[#A7066A]/60 uppercase tracking-[0.5em]">{t("ourPromise")}</p>
        <h4 className="text-lg font-black text-slate-800 text-center tracking-tight">{t("handcraftedCare")}</h4>
      </div>
      <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#FCEAF4] text-[#A7066A] flex items-center justify-center shadow-inner">
            <Truck className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">{t("express")}</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#FCEAF4] text-[#A7066A] flex items-center justify-center shadow-inner">
            <Heart className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">{t("curated")}</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#FCEAF4] text-[#A7066A] flex items-center justify-center shadow-inner">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">{t("secure")}</span>
        </div>
      </div>
    </Card>
  );
};

export default function BoxBuilderPage() {
  const t = useTranslations("BoxBuilder");
  const {
    currentStep,
    selectedBox,
    addedItems,
    message,
    selectedWrapping,
    setStep,
    nextStep,
    prevStep,
    addItem,
    removeItem,
    incrementItem,
    decrementItem,
    updateItemQuantity,
    setMessage,
    selectWrapping,
    reset,
    getTotal
  } = useBoxBuilderStore();

  const { data: toggles } = useSWR<Record<string, boolean>>("/api/admin/feature-toggles", fetcher);

  const { addCustomBoxToCart, openCart } = useCartStore();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    if (toggles && toggles.giftboxes_available === false) {
      router.push("/");
    }
  }, [toggles, router]);

  // Variation Dialog States
  const [variationDialogOpen, setVariationDialogOpen] = useState(false);
  const [activeVariationProduct, setActiveVariationProduct] = useState<any | null>(null);

  const handleAddChoice = (item: any) => {
    const v = normalizeToArray(item.productVariants);
    const c = normalizeToArray(item.colors);
    const s = normalizeToArray(item.sizes);
    const hasVariants = v.length > 0 || c.length > 0 || s.length > 0;
    if (hasVariants) {
      setActiveVariationProduct(item);
      setVariationDialogOpen(true);
    } else {
      addItem(item);
    }
  };

  // Data States
  const [dbItems, setDbItems] = useState<BoxBuilderItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [priceRangeInitialized, setPriceRangeInitialized] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "price-asc" | "price-desc">("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);

  // useSWR for Wrappings
  const { data: wrappings, error: wrappingsError, isLoading: isWrappingsLoading } = useSWR(
    currentStep === 1 ? "/api/v1/box-builder/wrappings" : null,
    fetcher
  );

  // Initial Fetch & Page Updates (Server-Side Filtering Enabled)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          search: searchQuery,
          minPrice: priceRange[0].toString(),
          maxPrice: priceRange[1].toString(),
          inStock: inStockOnly.toString(),
        });
        if (selectedCategories.length > 0) queryParams.set("categories", selectedCategories.join(","));
        if (selectedOccasions.length > 0) queryParams.set("occasions", selectedOccasions.join(","));
        if (selectedRecipients.length > 0) queryParams.set("recipients", selectedRecipients.join(","));

        const [itemsRes, filtersRes] = await Promise.all([
          fetch(`/api/box-builder/items?${queryParams.toString()}`),
          fetch("/api/box-builder/filters")
        ]);

        if (itemsRes.ok && filtersRes.ok) {
          const itemsData = await itemsRes.json();
          const filtersData = await filtersRes.json();
          if (Array.isArray(itemsData)) {
            setDbItems(itemsData);
            setTotalPages(1);
            setTotalItems(itemsData.length);
          } else {
            setDbItems(itemsData?.items || []);
            setTotalPages(itemsData?.pagination?.totalPages || 1);
            setTotalItems(itemsData?.pagination?.totalItems || 0);
          }
          setFilterOptions(filtersData);
          if (!priceRangeInitialized && filtersData?.priceRange) {
            setPriceRange([filtersData.priceRange.min, filtersData.priceRange.max]);
            setPriceRangeInitialized(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch builder data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [
    currentPage,
    itemsPerPage,
    selectedCategories,
    selectedOccasions,
    selectedRecipients,
    searchQuery,
    priceRange,
    inStockOnly
  ]);

  // Sync page size dynamically with layout columns to prevent uneven structural rows
  useEffect(() => {
    const optimalLimit = gridCols * 4; // 2 cols -> 8, 3 cols -> 12, 4 cols -> 16
    setItemsPerPage(optimalLimit);
    setCurrentPage(1);
  }, [gridCols]);

  // Reset page when filters or limits change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, selectedOccasions, selectedRecipients, priceRange, inStockOnly, itemsPerPage]);



  const formatPrice = (price: number) => `LKR ${price.toLocaleString()}`;

  // Derived Order Values
  const itemsSubtotal = addedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = addedItems.reduce((s, i) => s + i.quantity, 0);

  const total = getTotal();

  const toggleSelection = (id: string, current: string[], setter: (val: string[]) => void) => {
    if (current.includes(id)) {
      setter(current.filter(i => i !== id));
    } else {
      setter([...current, id]);
    }
  };

  // Simplified useMemo - delegating filters to database and performing client-side sorting only
  const filteredItems = useMemo(() => {
    if (!Array.isArray(dbItems)) return [];
    return [...dbItems].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return 0;
    });
  }, [dbItems, sortBy]);

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedOccasions([]);
    setSelectedRecipients([]);
    setSearchQuery("");
    setInStockOnly(false);
    if (filterOptions) setPriceRange([filterOptions.priceRange.min, filterOptions.priceRange.max]);
  };

  const handleAddToCart = () => {
    if (addedItems.length === 0) return;
    // Navigate directly to checkout with BYOB mode — store data lives in Zustand
    router.push(`/${locale}/checkout?byob=1`);
  };

  const handleAddToBag = async () => {
    if (addedItems.length === 0) return;
    setIsAddingToCart(true);
    try {
      await addCustomBoxToCart({
        wrapId: selectedWrapping?.id || "",
        giftMessage: message || "",
        noteStyle: "note-standard", // default card style
        items: addedItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          variantName: item.variantName,
        })),
        boxType: selectedBox,
      });
      toast.success(t("addedToCart") || "Successfully added to cart!");
      openCart();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const renderFilters = (isMobile = false) => {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Label className="text-slate-800 font-black text-[11px] uppercase tracking-widest pl-1">{t("searchProducts")}</Label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-2xl border-slate-200 bg-slate-50/30 focus:bg-white transition-all ring-fuchsia-600/20"
            />
          </div>
        </div>

        <Separator className="bg-slate-100" />

        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <Label className="text-slate-800 font-black text-[11px] uppercase tracking-widest">{t("priceLimit")}</Label>
            <Badge variant="outline" className="text-[10px] font-bold border-[#FCEAF4] text-[#A7066A] bg-[#FCEAF4]">{formatPrice(priceRange[1])}</Badge>
          </div>
          <Slider
            value={[priceRange[1]]}
            max={filterOptions?.priceRange.max || 10000}
            step={100}
            onValueChange={(val) => setPriceRange([priceRange[0], val[0]])}
            className="py-2 [&>span:first-child]:bg-[#FCEAF4] [&>span:last-child]:bg-[#A7066A]"
          />
        </div>

        <Separator className="bg-slate-100" />

        <ScrollArea className={isMobile ? "h-[calc(100vh-280px)] pr-4 -mr-4" : "h-[450px] pr-4 -mr-4"}>
          <div className="space-y-8">
            {/* Categories */}
            <div className="space-y-4">
              <Label className="text-slate-800 font-black text-[11px] uppercase tracking-widest">{t("categories")}</Label>
              <div className="space-y-3">
                {filterOptions?.categories.map((cat) => {
                  const isExpanded = expandedCategories.includes(cat.id);
                  const hasSub = cat.subCategories && cat.subCategories.length > 0;
                  return (
                    <div key={cat.id} className="space-y-2">
                      {/* Parent Category Row */}
                      <div className="flex items-center justify-between group cursor-pointer">
                        <div
                          className="flex items-center gap-3 flex-1"
                          onClick={() => toggleSelection(cat.id, selectedCategories, setSelectedCategories)}
                        >
                          <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${selectedCategories.includes(cat.id) ? "bg-[#A7066A] border-[#A7066A]" : "border-slate-200 group-hover:border-[#A7066A]/30"
                            }`}>
                            <Check className={`w-3 h-3 text-white ${selectedCategories.includes(cat.id) ? "opacity-100" : "opacity-0"}`} />
                          </div>
                          <span className={`text-xs font-bold transition-colors ${selectedCategories.includes(cat.id) ? "text-slate-800" : "text-slate-400"}`}>
                            {cat.name}
                          </span>
                        </div>

                        {hasSub && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isExpanded) {
                                setExpandedCategories(expandedCategories.filter(id => id !== cat.id));
                              } else {
                                setExpandedCategories([...expandedCategories, cat.id]);
                              }
                            }}
                            className="p-1 hover:bg-[#FCEAF4] rounded transition-colors text-slate-400 hover:text-[#A7066A]"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        )}
                      </div>

                      {/* Child Categories (Visible under Parent Category when expanded) */}
                      {hasSub && isExpanded && (
                        <div className="pl-6 space-y-2 border-l border-slate-100 ml-2.5 animate-slide-down">
                          {cat.subCategories?.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center gap-3 group cursor-pointer"
                              onClick={() => toggleSelection(sub.id, selectedCategories, setSelectedCategories)}
                            >
                              <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${selectedCategories.includes(sub.id) ? "bg-[#A7066A] border-[#A7066A]" : "border-slate-200 group-hover:border-[#A7066A]/30"
                                }`}>
                                <Check className={`w-2.5 h-2.5 text-white ${selectedCategories.includes(sub.id) ? "opacity-100" : "opacity-0"}`} />
                              </div>
                              <span className={`text-xs transition-colors ${selectedCategories.includes(sub.id) ? "text-slate-700 font-bold" : "text-slate-400 font-medium"}`}>
                                {sub.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Occasions */}
            <div className="space-y-4">
              <Label className="text-slate-800 font-black text-[11px] uppercase tracking-widest">{t("occasions")}</Label>
              <div className="space-y-2.5">
                {filterOptions?.occasions.map((occ) => (
                  <div key={occ.id} className="flex items-center gap-3 group cursor-pointer" onClick={() => toggleSelection(occ.id, selectedOccasions, setSelectedOccasions)}>
                    <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${selectedOccasions.includes(occ.id) ? "bg-[#A7066A] border-[#A7066A]" : "border-slate-200 group-hover:border-[#A7066A]/30"
                      }`}>
                      <Check className={`w-3 h-3 text-white ${selectedOccasions.includes(occ.id) ? "opacity-100" : "opacity-0"}`} />
                    </div>
                    <span className={`text-xs font-bold transition-colors ${selectedOccasions.includes(occ.id) ? "text-slate-800" : "text-slate-400"}`}>{occ.name}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Recipients */}
            <div className="space-y-4">
              <Label className="text-slate-800 font-black text-[11px] uppercase tracking-widest">{t("forWhom")}</Label>
              <div className="space-y-2.5">
                {filterOptions?.recipients.map((rec) => (
                  <div key={rec.id} className="flex items-center gap-3 group cursor-pointer" onClick={() => toggleSelection(rec.id, selectedRecipients, setSelectedRecipients)}>
                    <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center mr-0.5 ${selectedRecipients.includes(rec.id) ? "bg-[#A7066A] border-[#A7066A]" : "border-slate-200 group-hover:border-[#A7066A]/30"
                      }`}>
                      <Check className={`w-3 h-3 text-white ${selectedRecipients.includes(rec.id) ? "opacity-100" : "opacity-0"}`} />
                    </div>
                    <span className={`text-xs font-bold transition-colors ${selectedRecipients.includes(rec.id) ? "text-slate-800" : "text-slate-400"}`}>{rec.name}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </ScrollArea>

        <Button
          variant="ghost"
          className="w-full text-slate-400 hover:text-[#A7066A] hover:bg-[#FCEAF4] h-12 rounded-2xl text-[10px] uppercase font-black tracking-widest border border-dashed border-slate-200"
          onClick={clearFilters}
        >
          <Trash2 className="w-3.5 h-3.5 mr-2" /> {t("resetFilters")}
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9FB] overflow-x-hidden">
      <Header />
      <CartDrawer />
      <ProductVariationDialog
        isOpen={variationDialogOpen}
        onClose={() => {
          setVariationDialogOpen(false);
          setActiveVariationProduct(null);
        }}
        product={activeVariationProduct}
        onConfirm={(size, color) => {
          if (activeVariationProduct) {
            addItem(activeVariationProduct, size, color);
            setVariationDialogOpen(false);
            setActiveVariationProduct(null);
            toast.success(`Added ${activeVariationProduct.name} to box!`);
          }
        }}
      />

      <main className="flex-1 pb-36 lg:pb-24">
        {/* Step Stepper Navigation */}
        <div className="bg-white border-b border-slate-200 sticky top-[80px] z-30">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-3">
            <div className="flex items-center justify-center gap-2 sm:gap-10">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer ${step.id === currentStep ? "bg-[#FCEAF4] text-[#A7066A]" : "text-slate-400 group hover:text-slate-600"
                      }`}
                    onClick={() => step.id < currentStep && setStep(step.id)}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${step.id === currentStep ? "bg-[#A7066A] border-[#A7066A] text-white" :
                      step.id < currentStep ? "bg-white border-[#A7066A]/30 text-[#A7066A]" : "bg-white border-slate-200"
                      }`}>
                      {step.id < currentStep ? <Check className="w-3.5 h-3.5" /> : step.id}
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest hidden sm:block">{t(`steps.${step.id}`)}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-4 h-px bg-slate-200 mx-1 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">

          {currentStep === 2 ? (
            <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-10 items-start">

              {/* LEFT COLUMN: Clean Filter Sidebar (col-span-2) */}
              <aside className="hidden lg:block lg:col-span-2 space-y-8 sticky top-[150px]">
                <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                  {renderFilters(false)}
                </div>
              </aside>

              {/* MIDDLE COLUMN: Product Grid (col-span-12 -> 7) */}
              <div className="col-span-12 lg:col-span-7 space-y-8 w-full max-w-full min-w-0 px-4 md:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2 w-full max-w-full min-w-0">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t("luxuryAddOns")}</h2>
                    <p className="text-xs font-bold text-slate-400">{t("itemsFound", { count: filteredItems.length })}</p>
                  </div>

                  <div className="flex flex-col gap-3 w-full md:flex-row md:items-center md:justify-between max-w-full min-w-0">
                    {/* Left Actions: Filter Trigger & View Mode */}
                    <div className="flex items-center gap-3 w-full md:w-auto flex-wrap min-w-0">
                      {/* Mobile Filters Sheet Trigger */}
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant="outline"
                            className="lg:hidden flex items-center justify-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-2.5 sm:px-4 rounded-xl border-slate-200 bg-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-700 shadow-sm active:scale-95 transition-all flex-1 min-w-0 md:flex-none md:w-auto"
                          >
                            <Search className="w-3.5 h-3.5 text-[#A7066A]" /> {t("filterProducts")}
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[85vw] sm:max-w-md p-0 flex flex-col h-full bg-white border-l border-slate-100 animate-in slide-in-from-right duration-300">
                          <SheetHeader className="p-6 border-b border-slate-100">
                            <SheetTitle className="text-sm font-black text-slate-800 tracking-widest uppercase">{t("filterProducts")}</SheetTitle>
                          </SheetHeader>
                          <SheetBody className="flex-1 overflow-y-auto p-6 bg-[#FCF9FB]">
                            {renderFilters(true)}
                          </SheetBody>
                        </SheetContent>
                      </Sheet>

                      {/* View Mode Toggles */}
                      <div className="flex bg-white rounded-xl border border-slate-200 p-0.5 sm:p-1 shadow-sm shrink-0">
                        <button
                          onClick={() => setViewMode("grid")}
                          className={cn("p-1 sm:p-1.5 rounded-lg transition-all", viewMode === "grid" ? "bg-[#FCEAF4] text-[#A7066A] shadow-sm" : "text-slate-400 hover:text-slate-600")}
                        >
                          <LayoutGrid size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                        <button
                          onClick={() => setViewMode("list")}
                          className={cn("p-1 sm:p-1.5 rounded-lg transition-all", viewMode === "list" ? "bg-[#FCEAF4] text-[#A7066A] shadow-sm" : "text-slate-400 hover:text-slate-600")}
                        >
                          <List size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                      </div>

                      {/* Grid Cols Selector (Only Grid Mode) */}
                      {viewMode === "grid" && (
                        <div className="hidden md:flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                          {[2, 3, 4].map((num) => (
                            <button
                              key={num}
                              onClick={() => setGridCols(num as any)}
                              className={cn(
                                "px-3 py-1 text-[10px] font-black rounded-lg transition-all",
                                gridCols === num ? "bg-[#A7066A] text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                              )}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Actions: Pagination & Sorting */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-wrap min-w-0">
                      {/* Items Per Page Selector */}
                      <div className="flex items-center bg-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto justify-between md:justify-start min-w-0">
                        <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 sm:mr-3">{t("show")}</span>
                        <div className="flex-1 md:flex-none flex items-center justify-end md:justify-start">
                          <select
                            className="appearance-none text-[10px] sm:text-[11px] font-black bg-transparent border-none p-0 pr-4 focus:ring-0 text-slate-700 cursor-pointer w-full md:w-auto text-right md:text-left"
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(parseInt(e.target.value, 10)); setCurrentPage(1); }}
                          >
                            <option value={4}>4 items</option>
                            <option value={8}>8 items</option>
                            <option value={12}>12 items</option>
                            <option value={16}>16 items</option>
                            <option value={24}>24 items</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-400 -ml-2 pointer-events-none" />
                        </div>
                      </div>

                      <div className="flex items-center bg-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-slate-200 shadow-sm ring-[#FCEAF4] w-full md:w-auto justify-between md:justify-start min-w-0">
                        <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 sm:mr-3">{t("sort")}</span>
                        <div className="flex-1 md:flex-none flex items-center justify-end md:justify-start">
                          <select
                            className="appearance-none text-[10px] sm:text-[11px] font-black bg-transparent border-none p-0 pr-4 focus:ring-0 text-slate-700 cursor-pointer w-full md:w-auto text-right md:text-left"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                          >
                            <option value="name">{t("alphabetical")}</option>
                            <option value="price-asc">{t("lowestPriceFirst")}</option>
                            <option value="price-desc">{t("highestPriceFirst")}</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-400 -ml-2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className={cn(
                    "grid grid-cols-2 gap-2 sm:gap-4 p-2 sm:p-4",
                    gridCols === 2 ? "sm:grid-cols-2" :
                      gridCols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" :
                        "sm:grid-cols-2 lg:grid-cols-4"
                  )}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="bg-white rounded-[2rem] border border-slate-100 h-[280px] sm:h-[380px] animate-pulse" />
                    ))}
                  </div>
                ) : filteredItems.length > 0 ? (
                  <>
                    <div className={cn(
                      viewMode === "grid" ? cn(
                        "grid grid-cols-2 gap-2 sm:gap-4 p-2 sm:p-4",
                        gridCols === 2 ? "sm:grid-cols-2" :
                          gridCols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" :
                            "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                      ) : "flex flex-col gap-6 p-1",
                      "w-full max-w-full"
                    )}>
                      {filteredItems.map((item) => {
                        const productAddedItems = addedItems.filter(i => i.productId === item.id);
                        const totalQtyInBox = productAddedItems.reduce((sum, i) => sum + i.quantity, 0);
                        const hasVariants = (() => {
                          const v = normalizeToArray((item as any).productVariants);
                          const c = normalizeToArray(item.colors);
                          const s = normalizeToArray(item.sizes);
                          return v.length > 0 || c.length > 0 || s.length > 0;
                        })();
                        const normalInBoxItem = !hasVariants ? productAddedItems[0] : null;

                        return (
                          <Card
                            key={item.id}
                            className={cn(
                              "group relative w-full min-w-0 rounded-[1.5rem] sm:rounded-[2.5rem] border-slate-200 bg-white shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1 overflow-hidden p-0 gap-0 box-border",
                              !item.inStock && "opacity-60 grayscale-[0.8]",
                              viewMode === "list" && "flex flex-row p-4 gap-6 items-center"
                            )}
                          >
                            <div className={cn(
                              "relative overflow-hidden bg-slate-50",
                              viewMode === "grid" ? "aspect-[4/5] sm:aspect-square" : "w-32 h-32 sm:w-48 sm:h-48 rounded-[2rem] shrink-0"
                            )}>
                              <Image
                                src={item.images[0] || ""}
                                alt={item.name}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                              {!item.inStock && (
                                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] flex items-center justify-center">
                                  <Badge className="bg-slate-800 text-white font-black text-[10px] uppercase px-4 py-1.5 rounded-full shadow-lg">{t("soldOut")}</Badge>
                                </div>
                              )}
                              {hasVariants && (
                                <div className="absolute top-3 right-3 z-10">
                                  <Badge className="bg-[#A7066A] text-white hover:bg-[#A7066A] font-black text-[9px] uppercase px-2.5 py-1 rounded-lg shadow-md tracking-wider flex items-center gap-1 border-0">
                                    <Sparkles className="w-2.5 h-2.5 animate-pulse" /> Multiple Options Available
                                  </Badge>
                                </div>
                              )}

                            </div>

                            <CardContent className={cn(
                              "flex-1 flex flex-col justify-between min-w-0",
                              viewMode === "grid" ? "p-2 sm:p-5 pt-2 sm:pt-4 pb-2 sm:pb-5" : "p-0 justify-center"
                            )}>
                              <div className="space-y-1">
                                <div className="space-y-1">
                                  <h3 className={cn(
                                    "font-black text-slate-800 leading-tight group-hover:text-[#A7066A] transition-colors",
                                    viewMode === "grid" ? "text-xs sm:text-base line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]" : "text-lg sm:text-xl"
                                  )}>{item.name}</h3>

                                  {/* Review Summary */}
                                  {item.reviewCount !== undefined && item.reviewCount > 0 && (
                                    <div className="flex items-center gap-1 py-0.5">
                                      <div className="flex items-center">
                                        {Array.from({ length: 5 }).map((_, index) => {
                                          const isFilled = index < Math.round(item.averageRating || 0);
                                          return (
                                            <Star
                                              key={index}
                                              className={cn(
                                                "w-3 h-3",
                                                isFilled ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-transparent"
                                              )}
                                            />
                                          );
                                        })}
                                      </div>
                                      <span className="text-[11px] font-bold text-slate-500 ml-1">
                                        ({item.reviewCount})
                                      </span>
                                    </div>
                                  )}

                                  <p className={cn(
                                    "font-black text-[#A7066A] whitespace-nowrap pt-0.5",
                                    viewMode === "grid" ? "text-[11px] sm:text-sm" : "text-base sm:text-lg"
                                  )}>{formatPrice(item.price)}</p>
                                </div>
                                <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.category}</p>
                              </div>

                              {/* Selected Variations list for custom items */}
                              {hasVariants && productAddedItems.length > 0 && (
                                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Added Options:</p>
                                  {productAddedItems.map((variantItem, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-[#FCEAF4]/20 rounded-xl text-[11px] border border-[#FCEAF4]/35 animate-in fade-in slide-in-from-top-1 duration-150">
                                      <span className="font-bold text-slate-600 truncate max-w-[150px]">
                                        {variantItem.selectedSize && `Size: ${variantItem.selectedSize}`}
                                        {variantItem.selectedSize && variantItem.selectedColor && " | "}
                                        {variantItem.selectedColor && `Color: ${variantItem.selectedColor}`}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => decrementItem(item.id, variantItem.selectedSize, variantItem.selectedColor)}
                                          className="w-5 h-5 flex items-center justify-center bg-white hover:bg-[#FCEAF4] text-[#A7066A] rounded-md transition-all active:scale-90 shadow-xs border border-[#FCEAF4]/50"
                                        >
                                          <Minus className="w-2.5 h-2.5" />
                                        </button>
                                        <span className="font-black text-slate-800 px-0.5">{variantItem.quantity}</span>
                                        <button
                                          onClick={() => incrementItem(item.id, variantItem.selectedSize, variantItem.selectedColor)}
                                          className="w-5 h-5 flex items-center justify-center bg-[#A7066A] text-white hover:bg-[#8B0557] rounded-md transition-all active:scale-90 shadow-xs"
                                        >
                                          <Plus className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className={cn(
                                "pt-3 sm:pt-4",
                                viewMode === "list" && "max-w-[200px]"
                              )}>
                                {hasVariants ? (
                                  <Button
                                    variant="outline"
                                    className="w-full h-8 sm:h-12 rounded-xl sm:rounded-2xl border-2 border-[#A7066A] text-[#A7066A] hover:bg-[#A7066A] hover:text-white font-black text-[9px] sm:text-xs uppercase tracking-wider sm:tracking-widest transition-all shadow-[#A7066A]/5"
                                    disabled={!item.inStock}
                                    onClick={() => handleAddChoice(item)}
                                  >
                                    {totalQtyInBox > 0 ? "Add Another Option" : (viewMode === "grid" ? t("addChoice") : t("addToYourCuration"))}
                                  </Button>
                                ) : normalInBoxItem ? (
                                  <div className="flex items-center justify-between bg-[#FCEAF4]/50 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 border border-[#FCEAF4] shadow-inner">
                                    <button
                                      className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-white text-[#A7066A] hover:bg-[#A7066A] hover:text-white transition-all shadow-sm active:scale-90"
                                      onClick={() => updateItemQuantity(item.id, normalInBoxItem.quantity - 1)}
                                    >
                                      <Minus className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
                                    </button>
                                    <div className="flex flex-col items-center">
                                      <span className="text-[10px] sm:text-xs font-black text-[#A7066A]">{normalInBoxItem.quantity}</span>
                                      <span className="text-[8px] font-bold text-[#A7066A]/60 uppercase leading-none">{t("inBoxLabel")}</span>
                                    </div>
                                    <button
                                      className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-[#A7066A] text-white shadow-md hover:bg-[#8B0557] transition-all active:scale-90"
                                      onClick={() => addItem(item)}
                                    >
                                      <Plus className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    className="w-full h-8 sm:h-12 rounded-xl sm:rounded-2xl border-2 border-[#A7066A] text-[#A7066A] hover:bg-[#A7066A] hover:text-white font-black text-[9px] sm:text-xs uppercase tracking-wider sm:tracking-widest transition-all shadow-[#A7066A]/5"
                                    disabled={!item.inStock}
                                    onClick={() => handleAddChoice(item)}
                                  >
                                    {viewMode === "grid" ? t("addChoice") : t("addToYourCuration")}
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-12 bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-9 h-9 rounded-xl hover:bg-[#FCEAF4] text-[#A7066A] disabled:opacity-40 disabled:hover:bg-transparent"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1 || isLoading}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <div className="flex items-center gap-1.5 px-2">
                          {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={cn(
                                  "w-9 h-9 text-xs font-black rounded-xl transition-all",
                                  currentPage === pageNum
                                    ? "bg-[#A7066A] text-white shadow-md shadow-[#A7066A]/20"
                                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                                )}
                                disabled={isLoading}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-9 h-9 rounded-xl hover:bg-[#FCEAF4] text-[#A7066A] disabled:opacity-40 disabled:hover:bg-transparent"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages || isLoading}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-24 text-center space-y-6 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                      <Search className="w-8 h-8 text-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-800">{t("noItemsMatch")}</h3>
                      <p className="text-sm text-slate-400 font-medium">{t("tryResetting")}</p>
                    </div>
                    <div className="pt-2">
                      <Button
                        variant="ghost"
                        className="w-full text-slate-400 hover:text-[#A7066A] hover:bg-[#FCEAF4] h-12 rounded-2xl text-[10px] uppercase font-black tracking-widest border border-dashed border-slate-200"
                        onClick={clearFilters}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> {t("resetGalleryFilters")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Premium Summary (col-span-12 -> 3) */}
              <aside className="hidden lg:block lg:col-span-3 sticky top-[150px]">
                <Card className="rounded-[3.5rem] border-slate-200 bg-white shadow-2xl shadow-[#A7066A]/5 transition-all hover:shadow-[0_20px_50px_rgba(167,6,106,0.12)] h-[calc(100vh-180px)] max-h-[850px] flex flex-col overflow-hidden">
                  <div className="p-8 pb-4 border-b border-slate-100 space-y-4 shrink-0">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">{t("yourSelection")}</h3>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t("estimatedTotal")}</span>
                        <span className="text-4xl font-black text-slate-900 tracking-tighter italic">{formatPrice(total)}</span>
                      </div>
                      <Badge className="bg-green-100 text-green-700 border-0 font-black text-[9px] px-3 py-1.5 rounded-lg">SECURE</Badge>
                    </div>
                  </div>

                  <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
                    <div className="flex-1 overflow-y-auto px-8 space-y-6 pt-6 pb-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#A7066A]/20">
                      <div className="space-y-6">
                        {/* Section A: Items */}
                        <div className="space-y-6">
                          {addedItems.map(item => (
                            <div key={`${item.productId}-${item.selectedSize || ""}-${item.selectedColor || ""}`} className="flex gap-5 group">
                              <div className="w-16 h-16 rounded-2xl bg-slate-50 relative overflow-hidden border border-slate-100 shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="text-[13px] font-black text-slate-800 truncate">{item.name}</p>
                                {(item.selectedSize || item.selectedColor) && (
                                  <p className="text-[10px] text-slate-400 font-bold mb-1">
                                    {item.selectedSize && `Size: ${item.selectedSize}`}
                                    {item.selectedSize && item.selectedColor && " | "}
                                    {item.selectedColor && `Color: ${item.selectedColor}`}
                                  </p>
                                )}
                                <p className="text-[10px] text-[#A7066A]/70 font-black uppercase">Qty: {item.quantity}</p>
                              </div>
                              <div className="flex flex-col items-end justify-center gap-1">
                                <button
                                  onClick={() => removeItem(item.productId, item.selectedSize, item.selectedColor)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <p className="text-[13px] font-black text-slate-800">{formatPrice(item.price * item.quantity)}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {addedItems.length > 0 && (
                          <>
                            {selectedWrapping && (
                              <>
                                <hr className="my-6 border-slate-100" />
                                {/* Section B: Wrapping */}
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 rounded-2xl bg-slate-50 relative overflow-hidden border border-slate-100 shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                        {selectedWrapping.imageUrl || selectedWrapping.image ? (
                                          <Image src={selectedWrapping.imageUrl || selectedWrapping.image || ""} alt={selectedWrapping.name} fill className="object-cover" />
                                        ) : (
                                          <div className="w-full h-full bg-[#FCEAF4] text-[#A7066A] flex items-center justify-center font-black italic text-xs">W</div>
                                        )}
                                      </div>
                                      <div className="flex flex-col">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t("giftWrapping")}</p>
                                        <p className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">{selectedWrapping.name}</p>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      <button
                                        onClick={() => selectWrapping(null)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                                        title="Remove wrapping"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      <p className="text-[12px] font-black text-slate-800">{selectedWrapping.price > 0 ? formatPrice(selectedWrapping.price) : t("free")}</p>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}

                            {message && (
                              <>
                                <hr className="my-6 border-slate-100" />
                                {/* Section C: Gift Message */}
                                <div className="space-y-3 pb-2">
                                  <div className="flex justify-between items-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{t("yourMessage")}</p>
                                    <button
                                      onClick={() => setMessage("")}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all mb-2"
                                      title="Remove message"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="bg-[#FCEAF4]/20 rounded-2xl p-4 border border-[#FCEAF4]/30 relative overflow-hidden group/msg">
                                    <MessageSquare className="absolute -top-1 -right-1 w-6 h-6 text-[#A7066A]/5" />
                                    <p className="text-[12px] text-slate-600 italic font-serif leading-relaxed line-clamp-3 group-hover/msg:line-clamp-none transition-all">
                                      "{message}"
                                    </p>
                                  </div>
                                </div>
                              </>
                            )}
                          </>
                        )}
                        {addedItems.length === 0 && (
                          <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 border border-slate-50 shadow-inner">
                              <Plus className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[11px] font-black text-[#A7066A] uppercase tracking-widest italic">{t("emptyBoxMsg")}</p>
                              <p className="text-[9px] font-bold text-slate-400 max-w-[120px]">{t("emptyBoxDesc")}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-8 pt-6 bg-white border-t border-slate-50 space-y-6 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] shrink-0">

                      <Button
                        className="w-full h-16 rounded-[1.5rem] bg-gradient-to-r from-[#A7066A] to-[#E91E8C] text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-[#A7066A]/20 group transition-all active:scale-95 disabled:opacity-50 border-0"
                        disabled={addedItems.length === 0}
                        onClick={nextStep}
                      >
                        {t("continueButton")}
                        <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>

                      <div className="flex items-center justify-center gap-4 text-[9px] font-black text-slate-300 uppercase tracking-widest pt-2">
                        <div className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-[#A7066A]/30" /> Ship</div>
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                        <div className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-[#A7066A]/30" /> Care</div>
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                        <div className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-[#A7066A]/30" /> SSL</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </aside>

            </div>
          ) : (
            // Steps 1, 3, 4 - Clean E-com Logic
            <div className="max-w-[1600px] mx-auto flex flex-col-reverse md:flex-row gap-12 items-start py-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex-1 w-full space-y-10">
                {currentStep === 3 && (
                  <Card className="rounded-[3rem] border-slate-200 shadow-sm p-12 bg-white space-y-10 border-t-8 border-t-[#A7066A] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCEAF4]/30 rounded-full translate-x-1/2 -translate-y-1/2" />
                    <div className="space-y-3 relative z-10">
                      <h2 className="text-3xl font-black text-slate-800 tracking-tight italic">{t("penYourThoughts")}</h2>
                      <p className="text-slate-400 font-medium max-w-md">{t("digitalPenDesc")}</p>
                    </div>

                    <div className="space-y-4 relative z-10">
                      <Label className="text-[11px] font-black uppercase text-[#A7066A] tracking-widest pl-1">{t("theManuscript")}</Label>
                      <div className="relative group">
                        <Textarea
                          className="min-h-[280px] rounded-[2rem] border-2 border-slate-50 bg-slate-50/50 p-10 text-xl font-medium focus:bg-white focus:ring-[#A7066A]/20 focus:border-[#A7066A]/50 transition-all leading-relaxed placeholder:text-slate-300 italic font-serif"
                          placeholder={t("manuscriptPlaceholder")}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                        />
                        <div className="absolute bottom-6 right-8">
                          <Badge variant="outline" className={`rounded-full px-4 py-1.5 font-bold ${message.length > 450 ? "text-red-500 border-red-100" : "text-[#A7066A] border-[#FCEAF4]"}`}>{message.length} / 500</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-4">
                        {["Happy Birthday!", "With Love Always.", "Best Wishes!", "Thank You So Much.", "Congratulations! 🥂"].map(tag => (
                          <button
                            key={tag}
                            className="px-5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-500 hover:border-[#A7066A] hover:text-[#A7066A] transition-all shadow-sm"
                            onClick={() => setMessage(message ? message + " " + tag : tag)}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}

                {currentStep === 1 && (
                  <div className="space-y-16">
                    <section className="space-y-10">
                      <div className="flex items-center gap-4 px-4 pt-10">
                        <div className="w-10 h-10 rounded-2xl bg-[#A7066A] text-white flex items-center justify-center font-black italic shadow-lg shadow-[#FCEAF4]">W</div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight italic">{t("thePerfectWrap")}</h2>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8 px-2 sm:px-4">
                        {isWrappingsLoading ? (
                          [1, 2, 3, 4].map(i => (
                            <Card key={i} className="aspect-[3/2] rounded-[1.5rem] sm:rounded-[2.5rem] p-2 sm:p-4">
                              <Skeleton className="w-full h-full rounded-[1.25rem] sm:rounded-[2rem]" />
                            </Card>
                          ))
                        ) : wrappings?.map((opt: any) => (
                          <Card
                            key={opt.id}
                            className={`group rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden cursor-pointer border-2 transition-all p-1.5 sm:p-2 ${selectedWrapping?.id === opt.id ? "border-[#A7066A] shadow-2xl scale-[1.02] bg-[#FCEAF4]/20" : "border-slate-100 hover:border-[#FCEAF4] bg-white"
                              }`}
                            onClick={() => selectWrapping(opt)}
                          >
                            <div className="relative aspect-[3/2] rounded-[1.25rem] sm:rounded-[2rem] overflow-hidden shadow-inner">
                              <Image src={opt.imageUrl || opt.image || ""} alt={opt.name} fill className="object-cover group-hover:scale-110 transition-transform duration-1000" />
                              <div className={`absolute inset-0 bg-[#A7066A]/10 transition-opacity ${selectedWrapping?.id === opt.id ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`} />
                              {selectedWrapping?.id === opt.id && (
                                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white text-[#A7066A] p-1.5 sm:p-2 rounded-full shadow-2xl animate-in zoom-in-50">
                                  <Check className="w-4 h-4 sm:w-6 sm:h-6 stroke-[3]" />
                                </div>
                              )}
                            </div>
                            <CardContent className="p-3 sm:p-8 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-transparent gap-1 sm:gap-4">
                              <div className="space-y-0.5 sm:space-y-1">
                                <h3 className="font-extrabold text-slate-800 text-xs sm:text-lg uppercase tracking-tight line-clamp-1 sm:line-clamp-none">{opt.name}</h3>
                                <p className="text-[9px] sm:text-[11px] text-[#A7066A] font-black uppercase tracking-widest italic">{opt.price === 0 ? t("complimentary") : `+ ${formatPrice(opt.price)}`}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-10">
                    {/* <div className="bg-gradient-to-r from-[#A7066A] to-[#E91E8C] py-16 px-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-10">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <span className="h-0.5 w-10 bg-white/30" />
                          <span className="text-xs font-black uppercase tracking-[0.4em] text-white/70">Review Ritual</span>
                        </div>
                        <h2 className="text-5xl font-black italic tracking-tighter uppercase tracking-[0.05em]">Pure Elegance.</h2>
                        <p className="text-white/80 font-bold max-w-sm">A gift this beautiful is rare. We've captured the highlights of your curation below.</p>
                      </div>
                      <div className="relative z-10 w-32 h-32 rounded-[3.5rem] bg-white/10 backdrop-blur-3xl border border-white/20 p-2 transform rotate-6 shadow-2xl scale-125">
                        <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden">
                          <Image src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&fit=crop" alt="Box" fill className="object-cover" />
                        </div>
                      </div>
                    </div> */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-8">
                        <InTheBox addedItems={addedItems} removeItem={removeItem} />
                      </div>

                      <div className="space-y-10">
                        {message && (
                          <div className="space-y-6">
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 tracking-tighter uppercase">
                              <span className="w-1.5 h-6 bg-slate-200 rounded-full" /> {t("theVerse")}
                            </h3>
                            <div className="bg-slate-50/50 p-10 rounded-[3rem] border border-slate-200 relative shadow-inner">
                              <div className="absolute top-4 left-6 text-5xl text-slate-200 font-serif italic">“</div>
                              <p className="text-slate-600 text-lg leading-relaxed italic font-serif relative z-10 pl-2">{message}</p>
                            </div>
                          </div>
                        )}
                        <Tailoring selectedWrapping={selectedWrapping} />
                        <Commitment />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <aside className={cn("w-full md:w-[350px] lg:w-[400px] md:sticky md:top-[150px] shrink-0", currentStep !== 4 && "hidden md:block")}>
                <Card className={`rounded-[3.5rem] border-slate-200 bg-white shadow-2xl shadow-[#A7066A]/5 flex flex-col overflow-hidden relative transition-all duration-500 ${currentStep === 4 ? "h-fit" : "h-[calc(100vh-180px)] max-h-[850px]"
                  }`}>
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-[#A7066A]" />

                  {/* Header - Fixed */}
                  <div className="p-10 pb-6 border-b border-slate-100 space-y-4 shrink-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black text-slate-800 tracking-tighter italic uppercase">{t("checkoutSummary")}</h3>
                      <Badge variant="outline" className="text-[#A7066A] border-[#FCEAF4] bg-[#FCEAF4]/50 font-black italic uppercase">{t("steps." + currentStep)}</Badge>
                    </div>
                    <div className="flex justify-between items-end pt-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t("finalTotal")}</span>
                        <span className="text-4xl font-black text-[#A7066A] tracking-tighter italic">{formatPrice(total)}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-slate-900 text-white border-0 font-black text-[8px] px-2 py-1 rounded-md tracking-widest">{t("verifiedBadge")}</Badge>
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t("secureBadge")}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Area - Scrollable */}
                  <div className="flex-1 overflow-y-auto px-10 space-y-8 pr-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-fuchsia-100 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-fuchsia-200 transition-colors">
                    {/* Items Section */}
                    {currentStep !== 4 && addedItems.length > 0 && (
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t("yourSelection")}</p>
                        <div className="space-y-4">
                          {addedItems.map(item => (
                            <div key={`${item.productId}-${item.selectedSize || ""}-${item.selectedColor || ""}`} className="flex gap-4 items-center group">
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 relative overflow-hidden border border-slate-100 shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-slate-800 truncate leading-tight">{item.name}</p>
                                {(item.selectedSize || item.selectedColor) && (
                                  <p className="text-[10px] text-slate-400 font-bold leading-none my-1">
                                    {item.selectedSize && `Size: ${item.selectedSize}`}
                                    {item.selectedSize && item.selectedColor && " | "}
                                    {item.selectedColor && `Color: ${item.selectedColor}`}
                                  </p>
                                )}
                                <p className="text-[9px] text-[#A7066A]/70 font-black uppercase tracking-wider">{t("quantity")} {item.quantity}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  onClick={() => removeItem(item.productId, item.selectedSize, item.selectedColor)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <p className="text-[11px] font-black text-slate-800 shrink-0">{formatPrice(item.price * item.quantity)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedWrapping && currentStep !== 4 && (
                      <>
                        <Separator className="bg-slate-50" />
                        {/* Wrapping Section */}
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t("giftWrapping")}</p>
                          <div className="flex gap-4 items-center group">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 relative overflow-hidden border border-slate-100 shrink-0 shadow-sm transition-transform group-hover:scale-105">
                              {selectedWrapping.imageUrl || selectedWrapping.image ? (
                                <Image src={selectedWrapping.imageUrl || selectedWrapping.image || ""} alt={selectedWrapping.name} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#FCEAF4] text-[#A7066A] flex items-center justify-center font-black italic">W</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-slate-800 truncate leading-tight">{selectedWrapping.name}</p>
                              <p className="text-[9px] text-[#A7066A]/70 font-black uppercase tracking-wider">
                                {selectedWrapping.price === 0 ? t("complimentary") : t("tailoring")}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <button
                                onClick={() => selectWrapping(null)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                                title="Remove wrapping"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <p className="text-[11px] font-black text-slate-800 shrink-0">
                                {selectedWrapping.price > 0 ? formatPrice(selectedWrapping.price) : "LKR 0.00"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {message && currentStep !== 4 && (
                      <>
                        <Separator className="bg-slate-50" />
                        {/* Message Section */}
                        <div className="space-y-3 pb-4">
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t("yourMessage")}</p>
                            <button
                              onClick={() => setMessage("")}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                              title="Remove message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="bg-fuchsia-50/30 rounded-3xl p-5 border border-fuchsia-100/50 relative overflow-hidden group/msg">
                            <MessageSquare className="absolute -top-1 -right-1 w-10 h-10 text-[#A7066A]/5" />
                            <p className="text-[12px] text-slate-600 italic font-serif leading-relaxed line-clamp-4 group-hover/msg:line-clamp-none transition-all">
                              "{message}"
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Footer Area - Fixed */}
                  <div className="p-10 pt-8 bg-white border-t border-slate-100 space-y-6 shadow-[0_-15px_30px_rgba(0,0,0,0.02)] shrink-0">

                    <div className="space-y-4">
                      {currentStep === 4 ? (
                        <div className="flex flex-col gap-2">
                          <Button
                            className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all disabled:opacity-50"
                            onClick={handleAddToCart}
                            disabled={addedItems.length === 0}
                          >
                            {t("purchaseNow")}
                            <ShoppingBag className="w-5 h-5 ml-3" />
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full h-16 rounded-2xl border-slate-200 text-slate-800 hover:bg-slate-50 font-black text-sm uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                            onClick={handleAddToBag}
                            disabled={addedItems.length === 0 || isAddingToCart}
                          >
                            {isAddingToCart ? t("addingToCart") || "ADDING..." : t("addToCart")}
                            <ShoppingBag className="w-5 h-5 ml-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="w-full h-16 rounded-2xl bg-gradient-to-r from-[#A7066A] to-[#E91E8C] text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-[#A7066A]/20 group active:scale-95 transition-all border-0 disabled:opacity-50"
                          onClick={nextStep}
                          disabled={currentStep === 1 ? !selectedWrapping : addedItems.length === 0}
                        >
                          {t("nextStep")}
                          <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        className="w-full h-14 rounded-2xl text-[11px] font-black uppercase text-slate-400 hover:text-[#A7066A] tracking-[0.2em] transition-all"
                        onClick={() => currentStep === 1 ? null : prevStep()}
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" /> {t("previousStep")}
                      </Button>
                    </div>
                  </div>
                </Card>
              </aside>
            </div>
          )}
        </div>
      </main>

      {/* Sticky Mobile Bottom Navigation Bar */}
      {currentStep !== 4 && (
        <div className="lg:hidden fixed bottom-4 left-2 right-2 sm:left-4 sm:right-4 z-40 bg-white/90 backdrop-blur-xl border border-slate-200/60 p-3 sm:p-4 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-300 max-w-[calc(100vw-16px)] sm:max-w-[calc(100vw-32px)] mx-auto">
          <div className="flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                {t("steps." + currentStep)}
              </span>
              <span className="text-lg font-black text-[#A7066A] tracking-tight">
                {formatPrice(total)}
              </span>
              {itemCount > 0 && (
                <span className="text-[9px] font-bold text-slate-500 mt-0.5 whitespace-nowrap">
                  {itemCount} {itemCount === 1 ? "item" : "items"} selected
                </span>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {/* View Box Drawer Trigger - Only on Step 2 (if items are added) */}
              {currentStep === 2 && addedItems.length > 0 && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="h-12 w-12 rounded-2xl border-slate-200 bg-white text-slate-700 font-black transition-all active:scale-95 flex items-center justify-center">
                      <Package className="w-5 h-5 text-[#A7066A]" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-[2.5rem] max-h-[80vh] p-0 flex flex-col bg-white border-t border-slate-100 animate-in slide-in-from-bottom duration-300">
                    <SheetHeader className="p-6 border-b border-slate-100 flex-row justify-between items-center">
                      <SheetTitle className="text-sm font-black text-slate-800 tracking-wider uppercase flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-[#A7066A] rounded-full" /> {t("inTheBox")} ({itemCount})
                      </SheetTitle>
                    </SheetHeader>
                    <SheetBody className="flex-1 overflow-y-auto p-6 bg-[#FCF9FB]">
                      <InTheBox addedItems={addedItems} removeItem={removeItem} showTitle={false} />
                    </SheetBody>
                  </SheetContent>
                </Sheet>
              )}

              <Button
                className="h-12 px-6 rounded-2xl bg-gradient-to-r from-[#A7066A] to-[#E91E8C] text-white font-black text-xs uppercase tracking-wider shadow-md border-0 active:scale-95 transition-all"
                disabled={currentStep === 1 ? !selectedWrapping : addedItems.length === 0}
                onClick={nextStep}
              >
                {t("continueButton")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
