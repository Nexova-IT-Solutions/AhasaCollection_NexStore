"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/components/CurrencyProvider";
import { Eye, Grid3X3, Layers, Package, Pencil, Search, TableProperties, Trash2, AlertTriangle, ChevronLeft, ChevronRight, MinusCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProductFilters } from "./ProductFilters";
import { ReusablePagination } from "@/components/admin/reusable-pagination";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ProductData = {
  id: string;
  name: string;
  sku?: string | null;
  slug?: string;
  price: number;
  salePrice: number | null;
  stock: number;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  occasions: { id: string; name: string }[];
  sizes: string[];
  colors: string[];
  productImages: Array<{ url: string; altText?: string | null }>;
  isActive: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  showInDiscountSection: boolean;
  isTopRated: boolean; isBestSeller: boolean; showInChocolateSection: boolean; showInSoftToysSection: boolean; isPremiumGiftBox: boolean;
  itemsInside?: Array<{
    itemId: string;
    quantity: number;
    item: {
      id: string;
      name: string;
      price: number;
      stock: number;
    } | null;
  }>;
  createdAt: Date;
  repository?: { id: string; name: string } | null;
  outlet?: { id: string; name: string } | null;
};

type ViewMode = "table" | "grid";
type ProductsTab = "standard" | "gift-boxes";

const VIEW_STORAGE_KEY = "admin-products-view-mode";
const GRID_COLUMNS_STORAGE_KEY = "admin-products-grid-columns";

const GRID_COLUMN_OPTIONS = [2, 3, 4, 6, 8] as const;

function getGridClassName(columns: number) {
  switch (columns) {
    case 2:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2";
    case 3:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    case 4:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
    case 6:
      return "grid-cols-2 md:grid-cols-3 lg:grid-cols-6";
    case 8:
      return "grid-cols-2 md:grid-cols-4 lg:grid-cols-8";
    default:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  }
}

