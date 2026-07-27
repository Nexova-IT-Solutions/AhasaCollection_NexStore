"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Search, Package, Tag, Loader2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { resolveStorageUrl } from "@/lib/utils";
import { usePosCart } from "@/store/use-pos-cart";
import { toast } from "sonner";
import { VariantSelectorModal } from "@/components/products/VariantSelectorModal";
import { parseProductVariants } from "@/types/variant";
import type { VariantProductPayload, VariantSelection } from "@/types/variant";
import { useCurrency } from "@/components/CurrencyProvider";

interface ProductItem {
  id: string;
  name: string;
  nameAr?: string | null;
  sku: string | null;
  price: number;
  salePrice: number | null;
  stock: number;
  image: string | null;
  categoryName: string | null;
  categoryId: string | null;
  discountId: string | null;
  discountName: string | null;
  discountValue: number | null;
  discountType: string | null;
  isEGiftCard: boolean;
  giftCardValue: number | null;
  sizes?: string[];
  colors?: string[];
  productVariants?: unknown;
}

interface CategoryOption {
  id: string;
  name: string;
}

export function PosProductGrid() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const addItem = usePosCart((s) => s.addItem);

  // ─── Variant Selector State ──────────────────────────────────
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantProduct, setVariantProduct] = useState<VariantProductPayload | null>(null);

  // ─── Drag-to-Scroll References & Handlers for Categories ───
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleCategoryMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!categoryContainerRef.current) return;
    isDownRef.current = true;
    isDraggingRef.current = false;
    startXRef.current = e.pageX - categoryContainerRef.current.offsetLeft;
    scrollLeftRef.current = categoryContainerRef.current.scrollLeft;
  };

  const handleCategoryMouseLeave = () => {
    isDownRef.current = false;
  };

  const handleCategoryMouseUp = () => {
    isDownRef.current = false;
    // Set a tiny timeout to clear dragging state, ensuring standard click 
    // handlers can be bypassed via the click capture phase first.
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  };

  const handleCategoryMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDownRef.current || !categoryContainerRef.current) return;
    
    const x = e.pageX - categoryContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5; // Drag sensitivity multiplier

    if (Math.abs(x - startXRef.current) > 5) {
      isDraggingRef.current = true;
    }

    categoryContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleCategoryClickCapture = (e: React.MouseEvent) => {
    // Prevent the click filter callback if the user was actively dragging
    if (isDraggingRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const fetchProducts = useCallback(
    async (q: string, cat: string, p: number) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (cat) params.set("category", cat);
        params.set("page", String(p));
        params.set("limit", "20");

        const res = await fetch(`/api/admin/pos/products/search?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch products");

        const data = await res.json();
        setProducts(data.products || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
        if (data.categories && categories.length === 0) {
          setCategories(data.categories);
        }
      } catch (error) {
        console.error("Product search error:", error);
        toast.error("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    },
    [categories.length]
  );

  // Initial load
  useEffect(() => {
    fetchProducts("", "", 1);
  }, [fetchProducts]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchProducts(searchQuery, selectedCategory, 1);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, selectedCategory, fetchProducts]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchProducts(searchQuery, selectedCategory, newPage);
  };

  const handleAddToCart = async (product: ProductItem) => {
    if (product.stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    // ─── Variant Interception ─────────────────────────────────
    const sizes = product.sizes ?? [];
    const colors = product.colors ?? [];
    const hasVariants = sizes.length > 0 || colors.length > 0;

    if (hasVariants) {
      const parsedVariants = parseProductVariants(product.productVariants);
      setVariantProduct({
        id: product.id,
        name: product.name,
        nameAr: product.nameAr || null,
        price: product.price,
        salePrice: product.salePrice,
        stock: product.stock,
        sizes,
        colors,
        productVariants: parsedVariants,
        image: product.image,
        discountName: product.discountName,
        discountValue: product.discountValue,
        discountType: product.discountType,
      });
      setVariantModalOpen(true);
      return;
    }

    // ─── No variants → add directly ───────────────────────────
    addItem({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr || null,
      sku: product.sku,
      price: product.price,
      salePrice: product.salePrice,
      stock: product.stock,
      image: product.image,
      discountName: product.discountName,
      discountValue: product.discountValue,
      discountType: product.discountType,
      isEGiftCard: product.isEGiftCard,
      giftCardValue: product.giftCardValue,
    });

    toast.success(`Added ${product.name}`, { position: "top-center", duration: 1500 });
  };

  const handleVariantConfirm = (selection: VariantSelection) => {
    if (!variantProduct) return;

    const variantLabel = [selection.size, selection.color].filter(Boolean).join(" / ");
    const isCustomPrice = selection.price !== undefined && selection.price !== variantProduct.price;

    addItem({
      id: `${variantProduct.id}-${selection.variantId}`,
      name: `${variantProduct.name} (${variantLabel})`,
      nameAr: variantProduct.nameAr || null,
      sku: selection.sku || null,
      price: selection.price ?? variantProduct.price,
      salePrice: isCustomPrice ? null : (variantProduct.salePrice ?? null),
      stock: selection.stock,
      image: variantProduct.image ?? null,
      discountName: variantProduct.discountName,
      discountValue: variantProduct.discountValue,
      discountType: variantProduct.discountType,
      isEGiftCard: false,
      giftCardValue: null,
    });

    toast.success(
      `Added ${variantProduct.name} — ${variantLabel}`,
      { position: "top-center", duration: 2000 }
    );

    setVariantProduct(null);
  };

  const { formatPrice } = useCurrency();

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 space-y-3 border-b border-slate-200 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#A7066A] transition-colors text-sm"
            id="pos-product-search"
          />
        </div>

        {/* Category Chips with Horizontal Drag-to-Scroll */}
        <div
          ref={categoryContainerRef}
          onMouseDown={handleCategoryMouseDown}
          onMouseLeave={handleCategoryMouseLeave}
          onMouseUp={handleCategoryMouseUp}
          onMouseMove={handleCategoryMouseMove}
          onClickCapture={handleCategoryClickCapture}
          className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 select-none cursor-grab active:cursor-grabbing scroll-smooth whitespace-nowrap"
        >
          <button
            onClick={() => setSelectedCategory("")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              !selectedCategory
                ? "bg-[#A7066A] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#A7066A] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-[#A7066A]" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Package className="h-12 w-12 mb-3 stroke-1" />
              <p className="text-sm font-medium">No products found</p>
              <p className="text-xs mt-1">Try a different search or category</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-400 mb-3">
                {totalCount} product{totalCount !== 1 ? "s" : ""} found
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.filter(p => !p.isEGiftCard).map((product) => {
                  const hasDiscount =
                    (product.salePrice && product.salePrice < product.price) ||
                    (product.discountValue && product.discountValue > 0);
                  const effectivePrice =
                    product.salePrice && product.salePrice < product.price
                      ? product.salePrice
                      : product.price;
                  const isOutOfStock = product.stock <= 0;

                  return (
                    <button
                      key={product.id}
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock}
                      className={`group relative flex flex-col bg-white rounded-xl border transition-all duration-200 overflow-hidden text-left ${
                        isOutOfStock
                          ? "opacity-50 cursor-not-allowed border-slate-200"
                          : "border-slate-200 hover:border-[#A7066A] hover:shadow-lg hover:shadow-pink-100/50 active:scale-[0.97] cursor-pointer"
                      }`}
                    >
                      {/* Image */}
                      <div className="relative aspect-square bg-slate-50 overflow-hidden">
                        {product.image ? (
                          <Image
                            src={resolveStorageUrl(product.image)}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Package className="h-8 w-8 text-slate-300" />
                          </div>
                        )}

                        {/* Discount badge */}
                        {hasDiscount && !isOutOfStock && (
                          <div className="absolute top-1.5 left-1.5">
                            <Badge className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 font-bold rounded-md">
                              <Tag className="h-2.5 w-2.5 mr-0.5" />
                              SALE
                            </Badge>
                          </div>
                        )}

                        {/* Gift card badge */}
                        {product.isEGiftCard && (
                          <div className="absolute top-1.5 right-1.5 flex gap-1 z-10">
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0.5 font-bold rounded-md flex items-center gap-0.5 shadow-sm">
                              <Sparkles className="h-2.5 w-2.5" />
                              GIFT CARD
                            </Badge>
                          </div>
                        )}

                        {/* Out of stock overlay */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded">
                              OUT OF STOCK
                            </span>
                          </div>
                        )}

                        {/* Stock indicator */}
                        {!isOutOfStock && product.stock <= 5 && (
                          <div className="absolute bottom-1.5 right-1.5">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0.5">
                              {product.stock} left
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2.5 flex-1 flex flex-col">
                        <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-tight mb-1">
                          {product.name}
                          {product.nameAr && <span className="block text-[#A7066A] mt-0.5 text-right font-semibold dir-rtl">{product.nameAr}</span>}
                        </p>
                        {product.sku && (
                          <p className="text-[10px] text-slate-400 mb-1.5">
                            SKU: {product.sku}
                          </p>
                        )}
                        <div className="mt-auto flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-[#A7066A]">
                            {formatPrice(effectivePrice)}
                          </span>
                          {hasDiscount && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {formatPrice(product.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-slate-500">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="h-8 px-2"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* ── Variant Selector Modal ─────────────────────────── */}
      <VariantSelectorModal
        open={variantModalOpen}
        onOpenChange={setVariantModalOpen}
        product={variantProduct}
        onConfirm={handleVariantConfirm}
        enableServerValidation
      />
    </div>
  );
}