export function ProductsClient({
  initialProducts,
  initialPage,
  initialPageSize,
  initialTotal,
  initialTab,
  initialFilters,
  hideOutOfStockConfig,
  hasStockAdmin,
}: {
  initialProducts: ProductData[];
  initialPage: number;
  initialPageSize: number;
  initialTotal: number;
  initialTab: ProductsTab;
  initialFilters: {
    q: string;
    category: string;
    occasion: string;
    stock: string;
    repository: string;
    outlet: string;
    isTrending: boolean;
    isNewArrival: boolean;
    showInDiscountSection: boolean;
    isTopRated: boolean;
    isBestSeller: boolean;
    showInChocolateSection: boolean;
    showInSoftToysSection: boolean;
  };
  hideOutOfStockConfig: boolean;
  hasStockAdmin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();

  const { data: toggles } = useSWR<Record<string, boolean>>("/api/admin/feature-toggles", fetcher);
  const isWebsiteEnabled = toggles?.storefront_website_enabled !== false;
  
  const [products, setProducts] = useState<ProductData[]>(initialProducts);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [gridColumns, setGridColumns] = useState<number>(4);
  const [transferProduct, setTransferProduct] = useState<ProductData | null>(null);
  const [transferOutletId, setTransferOutletId] = useState("");
  const [transferQty, setTransferQty] = useState(1);
  const [transferReason, setTransferReason] = useState("");
  const [outlets, setOutlets] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/outlets")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setOutlets(data);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleTransfer = async () => {
    if (!transferProduct || !transferOutletId || transferQty <= 0 || !transferReason) {
      toast({
        title: "Validation Error",
        description: "Please fill all transfer fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: transferProduct.id,
          targetOutletId: transferOutletId,
          quantity: transferQty,
          reason: transferReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Transfer failed");

      toast({ title: "Success", description: "Stock transferred successfully!" });
      setTransferProduct(null);
      setTransferOutletId("");
      setTransferQty(1);
      setTransferReason("");
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const [adjustProduct, setAdjustProduct] = useState<ProductData | null>(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState("");

  const handleAdjust = async () => {
    if (!adjustProduct || adjustQty <= 0 || !adjustReason) {
      toast({
        title: "Validation Error",
        description: "Please fill all fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjustProduct.id,
          quantity: adjustQty,
          reason: adjustReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Adjustment failed");

      toast({ title: "Success", description: "Stock removed successfully!" });
      setAdjustProduct(null);
      setAdjustQty(1);
      setAdjustReason("");
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };



  const hasHydratedPreferences = useRef(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / initialPageSize));

  useEffect(() => {
    setProducts(initialProducts);
    setTotalCount(initialTotal);
  }, [initialProducts, initialTotal]);

  useEffect(() => {
    if (hasHydratedPreferences.current || typeof window === "undefined") {
      return;
    }

    const storedView = window.localStorage.getItem(VIEW_STORAGE_KEY);
    const storedColumns = Number(window.localStorage.getItem(GRID_COLUMNS_STORAGE_KEY));

    if (storedView === "table" || storedView === "grid") {
      setViewMode(storedView);
    }

    if (GRID_COLUMN_OPTIONS.includes(storedColumns as (typeof GRID_COLUMN_OPTIONS)[number])) {
      setGridColumns(storedColumns);
    }

    hasHydratedPreferences.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedPreferences.current) {
      return;
    }
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedPreferences.current) {
      return;
    }
    window.localStorage.setItem(GRID_COLUMNS_STORAGE_KEY, String(gridColumns));
  }, [gridColumns]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete product");
      }

      setProducts((prev) => prev.filter((product) => product.id !== deleteTarget.id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      toast({ title: "Product deleted", description: "Product removed from inventory." });
      router.refresh();
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete product", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters = Boolean(
    initialFilters.q || 
    initialFilters.category || 
    initialFilters.stock !== "all" ||
    initialFilters.isTrending ||
    initialFilters.isNewArrival ||
    initialFilters.showInDiscountSection || initialFilters.isTopRated || initialFilters.isBestSeller || initialFilters.showInChocolateSection || initialFilters.showInSoftToysSection
  );

  const renderProductsList = (list: ProductData[]) => {
    return viewMode === "table" ? (
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="py-4 px-6 font-semibold uppercase tracking-wider text-[11px]">Product</th>
                <th className="py-4 px-6 font-semibold uppercase tracking-wider text-[11px]">SKU</th>
                <th className="py-4 px-6 font-semibold uppercase tracking-wider text-[11px]">Placement</th>
                <th className="py-4 px-6 font-semibold uppercase tracking-wider text-[11px]">Valuation</th>
                <th className="py-4 px-6 font-semibold uppercase tracking-wider text-[11px]">Availability</th>
                <th className="py-4 px-6 font-semibold uppercase tracking-wider text-[11px]">Attributes</th>
                <th className="py-4 px-6 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((product) => (
                <tr key={product.id} className="group hover:bg-gray-50/80 even:bg-gray-50/50 transition-colors duration-150">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 rounded-lg border border-gray-150 bg-[#FAFAFA] overflow-hidden shadow-2xs group-hover:scale-105 transition-transform duration-300 shrink-0">
                        {product.productImages?.[0] ? (
                          <Image src={product.productImages[0].url} alt={product.name} fill className="object-cover" />
                        ) : <Package className="w-full h-full p-3 text-gray-200" />}
                        {((product.isPremiumGiftBox && (product.itemsInside ?? []).some(entry => (entry.item?.stock ?? 0) < entry.quantity)) || (!product.isPremiumGiftBox && product.stock <= 0)) && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Badge variant="destructive" className="h-4 text-[7px] px-1 font-bold">OOS</Badge>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm leading-normal">{product.name}</div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">ID: {product.id.substring(0,8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {product.sku ? (
                      <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200/50">
                        {product.sku}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-300 italic uppercase">No SKU</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-medium text-gray-700">
                        Rep: {product.repository?.name || "Unassigned"}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">
                        Outlet: {product.outlet?.name || "Unassigned"}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {product.salePrice && product.salePrice < product.price ? (
                      <div className="flex flex-col">
                        <div className="text-sm font-bold text-[#2563EB]">
                          {formatPrice(product.salePrice)}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 line-through">
                          {formatPrice(product.price)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-[#2563EB]">
                        {formatPrice(product.price)}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1.5">
                      {product.stock <= 0 ? (
                        <Badge variant="destructive" className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60 rounded-md px-2 py-0.5 text-[10px] font-semibold w-fit">
                          Out of stock
                        </Badge>
                      ) : product.stock <= 5 ? (
                        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60 rounded-md px-2 py-0.5 text-[10px] font-semibold w-fit">
                          Only {product.stock} left
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 rounded-md px-2 py-0.5 text-[10px] font-semibold w-fit">
                          {product.stock} in stock
                        </Badge>
                      )}
                      
                      <div>
                        {product.isPremiumGiftBox ? (() => {
                          const oosItems = (product.itemsInside ?? []).filter(entry => (entry.item?.stock ?? 0) < entry.quantity);
                          if (oosItems.length === 0) return (
                            <Badge variant="outline" className="h-4.5 text-[9px] px-1.5 border-emerald-200 text-emerald-600 bg-emerald-50/50 font-semibold">LISTED</Badge>
                          );
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="destructive" className="h-4.5 text-[9px] px-1.5 gap-1 animate-pulse cursor-help">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    UNLISTED
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white border-red-100 p-3 shadow-xl max-w-[250px]">
                                  <div className="space-y-1.5">
                                    <p className="text-[11px] font-bold text-red-600">Hidden from user</p>
                                    <ul className="text-[10px] list-disc pl-3 text-red-700">
                                      {oosItems.map(item => (
                                        <li key={item.itemId}>
                                          {item.item?.name || "Unknown"} (Req: {item.quantity}, have: {item.item?.stock ?? 0})
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })() : (() => {
                          const isUnlisted = product.stock <= 0 && hideOutOfStockConfig;
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant={isUnlisted ? "destructive" : "outline"} 
                                    className={`h-4.5 text-[9px] px-1.5 font-semibold cursor-help ${!isUnlisted ? "border-emerald-200 text-emerald-600 bg-emerald-50/50" : "animate-pulse"}`}
                                  >
                                    {isUnlisted ? "UNLISTED" : "LISTED"}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white border-brand-border p-3 shadow-xl">
                                  <p className="text-xs font-semibold text-gray-700">
                                    {isUnlisted 
                                      ? "Product is hidden because it's out of stock and 'Auto-hide' is ON." 
                                      : (product.stock <= 0 
                                          ? "Visible even with 0 stock because 'Auto-hide' is OFF." 
                                          : "Product is active and available in storefront.")}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })()}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {product.sizes.map(s => <Badge key={s} variant="secondary" className="text-[9px] py-0.5 px-1.5 bg-gray-50 border-gray-200 font-semibold">{s}</Badge>)}
                      {product.colors.map(c => <Badge key={c} className="text-[9px] py-0.5 px-1.5 bg-gray-900 text-white font-semibold">{c}</Badge>)}
                      {(product.occasions ?? []).map((occ) => (
                        <Badge key={occ.id} variant="secondary" className="text-[9px] py-0.5 px-1.5 bg-[#EFF6FF] text-[#2563EB] border-0 font-semibold">
                          {occ.name}
                        </Badge>
                      ))}
                      {product.showInDiscountSection && (
                        <Badge variant="outline" className="text-[9px] py-0.5 px-1.5 bg-red-50 text-red-600 border-red-200 font-semibold uppercase tracking-tighter">
                          Discounted
                        </Badge>
                      )}
                      {product.isNewArrival && (
                        <Badge variant="outline" className="text-[9px] py-0.5 px-1.5 bg-blue-50 text-blue-600 border-blue-200 font-semibold uppercase tracking-tighter">
                          New Arrival
                        </Badge>
                      )}
                      {product.isTrending && (
                        <Badge variant="outline" className="text-[9px] py-0.5 px-1.5 bg-orange-50 text-orange-600 border-orange-200 font-semibold uppercase tracking-tighter">
                          Trending
                        </Badge>
                      )}
                      {product.isTopRated && (
                        <Badge variant="outline" className="text-[9px] py-0.5 px-1.5 bg-yellow-50 text-yellow-600 border-yellow-200 font-semibold uppercase tracking-tighter">
                          Top Rated
                        </Badge>
                      )}
                      {product.isBestSeller && (
                        <Badge variant="outline" className="text-[9px] py-0.5 px-1.5 bg-emerald-50 text-emerald-600 border-emerald-200 font-semibold uppercase tracking-tighter">
                          Best Seller
                        </Badge>
                      )}
                      {product.showInChocolateSection && (
                        <Badge variant="outline" className="text-[9px] py-0.5 px-1.5 bg-amber-50 text-amber-700 border-amber-200 font-semibold uppercase tracking-tighter">
                          Chocolate
                        </Badge>
                      )}
                      {product.showInSoftToysSection && (
                        <Badge variant="outline" className="text-[9px] py-0.5 px-1.5 bg-purple-50 text-purple-600 border-purple-200 font-semibold uppercase tracking-tighter">
                          Soft Toy
                        </Badge>
                      )}
                      {product.sizes.length === 0 && product.colors.length === 0 && !product.showInDiscountSection && !product.isNewArrival && !product.isTrending && !product.isTopRated && !product.isBestSeller && !product.showInChocolateSection && !product.showInSoftToysSection && <span className="text-[9px] font-semibold text-gray-300 italic uppercase">Default Base</span>}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isWebsiteEnabled && (
                        <Button asChild variant="outline" size="icon" className="h-8.5 w-8.5 border-gray-200 hover:bg-gray-50">
                          <Link href={`/products/${product.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${product.name}`}>
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                          </Link>
                        </Button>
                      )}
                      
                      {hasStockAdmin && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8.5 w-8.5 border-gray-200 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                          onClick={() => {
                            setTransferProduct(product);
                            setTransferQty(1);
                            setTransferReason("");
                            setTransferOutletId("");
                          }}
                          title="Transfer Stock"
                        >
                          <Layers className="w-3.5 h-3.5 text-gray-500 hover:text-[#2563EB]" />
                        </Button>
                      )}

                      {hasStockAdmin && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8.5 w-8.5 border-gray-200 hover:bg-red-50 hover:text-red-600"
                          onClick={() => {
                            setAdjustProduct(product);
                            setAdjustQty(1);
                            setAdjustReason("");
                          }}
                          title="Deduct Stock"
                        >
                          <MinusCircle className="w-3.5 h-3.5 text-gray-500 hover:text-red-600" />
                        </Button>
                      )}

                      <Button asChild variant="outline" size="icon" className="h-8.5 w-8.5 border-gray-200 hover:bg-gray-50">
                        <Link href={`/admin/products/${product.id}/edit`} aria-label={`Edit ${product.name}`}>
                          <Pencil className="w-3.5 h-3.5 text-gray-500" />
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8.5 w-8.5"
                        onClick={() => setDeleteTarget(product)}
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    {hasActiveFilters ? (
                      <>
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-250">
                          <Search className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="font-semibold text-lg text-gray-800">No products found</p>
                        <p className="text-gray-500 text-sm mt-1">Try different search criteria or clear the filters.</p>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-250">
                          <Layers className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="font-semibold text-lg text-gray-800">Your inventory is empty</p>
                        <p className="text-gray-500 text-sm mt-1">Begin by registering your first product above.</p>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : (
      <div className="bg-white rounded-[2rem] shadow-2xl border border-brand-border p-4 md:p-6">
        {list.length === 0 ? (
          <div className="px-8 py-24 text-center">
            <div className="w-20 h-20 bg-brand-surface rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-brand-border">
              <Search className="w-10 h-10 text-[#2563EB] opacity-20" />
            </div>
            <p className="font-black text-2xl text-[#1F1720] uppercase tracking-tighter">No products found</p>
            <p className="text-[#6B5A64] mt-2">Try different search criteria or clear the filters.</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${getGridClassName(gridColumns)}`}>
            {list.map((product) => (
              <div key={product.id} className="h-full rounded-2xl border border-brand-border bg-white p-3 shadow-sm transition hover:shadow-md flex flex-col">
                <div className="relative mb-3 aspect-square overflow-hidden rounded-xl border border-brand-border bg-[#FAFAFA]">
                  {product.productImages?.[0] ? (
                    <Image src={product.productImages[0].url} alt={product.name} fill className="object-cover" />
                  ) : (
                    <Package className="h-full w-full p-6 text-gray-200" />
                  )}
                  {((product.isPremiumGiftBox && (product.itemsInside ?? []).some(entry => (entry.item?.stock ?? 0) < entry.quantity)) || (!product.isPremiumGiftBox && product.stock <= 0)) && (
                    <div className="absolute top-2 left-2 z-10">
                      <Badge variant="destructive" className="text-[10px] h-5 px-2 font-bold shadow-lg">OUT OF STOCK</Badge>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5 z-10">
                    {product.isNewArrival && (
                      <div className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm whitespace-nowrap z-10 bg-blue-600 text-white">NEW</div>
                    )}
                    {product.isTrending && (
                      <div className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm whitespace-nowrap z-10 bg-orange-500 text-white">TRENDING</div>
                    )}
                    {product.isBestSeller && (
                      <div className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm whitespace-nowrap z-10 bg-amber-400 text-amber-950">BEST SELLER</div>
                    )}
                    {product.isTopRated && (
                      <div className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm whitespace-nowrap z-10 bg-purple-600 text-white">TOP RATED</div>
                    )}
                    {product.showInDiscountSection && (
                      <div className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm whitespace-nowrap z-10 bg-rose-500 text-white">DISCOUNT SEC</div>
                    )}
                    {(product.showInChocolateSection || product.showInSoftToysSection) && (
                      <div className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm whitespace-nowrap z-10 bg-teal-500 text-white">
                        {product.showInChocolateSection ? "CHOCO" : "SOFT TOY"}
                      </div>
                    )}
                  </div>
                </div>
                <p className="line-clamp-2 min-h-[40px] text-sm font-bold text-[#1F1720]">{product.name}</p>
                {product.salePrice && product.salePrice < product.price ? (
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs font-semibold text-red-600">LKR {product.salePrice.toLocaleString()}</p>
                    <p className="text-[10px] font-medium text-[#6B5A64] line-through opacity-70">LKR {product.price.toLocaleString()}</p>
                  </div>
                ) : (
                  <p className="mt-1 text-xs font-semibold text-[#2563EB]">LKR {product.price.toLocaleString()}</p>
                )}
                <div className="mt-auto pt-3 flex items-center justify-end gap-2">
                  {isWebsiteEnabled && (
                    <Button asChild variant="outline" size="icon" className="h-8 w-8 border-brand-border hover:bg-[#EFF6FF]">
                      <Link href={`/products/${product.id}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                  )}
                  {hasStockAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-brand-border hover:bg-[#EFF6FF]"
                      onClick={() => {
                        setTransferProduct(product);
                        setTransferQty(1);
                        setTransferReason("");
                        setTransferOutletId("");
                      }}
                      title="Transfer Stock"
                    >
                      <Layers className="w-4 h-4 text-gray-500 hover:text-[#2563EB]" />
                    </Button>
                  )}
                  {hasStockAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-brand-border hover:bg-red-50"
                      onClick={() => {
                        setAdjustProduct(product);
                        setAdjustQty(1);
                        setAdjustReason("");
                      }}
                      title="Deduct Stock"
                    >
                      <MinusCircle className="w-4 h-4 text-gray-500 hover:text-red-600" />
                    </Button>
                  )}
                  <Button asChild variant="outline" size="icon" className="h-8 w-8 border-brand-border hover:bg-[#EFF6FF]">
                    <Link href={`/admin/products/${product.id}/edit`}>
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-20">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1F1720]">Catalogue Inventory</h1>
          <p className="text-[#6B5A64] mt-2">Design and manage your product offerings with precision.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-brand-border bg-white p-1">
            <Button
              type="button"
              size="icon"
              variant={viewMode === "table" ? "default" : "ghost"}
              className={viewMode === "table" ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white" : "hover:bg-[#EFF6FF]"}
              onClick={() => setViewMode("table")}
              aria-label="Table view"
            >
              <TableProperties className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={viewMode === "grid" ? "default" : "ghost"}
              className={viewMode === "grid" ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white" : "hover:bg-[#EFF6FF]"}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>

          {viewMode === "grid" ? (
            <select
              value={gridColumns}
              onChange={(event) => setGridColumns(Number(event.target.value))}
              className="h-10 rounded-xl border border-brand-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              {GRID_COLUMN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} Columns
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      <ProductFilters initialFilters={initialFilters} hasStockAdmin={hasStockAdmin} />

      <div className="mt-6">
        {renderProductsList(products)}
      </div>

      {/* Reusable Pagination UI */}
      <div className="mt-8 border border-brand-border rounded-2xl overflow-hidden shadow-sm">
        <ReusablePagination
          totalItems={totalCount}
          itemsPerPage={initialPageSize}
          currentPage={initialPage}
          pageParamKey="page"
          limitParamKey="pageSize"
        />
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-brand-border bg-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-[#1F1720]">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#6B5A64]">
              This will permanently remove <span className="font-bold text-[#A7066A]">{deleteTarget?.name}</span> from your inventory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-brand-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="rounded-xl bg-red-600 text-white hover:bg-red-700">
              {loading ? "Deleting..." : "Delete Product"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stock Transfer Dialog */}
      <AlertDialog open={!!transferProduct} onOpenChange={(open) => !open && setTransferProduct(null)}>
        <AlertDialogContent className="rounded-2xl border-brand-border bg-white shadow-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-[#1F1720]">Transfer Stock</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#6B5A64]">
              Move stock for <span className="font-bold text-[#2563EB]">{transferProduct?.name}</span> to another outlet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-xl bg-slate-50 border border-gray-100 p-3">
              <p className="text-[10px] font-extrabold text-[#6B5A64] uppercase tracking-wider">Source Placement</p>
              <p className="text-sm font-bold text-gray-850 mt-0.5">
                {transferProduct?.repository?.name ? `Repository: ${transferProduct.repository.name}` : ""}
                {transferProduct?.repository?.name && transferProduct?.outlet?.name ? " / " : ""}
                {transferProduct?.outlet?.name ? `Outlet: ${transferProduct.outlet.name}` : "Central Warehouse"}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-750">Target Outlet</label>
              <select
                value={transferOutletId}
                onChange={(e) => setTransferOutletId(e.target.value)}
                className="w-full h-10 rounded-xl border border-brand-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="">Select an outlet...</option>
                {outlets
                  .filter((o) => o.id !== transferProduct?.outlet?.id) // exclude current outlet correctly
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-750">Quantity (Max: {transferProduct?.stock})</label>
              <input
                type="number"
                min={1}
                max={transferProduct?.stock || 1}
                value={transferQty}
                onChange={(e) => setTransferQty(Math.max(1, Math.min(transferProduct?.stock || 9999, Number(e.target.value))))}
                className="w-full h-10 rounded-xl border border-brand-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-750">Transfer Reason</label>
              <textarea
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Reason for stock transfer (e.g. Colombo outlet stock replenishment)"
                className="w-full min-h-[80px] p-3 rounded-xl border border-brand-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-brand-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleTransfer();
              }}
              disabled={loading || !transferOutletId || !transferReason || transferQty <= 0}
              className="rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Transferring..." : "Confirm Transfer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stock Removal/Deduction Dialog */}
      <AlertDialog open={!!adjustProduct} onOpenChange={(open) => !open && setAdjustProduct(null)}>
        <AlertDialogContent className="rounded-2xl border-brand-border bg-white shadow-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-[#1F1720]">Deduct Stock</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#6B5A64]">
              Remove/reduce stock for <span className="font-bold text-[#A7066A]">{adjustProduct?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-xl bg-red-50/50 border border-red-100 p-3">
              <p className="text-[10px] font-extrabold text-[#A7066A] uppercase tracking-wider">Current Location</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">
                {adjustProduct?.repository?.name ? `Repository: ${adjustProduct.repository.name}` : ""}
                {adjustProduct?.repository?.name && adjustProduct?.outlet?.name ? " / " : ""}
                {adjustProduct?.outlet?.name ? `Outlet: ${adjustProduct.outlet.name}` : "Central Warehouse"}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-750">Quantity to Remove (Max: {adjustProduct?.stock})</label>
              <input
                type="number"
                min={1}
                max={adjustProduct?.stock || 1}
                value={adjustQty}
                onChange={(e) => setAdjustQty(Math.max(1, Math.min(adjustProduct?.stock || 9999, Number(e.target.value))))}
                className="w-full h-10 rounded-xl border border-brand-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-750">Reason for Removal</label>
              <textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Reason for removing stock (e.g. damaged item, expired, discrepancy)"
                className="w-full min-h-[80px] p-3 rounded-xl border border-brand-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A]"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-brand-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleAdjust();
              }}
              disabled={loading || !adjustReason || adjustQty <= 0}
              className="rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Removing..." : "Remove Stock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
