"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/utils/supabase";
import { AlertTriangle, Camera, CalendarIcon, Check, ChevronsUpDown, Package, RefreshCw, ShoppingCart, Star, Tag, Trash2, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { generateSKU } from "@/lib/sku";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/ui/form";
import useSWR from "swr";
import { useCurrency } from "@/components/CurrencyProvider";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MarkdownEditor = dynamic(() => import("@/components/ui/markdown-editor"), { ssr: false });
const BarcodeCard = dynamic(
  () => import("@/components/admin/products/BarcodeCard").then((mod) => mod.BarcodeCard),
  { ssr: false }
);

const REQUIRED_FIELD_MESSAGE = "This field is required.";

const productFormSchema = z.object({
  name: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  nameAr: z.string().optional().or(z.literal('')),
  sku: z.string()
    .max(20, 'SKU cannot exceed 20 characters')
    .regex(/^[A-Z0-9-]*$/, 'SKU must be uppercase letters, numbers, and hyphens only')
    .optional()
    .or(z.literal('')),
  categoryId: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  price: z
    .string()
    .trim()
    .min(1, REQUIRED_FIELD_MESSAGE)
    .refine((value) => Number(value) > 0, "Price must be greater than 0"),
  stock: z.string().trim().optional(),
  moodIds: z.array(z.string().trim().min(1)).default([]),
  discountId: z.string().optional(),
  showInDiscountSection: z.boolean().default(false),
  showInChocolateSection: z.boolean().default(false),
  showInSoftToysSection: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isTopRated: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isPremiumGiftBox: z.boolean().default(false),
  isSpecialTouch: z.boolean().default(false),
  isAvailableInBuilder: z.boolean().default(false),
  supplierId: z.string().optional().nullable().or(z.literal('')),
}).superRefine((data, ctx) => {
  const hasDiscount = Boolean(data.discountId && data.discountId.trim().length > 0);
  if (data.showInDiscountSection && !hasDiscount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["showInDiscountSection"],
      message: "A promotion/discount must be applied to show this product in the discount section.",
    });
  }

  // Handle conditional stock requirement for non-gift boxes
  if (!data.isPremiumGiftBox) {
    if (!data.stock || data.stock.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stock"],
        message: REQUIRED_FIELD_MESSAGE,
      });
    } else {
      const stockNum = Number(data.stock);
      if (!Number.isInteger(stockNum) || stockNum < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stock"],
          message: "Stock must be a valid whole number",
        });
      }
    }
  }
});

type ProductImageData = {
  url: string;
  color?: string;
  isMain?: boolean;
};

type StagedImageData = ProductImageData & { file?: File; previewUrl?: string };

type VariantData = {
  size: string;
  color: string;
  price: number | string;
  stock: number | string;
  sku?: string;
};

type CategoryData = {
  id: string;
  name: string;
  slug?: string;
};

type OccasionData = {
  id: string;
  name: string;
};

type RecipientData = {
  id: string;
  name: string;
  slug?: string;
};

type MoodData = {
  id: string;
  name: string;
  icon?: string | null;
};

type DiscountData = {
  id: string;
  name: string;
  description?: string | null;
  value: number;
  type: "PERCENTAGE" | "FIXED";
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

type GiftBoxItemSelection = {
  itemId: string;
  quantity: number;
  sortOrder: number;
  item?: {
    id: string;
    name: string;
    price: number;
    stock: number;
  };
};

type AvailableGiftItem = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: {
    id: string;
    name: string;
    slug?: string;
  } | null;
};

type SupplierOption = {
  id: string;
  name: string;
};

type ProductInput = {
  id: string;
  sku?: string | null;
  name: string;
  nameAr?: string | null;
  description: string | null;
  shortDescription?: string | null;
  price: number;
  salePrice?: number | null;
  discountId?: string | null;
  stock: number;
  isNewArrival?: boolean;
  isTrending?: boolean;
  isTopRated?: boolean;
  isBestSeller?: boolean;
  showInDiscountSection?: boolean;
  showInChocolateSection?: boolean;
  showInSoftToysSection?: boolean;
  isPremiumGiftBox?: boolean;
  isSpecialTouch?: boolean;
  specialTouchOrder?: number;
  isAvailableInBuilder?: boolean;
  categoryId: string | null;
  sizes: string[];
  colors: string[];
  occasions: OccasionData[];
  recipients?: RecipientData[];
  moods?: Array<{ mood: MoodData } | { moodId: string; productId: string }>;
  itemsInside?: GiftBoxItemSelection[];
  productImages: unknown;
  productVariants: unknown;
  costPrice?: number | null;
  supplierId?: string | null;
  lastSuppliedAt?: string | null;
};

type ProductFormProps = {
  locale: string;
  mode: "create" | "edit";
  categories?: CategoryData[];
  occasions?: OccasionData[];
  recipients?: RecipientData[];
  moods?: MoodData[];
  discounts?: DiscountData[];
  availableGiftItems?: AvailableGiftItem[];
  product?: ProductInput;
};

function calculateSalePrice(basePrice: number, discount?: DiscountData | null) {
  if (!discount || !Number.isFinite(basePrice) || basePrice <= 0) {
    return null;
  }

  if (discount.type === "FIXED") {
    return Math.max(0, Number((basePrice - discount.value).toFixed(3)));
  }

  const capped = Math.min(Math.max(discount.value, 0), 100);
  return Math.max(0, Number((basePrice - (basePrice * capped) / 100).toFixed(3)));
}

function parseImages(images: unknown): ProductImageData[] {
  if (!Array.isArray(images)) return [];
  const parsed: ProductImageData[] = [];

  images.forEach((image) => {
    if (!image || typeof image !== "object") return;
    const candidate = image as { url?: unknown; color?: unknown; isMain?: unknown };
    if (typeof candidate.url !== "string" || !candidate.url) return;

    parsed.push({
      url: candidate.url,
      color: typeof candidate.color === "string" ? candidate.color : undefined,
      isMain: typeof candidate.isMain === "boolean" ? candidate.isMain : false,
    });
  });

  return parsed;
}

function parseVariants(variants: unknown): VariantData[] {
  if (!Array.isArray(variants)) return [];
  return variants
    .map((variant) => {
      if (!variant || typeof variant !== "object") return null;
      const candidate = variant as {
        size?: unknown;
        color?: unknown;
        price?: unknown;
        stock?: unknown;
      };
      return {
        size: typeof candidate.size === "string" ? candidate.size : "",
        color: typeof candidate.color === "string" ? candidate.color : "",
        price: Number(candidate.price) || 0,
        stock: Number(candidate.stock) || 0,
        sku: typeof (candidate as any).sku === "string" ? (candidate as any).sku : undefined,
      };
    })
    .filter((variant): variant is VariantData => Boolean(variant));
}

function SwitchStateLabel({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  const label = disabled ? "Disabled" : checked ? "On" : "Off";

  return (
    <span
      className={cn(
        "inline-flex min-w-[4.25rem] items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
        disabled
          ? "border-gray-200 bg-gray-100 text-gray-400"
          : checked
            ? "border-[#F4C2DE] bg-[#FCEAF4] text-[#A7066A]"
            : "border-gray-300 bg-gray-50 text-gray-600"
      )}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

export function ProductForm({ locale, mode, categories, occasions, recipients, moods, discounts, availableGiftItems, product }: ProductFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit";
  const { toast } = useToast();
  const { currency, formatPrice } = useCurrency();

  const { data: toggles } = useSWR<Record<string, boolean>>("/api/admin/feature-toggles", fetcher);
  const isWebsiteEnabled = toggles?.storefront_website_enabled !== false;
  const isGiftboxesAvailable = toggles?.giftboxes_available !== false;
  const isDiscountsEnabled = toggles?.storefront_section !== false && toggles?.storefront_discounts !== false;
  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      nameAr: product?.nameAr || "",
      sku: product?.sku || "",
      categoryId: product?.categoryId || "",
      price: product?.price != null ? String(product.price) : "",
      stock: product?.stock != null ? String(product.stock) : "",
      moodIds: product?.moods?.map(pm => 'mood' in pm ? pm.mood.id : pm.moodId) || [],
      discountId: product?.discountId || "",
      showInDiscountSection: Boolean(product?.showInDiscountSection),
      showInChocolateSection: Boolean(product?.showInChocolateSection),
      showInSoftToysSection: Boolean(product?.showInSoftToysSection),
      isNewArrival: Boolean(product?.isNewArrival),
      isTrending: Boolean(product?.isTrending),
      isTopRated: Boolean(product?.isTopRated),
      isBestSeller: Boolean(product?.isBestSeller),
      isPremiumGiftBox: Boolean(product?.isPremiumGiftBox || (Array.isArray(product?.itemsInside) && product?.itemsInside.length > 0)),
      isSpecialTouch: Boolean(product?.isSpecialTouch),
      isAvailableInBuilder: Boolean(product?.isAvailableInBuilder),
      supplierId: product?.supplierId || (product as any)?.supplier?.id || "",
    },
  });

  const { watch, setValue: setWatchedValue, control, reset } = form;
  const { 
    isNewArrival, 
    isTrending, 
    isTopRated, 
    isBestSeller, 
    showInDiscountSection, 
    showInChocolateSection, 
    showInSoftToysSection, 
    isPremiumGiftBox, 
    isSpecialTouch,
    isAvailableInBuilder
  } = watch();
  const [formMode, setFormMode] = useState<"item" | "box">(() => {
    if (mode === "edit" && product) {
      if (product.isPremiumGiftBox) return "box";
      if (product.itemsInside && product.itemsInside.length > 0) return "box";
      return "item";
    }
    return searchParams.get("type") === "box" ? "box" : "item";
  });

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [sku, setSku] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [stock, setStock] = useState<number | "">("");
  const [selectedDiscountId, setSelectedDiscountId] = useState("");
  const [specialTouchOrder, setSpecialTouchOrder] = useState<number | "">(0);
  const [categoryId, setCategoryId] = useState("");
  const [selectedOccasionIds, setSelectedOccasionIds] = useState<string[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [selectedMoodIds, setSelectedMoodIds] = useState<string[]>([]);
  const [stagedImages, setStagedImages] = useState<StagedImageData[]>([]);
  const [costPrice, setCostPrice] = useState<number | "">("");
  const [supplierId, setSupplierId] = useState("");
  const [supplyDate, setSupplyDate] = useState<Date | undefined>(undefined);

  const [sizeInput, setSizeInput] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);

  const [colorInput, setColorInput] = useState("");
  const [colorHexInput, setColorHexInput] = useState("#000000");
  const [colors, setColors] = useState<string[]>([]);

  const [variants, setVariants] = useState<VariantData[]>([]);
  const [removedVariants, setRemovedVariants] = useState<string[]>([]);

  const [categoryOptions, setCategoryOptions] = useState<CategoryData[]>(categories ?? []);
  const [occasionOptions, setOccasionOptions] = useState<OccasionData[]>(occasions ?? []);
  const [recipientOptions, setRecipientOptions] = useState<RecipientData[]>(recipients ?? []);
  const [moodOptions, setMoodOptions] = useState<MoodData[]>(moods ?? []);
  const [discountOptions, setDiscountOptions] = useState<DiscountData[]>(discounts ?? []);
  const [giftItemOptions, setGiftItemOptions] = useState<AvailableGiftItem[]>(availableGiftItems ?? []);
  const [selectedGiftItems, setSelectedGiftItems] = useState<GiftBoxItemSelection[]>([]);
  const [giftItemPickerOpen, setGiftItemPickerOpen] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(!categories || !occasions || !recipients || !moods || !availableGiftItems || !discounts);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "sku" | "price" | "stock" | "categoryId" | "moodIds" | "showInDiscountSection", string>>>({});
  const [isMounted, setIsMounted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const hasValidDiscount = Boolean(selectedDiscountId && selectedDiscountId.trim().length > 0);

  useEffect(() => {
    if (!product) return;

    console.log("Hydrating form with product data:", product);
    
    // Explicitly reset the form with casted boolean values
    form.reset({
      name: product.name || "",
      nameAr: product.nameAr || "",
      sku: product.sku || "",
      categoryId: product.categoryId || "",
      price: product.price != null ? String(product.price) : "",
      stock: product.stock != null ? String(product.stock) : "",
      moodIds: product.moods?.map(pm => 'mood' in pm ? pm.mood.id : pm.moodId) || [],
      discountId: product.discountId || "",
      showInDiscountSection: Boolean(product.showInDiscountSection),
      showInChocolateSection: Boolean(product.showInChocolateSection),
      showInSoftToysSection: Boolean(product.showInSoftToysSection),
      isNewArrival: Boolean(product.isNewArrival),
      isTrending: Boolean(product.isTrending),
      isTopRated: Boolean(product.isTopRated),
      isBestSeller: Boolean(product.isBestSeller),
      isPremiumGiftBox: Boolean(product.isPremiumGiftBox || (Array.isArray(product.itemsInside) && product.itemsInside.length > 0)),
      isSpecialTouch: Boolean(product.isSpecialTouch),
      isAvailableInBuilder: Boolean(product.isAvailableInBuilder),
      supplierId: product.supplierId || (product as any).supplier?.id || "",
    });

    // Sync remaining non-form local states
    setName(product.name);
    setNameAr(product.nameAr || "");
    setSku(product.sku || "");
    setShortDescription(product.shortDescription ?? "");
    setDescription(product.description ?? "");
    setPrice(product.price);
    setStock(product.stock);
    setSelectedDiscountId(product.discountId ?? "");
    setSpecialTouchOrder(Number.isFinite(product.specialTouchOrder) ? Number(product.specialTouchOrder) : 0);
    setCategoryId(product.categoryId ?? "");
    setCostPrice(product.costPrice != null ? product.costPrice : "");
    setSupplierId(product.supplierId ?? "");
    setSupplyDate(product.lastSuppliedAt ? new Date(product.lastSuppliedAt) : undefined);
    setSelectedOccasionIds(product.occasions?.map((occasion) => occasion.id) ?? []);
    setSelectedRecipientIds(product.recipients?.map((recipient) => recipient.id) ?? []);
    setSelectedMoodIds(
      product.moods?.map((productMood) => ("mood" in productMood ? productMood.mood.id : productMood.moodId)) ?? []
    );

    const parsedImages = parseImages(product.productImages);
    setStagedImages(
      parsedImages.map((image, index) => ({
        ...image,
        isMain: image.isMain ?? index === 0,
      }))
    );

    setSizes(product.sizes ?? []);
    setColors(product.colors ?? []);
    setVariants(parseVariants(product.productVariants));
    setIsHydrated(true);
    setSelectedGiftItems(
      (product.itemsInside ?? []).map((entry, index) => {
        // Fallback to full item details from options if price/stock are missing from the relation
        const fallbackItem = availableGiftItems?.find((i) => i.id === entry.itemId);
        return {
          itemId: entry.itemId,
          quantity: Math.max(1, Number(entry.quantity) || 1),
          sortOrder: Number.isInteger(entry.sortOrder) ? entry.sortOrder : index,
          item: entry.item?.price !== undefined
            ? entry.item
            : fallbackItem
              ? {
                  id: fallbackItem.id,
                  name: fallbackItem.name,
                  price: fallbackItem.price,
                  stock: fallbackItem.stock,
                }
              : entry.item,
        };
      })
    );

    const isBox = Boolean(product.isPremiumGiftBox) || (Array.isArray(product.itemsInside) && product.itemsInside.length > 0);
    setFormMode(isBox ? "box" : "item");
  }, [product, form]);

  useEffect(() => {
    if (isEdit) return;
    setFormMode(searchParams.get("type") === "box" ? "box" : "item");
  }, [isEdit, searchParams]);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      if (categories && occasions && recipients && moods && availableGiftItems && discounts) {
        setOptionsLoading(false);
        // Still fetch suppliers even if other options are pre-loaded
      }

      try {
        const [categoriesRes, occasionsRes, recipientsRes, moodsRes, discountsRes, suppliersRes] = await Promise.all([
          categories ? Promise.resolve(null) : fetch("/api/admin/categories", { cache: "no-store" }),
          occasions ? Promise.resolve(null) : fetch("/api/admin/occasions", { cache: "no-store" }),
          recipients ? Promise.resolve(null) : fetch("/api/admin/recipients", { cache: "no-store" }),
          moods ? Promise.resolve(null) : fetch("/api/admin/moods", { cache: "no-store" }),
          discounts ? Promise.resolve(null) : fetch("/api/admin/discounts", { cache: "no-store" }),
          fetch("/api/admin/suppliers", { cache: "no-store" }),
        ]);

        if (!active) return;

        if (categoriesRes && categoriesRes.ok) {
          const categoriesJson = await categoriesRes.json();
          setCategoryOptions(
            Array.isArray(categoriesJson)
              ? categoriesJson
                  .map((item) => ({ id: item.id, name: item.name, slug: item.slug }))
                  .filter((item) => item.id && item.name)
              : []
          );
        }

        if (occasionsRes && occasionsRes.ok) {
          const occasionsJson = await occasionsRes.json();
          setOccasionOptions(
            Array.isArray(occasionsJson)
              ? occasionsJson.map((item) => ({ id: item.id, name: item.name })).filter((item) => item.id && item.name)
              : []
          );
        }

        if (recipientsRes && recipientsRes.ok) {
          const recipientsJson = await recipientsRes.json();
          setRecipientOptions(
            Array.isArray(recipientsJson)
              ? recipientsJson
                  .map((item) => ({ id: item.id, name: item.name, slug: item.slug }))
                  .filter((item) => item.id && item.name)
              : []
          );
        }

        if (moodsRes && moodsRes.ok) {
          const moodsJson = await moodsRes.json();
          setMoodOptions(
            Array.isArray(moodsJson)
              ? moodsJson.map((item) => ({ id: item.id, name: item.name, icon: item.icon })).filter((item) => item.id && item.name)
              : []
          );
        }

        if (discountsRes && discountsRes.ok) {
          const discountsJson = await discountsRes.json();
          setDiscountOptions(
            Array.isArray(discountsJson)
              ? discountsJson
                  .filter((item) => item?.isActive)
                  .map((item) => ({
                    id: item.id,
                    name: item.name,
                    description: item.description ?? null,
                    value: Number(item.value) || 0,
                    type: item.type === "FIXED" ? "FIXED" : "PERCENTAGE",
                    isActive: Boolean(item.isActive),
                    startsAt: item.startsAt ?? null,
                    endsAt: item.endsAt ?? null,
                  }))
              : []
          );
        }

        if (suppliersRes && suppliersRes.ok) {
          const suppliersJson = await suppliersRes.json();
          const suppliersList = suppliersJson.suppliers ?? suppliersJson;
          setSupplierOptions(
            Array.isArray(suppliersList)
              ? suppliersList
                  .map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }))
                  .filter((item: SupplierOption) => item.id && item.name)
              : []
          );
        }
      } finally {
        if (active) setOptionsLoading(false);
      }
    };

    void loadOptions();

    return () => {
      active = false;
    };
  }, [categories, occasions, recipients, moods, discounts, availableGiftItems]);

  useEffect(() => {
    if (availableGiftItems) {
      setGiftItemOptions(availableGiftItems);
    }
  }, [availableGiftItems]);

  useEffect(() => {
    // Prevent overwriting existing variants during initial load/hydration
    if (isEdit && !isHydrated) return;

    setVariants((prev) => {
      const nextVariants: VariantData[] = [];
      const sizesList = sizes.length > 0 ? sizes : [""];
      const colorsList = colors.length > 0 ? colors : [""];

      if (sizes.length === 0 && colors.length === 0) return [];

      sizesList.forEach((sizeValue) => {
        colorsList.forEach((colorValue) => {
          const key = `${sizeValue}:${colorValue}`;
          if (removedVariants.includes(key)) return;

          // Case-insensitive, trimmed comparison to prevent mismatches
          const existing = prev.find(
            (variant) =>
              variant.size.trim().toLowerCase() === sizeValue.trim().toLowerCase() &&
              variant.color.trim().toLowerCase() === colorValue.trim().toLowerCase()
          );
          nextVariants.push({
            size: sizeValue,
            color: colorValue,
            price: existing ? existing.price : 0,
            stock: existing ? existing.stock : 0,
            sku: existing && existing.sku ? existing.sku : `ITEM-${sizeValue}-${colorValue.split('|')[0]}`.replace(/[^A-Za-z0-9-]/g, '-').replace(/-+/g, '-').toUpperCase()
          });
        });
      });

      return nextVariants;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizes, colors, removedVariants]);

  const variantTotalStock = useMemo(() => {
    if (!Array.isArray(variants) || variants.length === 0) return 0;
    
    // Clean .reduce() loop to safely parse integers and prevent NaN or accumulation bugs
    const computedTotal = variants.reduce((sum, variant) => {
      const currentStock = Number(variant.stock) || 0;
      return sum + currentStock;
    }, 0);
    
    return computedTotal;
  }, [variants]);

  useEffect(() => {
    if (formMode !== "box" && Array.isArray(variants) && variants.length > 0) {
      const computedTotal = variantTotalStock;
      
      // Instantly push accurate total to main stock state and React Hook Form controller
      setStock(computedTotal);
      setWatchedValue('stock', String(computedTotal));
    }
  }, [variantTotalStock, formMode, variants.length, setWatchedValue]);

  const heading = useMemo(() => {
    return isEdit ? "Edit Product" : "New Inventory Registration";
  }, [isEdit]);

  const productTypeLabel = formMode === "box" ? "Gift Box" : "Standard Product";

  const selectedDiscount = useMemo(
    () => discountOptions.find((discount) => discount.id === selectedDiscountId) ?? null,
    [discountOptions, selectedDiscountId]
  );

  const computedSalePrice = useMemo(() => {
    const basePrice = typeof price === "number" ? price : Number(price);
    if (!Number.isFinite(basePrice) || basePrice <= 0) return null;
    return calculateSalePrice(basePrice, selectedDiscount);
  }, [price, selectedDiscount]);

  const hasAtLeastOneImage = useMemo(
    () =>
      stagedImages.some(
        (image) => Boolean(image.file) || (typeof image.url === "string" && image.url.trim().length > 0)
      ),
    [stagedImages]
  );
  const storefrontOptionsLocked = useMemo(() => {
    if (isEdit) return false; // Allow editing existing flags even if images are being re-staged
    return !hasAtLeastOneImage;
  }, [isEdit, hasAtLeastOneImage]);
  const discountSwitchDisabled = storefrontOptionsLocked || !hasValidDiscount;

  const selectedCategory = useMemo(
    () => categoryOptions.find((category) => category.id === watch("categoryId")),
    [categoryOptions, watch]
  );



  // Removed auto-reset of flags to prevent race conditions during data loading

  // Auto-reset showInDiscountSection when discount is removed
  useEffect(() => {
    // Only allow auto-reset after mounting and initial data sync to prevent race conditions
    if (!isMounted) return;
    
    if (!hasValidDiscount && showInDiscountSection) {
      form.setValue("showInDiscountSection", false);
    }
  }, [hasValidDiscount, showInDiscountSection, isMounted]);

  useEffect(() => {
    if (formMode !== "box" || isEdit) return;

    const giftBoxCategory = categoryOptions.find((category) => {
      const normalizedName = category.name.toLowerCase();
      const normalizedSlug = (category.slug ?? "").toLowerCase();
      return normalizedName.includes("gift box") || normalizedSlug.includes("box");
    });

    if (!giftBoxCategory) return;
    if (categoryId === giftBoxCategory.id) return;

    setCategoryId(giftBoxCategory.id);
    setWatchedValue("categoryId", giftBoxCategory.id);
  }, [categoryId, categoryOptions, formMode, setWatchedValue, isEdit]);

  // Sync formMode with isPremiumGiftBox toggle
  useEffect(() => {
    if (isPremiumGiftBox) {
      setFormMode("box");
    } else if (!isEdit) {
      // Only auto-switch to item mode in create mode
      setFormMode("item");
    }
  }, [isPremiumGiftBox, isEdit]);

  useEffect(() => {
    setWatchedValue("categoryId", categoryId);
  }, [categoryId, setWatchedValue]);

  const selectableGiftItems = useMemo(
    () =>
      giftItemOptions.filter(
        (item) =>
          item.id !== product?.id && !selectedGiftItems.some((selectedItem) => selectedItem.itemId === item.id)
      ),
    [giftItemOptions, product?.id, selectedGiftItems]
  );

  const outOfStockItems = useMemo(() => {
    if (formMode !== "box") return [];
    return selectedGiftItems.filter((entry) => {
      const stock = entry.item?.stock ?? 0;
      return stock < entry.quantity;
    });
  }, [formMode, selectedGiftItems]);

  const isEffectivelyOutOfStock = formMode === "box" && outOfStockItems.length > 0;

  const effectiveStockValue = useMemo(() => {
    if (formMode !== "box") return stock;
    if (selectedGiftItems.length === 0) return 0;

    let minStock = Infinity;
    selectedGiftItems.forEach((entry) => {
      const available = entry.item?.stock ?? 0;
      const canMake = Math.floor(available / entry.quantity);
      if (canMake < minStock) minStock = canMake;
    });
    return minStock === Infinity ? 0 : minStock;
  }, [formMode, stock, selectedGiftItems]);

  const totalBoxValue = useMemo(() => {
    if (formMode !== "box") return 0;
    return selectedGiftItems.reduce((acc, entry) => {
      const itemPrice = entry.item?.price ?? 0;
      return acc + (itemPrice * entry.quantity);
    }, 0);
  }, [formMode, selectedGiftItems]);

  const discountPercentage = useMemo(() => {
    if (!selectedDiscount || !price || price === 0) return 0;
    if (selectedDiscount.type === "PERCENTAGE") return selectedDiscount.value;
    return Math.round((selectedDiscount.value / Number(price)) * 100);
  }, [selectedDiscount, price]);

  useEffect(() => {
    if (formMode === "box" && selectedGiftItems.length > 0) {
      setPrice(totalBoxValue);
    }
  }, [formMode, totalBoxValue, selectedGiftItems.length]);

  const handleAddItem = (
    input: string,
    setInput: (value: string) => void,
    list: string[],
    setList: (value: string[]) => void
  ) => {
    const value = input.trim();
    if (!value || list.includes(value)) return;
    setList([...list, value]);
    setInput("");
  };

  const handleAddColor = () => {
    const nameValue = colorInput.trim();
    const hexValue = colorHexInput.trim() || "#000000";
    if (!nameValue) return;

    const existingIndex = colors.findIndex(c => c.split('|')[0].toLowerCase() === nameValue.toLowerCase());
    if (existingIndex !== -1) return;

    const combinedValue = `${nameValue}|${hexValue}`;
    setColors([...colors, combinedValue]);
    setColorInput("");
    // Keep colorHexInput as is or reset if preferred, we'll keep it for consecutive similar colors
  };

  const handleImageSelect = (items: (string | File)[]) => {
    const nextItems: StagedImageData[] = items.map((item, index) => {
      if (typeof item === "string") {
        const existing = stagedImages.find((image) => image.url === item);
        return {
          url: item,
          color: existing?.color,
          isMain: existing?.isMain ?? index === 0,
        };
      }

      return {
        url: "",
        file: item,
        previewUrl: URL.createObjectURL(item),
        isMain: index === 0,
      };
    });

    if (nextItems.length > 0 && !nextItems.some((item) => item.isMain)) {
      nextItems[0].isMain = true;
    }

    setStagedImages(nextItems);
  };

  const addGiftItem = (item: AvailableGiftItem) => {
    setSelectedGiftItems((prev) => [
      ...prev,
      {
        itemId: item.id,
        quantity: 1,
        sortOrder: prev.length,
        item: {
          id: item.id,
          name: item.name,
          price: item.price,
          stock: item.stock
        },
      },
    ]);
    setGiftItemPickerOpen(false);
  };

  const removeGiftItem = (itemId: string) => {
    setSelectedGiftItems((prev) =>
      prev
        .filter((entry) => entry.itemId !== itemId)
        .map((entry, index) => ({
          ...entry,
          sortOrder: index,
        }))
    );
  };

  const updateGiftItemQuantity = (itemId: string, quantity: number) => {
    setSelectedGiftItems((prev) =>
      prev.map((entry) =>
        entry.itemId === itemId
          ? {
              ...entry,
              quantity: Math.max(1, quantity || 1),
            }
          : entry
      )
    );
  };

  const handleGenerateSKU = () => {
    const selectedCategory = categoryOptions.find((c) => c.id === categoryId);
    const newSku = generateSKU(selectedCategory?.slug ?? null);
    setSku(newSku);
    setFieldErrors((prev) => ({ ...prev, sku: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    const parsed = productFormSchema.safeParse({
      name,
      ...(sku ? { sku } : {}),
      categoryId,
      price: price === "" ? "" : String(price),
      stock: formMode === "box" ? String(effectiveStockValue) : (variants.length > 0 ? String(variantTotalStock) : (stock === "" ? "" : String(stock))),
      moodIds: selectedMoodIds,
      discountId: selectedDiscountId,
      showInDiscountSection,
      showInChocolateSection,
      showInSoftToysSection,
      isPremiumGiftBox: formMode === "box" || isPremiumGiftBox,
    });

    if (!parsed.success) {
      const nextErrors: Partial<Record<"name" | "sku" | "price" | "stock" | "categoryId" | "moodIds" | "showInDiscountSection", string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof nextErrors;
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);

    try {
      const itemsInside = formMode === "box"
        ? selectedGiftItems.map((entry, index) => ({
            itemId: entry.itemId,
            quantity: Math.max(1, entry.quantity),
            sortOrder: index,
          }))
        : [];

      const finalImages: ProductImageData[] = await Promise.all(
        stagedImages.map(async (image) => {
          let url = image.url;
          if (image.file) {
            url = await uploadFile(image.file, "products");
          }
          return {
            url,
            color: image.color,
            isMain: image.isMain,
          };
        })
      );

      const hasImagesForStorefront = finalImages.some(
        (image) => typeof image.url === "string" && image.url.trim().length > 0
      );
      const enforcedShowInDiscountSection = hasImagesForStorefront ? showInDiscountSection : false;
      const selectedDiscountForSubmit = hasImagesForStorefront ? selectedDiscount : null;
      const basePrice = Number(price);
      const discountAmount = selectedDiscountForSubmit
        ? selectedDiscountForSubmit.type === "FIXED"
          ? Math.min(basePrice, selectedDiscountForSubmit.value)
          : Math.min(basePrice, (basePrice * Math.min(Math.max(selectedDiscountForSubmit.value, 0), 100)) / 100)
        : 0;
      const enforcedSalePrice = selectedDiscountForSubmit
        ? Math.max(0, Number((basePrice - discountAmount).toFixed(3)))
        : null;

      const res = await fetch(isEdit ? `/api/admin/products/${product?.id}` : "/api/admin/products", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          nameAr: nameAr || null,
          sku,
          shortDescription: shortDescription || null,
          description,
          price: Number(price),
          stock: formMode === "box" ? effectiveStockValue : (variants.length > 0 ? variantTotalStock : Number(stock)),
          isNewArrival: hasImagesForStorefront ? isNewArrival : false,
          isTrending: hasImagesForStorefront ? isTrending : false,
          isTopRated: hasImagesForStorefront ? isTopRated : false,
          isBestSeller: hasImagesForStorefront ? isBestSeller : false,
          showInDiscountSection: enforcedShowInDiscountSection,
          showInChocolateSection: hasImagesForStorefront ? showInChocolateSection : false,
          showInSoftToysSection: hasImagesForStorefront ? showInSoftToysSection : false,
          isPremiumGiftBox: formMode === "box" || isPremiumGiftBox,
          isSpecialTouch,
          isAvailableInBuilder: hasImagesForStorefront ? isAvailableInBuilder : false,
          specialTouchOrder: Number(specialTouchOrder) || 0,
          discountId: selectedDiscountForSubmit?.id ?? null,
          salePrice: enforcedSalePrice,
          categoryId,
          sizes,
          colors,
          occasionIds: selectedOccasionIds,
          recipientIds: selectedRecipientIds,
          moodIds: selectedMoodIds,
          giftBoxItems: itemsInside,
          itemsInside,
          images: finalImages,
          variants: formMode === "box" ? [] : variants.map(v => ({ ...v, stock: Number(v.stock) || 0, price: Number(v.price) || 0 })),
          costPrice: costPrice === "" ? null : Number(costPrice),
          supplierId: supplierId || null,
          supplyDate: supplierId && supplyDate ? supplyDate.toISOString() : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409 && err.message?.includes("SKU")) {
          setFieldErrors((prev) => ({ ...prev, sku: "This SKU is already in use" }));
          setLoading(false);
          return;
        }
        throw new Error(err.message || `Failed to ${isEdit ? "update" : "create"} product`);
      }

      toast({
        title: isEdit ? "Product updated" : "Product created",
        description: isEdit ? "Product changes saved successfully." : "Successfully created product in inventory.",
      });

      router.push(`/admin/products`);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Request failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleOccasion = (occasionId: string) => {
    setSelectedOccasionIds((prev) =>
      prev.includes(occasionId) ? prev.filter((id) => id !== occasionId) : [...prev, occasionId]
    );
  };

  const toggleRecipient = (recipientId: string) => {
    setSelectedRecipientIds((prev) =>
      prev.includes(recipientId) ? prev.filter((id) => id !== recipientId) : [...prev, recipientId]
    );
  };

  const toggleMood = (moodId: string) => {
    setSelectedMoodIds((prev) =>
      prev.includes(moodId) ? prev.filter((id) => id !== moodId) : [...prev, moodId]
    );
  };

  return (
    <div className="flex flex-row h-[calc(100vh-4rem)] w-full overflow-hidden bg-gray-50 min-h-0">
      {/* Middle Column: Product Form Content Area */}
      <div className="flex-1 h-full overflow-y-auto p-6 min-w-0 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-brand-border">
          <h1 className="text-2xl font-bold text-[#1F1720] mb-8 flex items-center gap-3">
            <div className="p-2 bg-brand-surface rounded-xl">
              <Package className="w-6 h-6 text-[#A7066A]" />
            </div>
            {heading}
          </h1>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Badge className="bg-[#1F1720] text-white hover:bg-[#1F1720]">
              {isEdit ? `Editing: ${productTypeLabel}` : `Type: ${productTypeLabel}`}
            </Badge>
            {isEffectivelyOutOfStock && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="flex items-center gap-1.5 animate-pulse cursor-help">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      UNLISTED
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border-red-100 p-3 shadow-xl max-w-[280px]">
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-red-600">Hidden from storefront</p>
                      <p className="text-xs text-gray-600">This gift box is automatically hidden because the following items are out of stock or have insufficient quantity:</p>
                      <ul className="text-xs list-disc pl-4 space-y-1 text-red-700 font-medium">
                        {outOfStockItems.map(item => (
                          <li key={item.itemId}>
                            {item.item?.name || item.itemId} (Req: {item.quantity}, Has: {item.item?.stock ?? 0})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isEdit ? (
              <p className="text-xs text-[#6B5A64]">
                Product type cannot be changed after creation. Please create a new product if needed.
              </p>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
        <input type="hidden" name="isPremiumGiftBox" value={String(isPremiumGiftBox)} readOnly />
        
        {/* Section 1: Basic Information */}
        <div className="space-y-8">
          <div className="rounded-2xl border border-brand-border bg-[#FAFAFA] px-4 py-3">
            <p className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Section 1: Basic Information</p>
            <p className="text-xs text-[#6B5A64] mt-1">Product type, identity, and narrative details.</p>
          </div>

          {(isGiftboxesAvailable || isEdit) && (
            <div className="space-y-4">
              <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Product Type Selection</Label>
              <Tabs
                value={formMode}
                onValueChange={(val) => {
                  const nextMode = val as "item" | "box";
                  setFormMode(nextMode);
                  setWatchedValue("isPremiumGiftBox", nextMode === "box");
                }}
                className="w-full"
              >
                <TabsList className="h-11 w-full max-w-md bg-white border border-brand-border p-1 shadow-sm font-sans">
                  <TabsTrigger
                    value="item"
                    disabled={isEdit}
                    className="h-9 px-6 text-gray-500 hover:text-[#A7066A] transition-all duration-200 ease-in-out font-semibold data-[state=active]:!bg-[#A7066A] data-[state=active]:!text-white data-[state=active]:!shadow-[0_4px_12px_rgba(167,6,106,0.25)]"
                  >
                    Standard Item
                  </TabsTrigger>
                  {(isGiftboxesAvailable || (isEdit && formMode === "box")) && (
                    <TabsTrigger
                      value="box"
                      disabled={isEdit}
                      className="h-9 px-6 text-gray-500 hover:text-[#A7066A] transition-all duration-200 ease-in-out font-semibold data-[state=active]:!bg-[#A7066A] data-[state=active]:!text-white data-[state=active]:!shadow-[0_4px_12px_rgba(167,6,106,0.25)]"
                    >
                      Gift Box
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
            </div>
          )}
          {isEdit && (
            <p className="text-xs text-[#6B5A64]">
              Product type cannot be changed after creation.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label required className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Product Name</Label>
              <Input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Signature Golden Gift Box" className="h-12 border-brand-border" />
              {fieldErrors.name ? <p className="text-sm text-destructive">{fieldErrors.name}</p> : null}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Arabic Name (Optional)</Label>
              <Input value={nameAr} onChange={(event) => setNameAr(event.target.value)} placeholder="e.g. علبة هدايا ذهبية مميزة" className="h-12 border-brand-border text-right" dir="auto" />
            </div>
          </div>

          {/* SKU & Barcode */}
          <div className="space-y-4 rounded-xl border border-brand-border p-4 bg-muted/40">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="space-y-2 flex-1 w-full">
                <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">SKU (Stock Keeping Unit)</Label>
                <div className="flex gap-3">
                  <Input
                    value={sku}
                    onChange={(event) => setSku(event.target.value.toUpperCase())}
                    placeholder="e.g. CHOC-A3F91"
                    className="h-12 border-brand-border flex-1 bg-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateSKU}
                    className="shrink-0 h-12 border-brand-border px-4 bg-white hover:bg-[#FCEAF4]"
                  >
                    Generate SKU
                  </Button>
                </div>
                <p className="text-xs text-[#6B5A64]">
                  Optional. Max 20 characters. Uppercase letters, numbers, and hyphens only.
                </p>
                {fieldErrors.sku ? <p className="text-sm text-destructive font-semibold">{fieldErrors.sku}</p> : null}
              </div>
            </div>

            {sku && sku.length >= 3 && (
              <div className="pt-2">
                <BarcodeCard
                  sku={sku}
                  productName={name || 'Product'}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Short Description</Label>
              <span className={`text-xs font-medium ${shortDescription.length > 250 ? "text-red-500" : "text-[#6B5A64]"}`}>
                {shortDescription.length}/250
              </span>
            </div>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value.slice(0, 250))}
              placeholder="Brief summary shown on product cards (max 250 chars)..."
              rows={2}
              className="w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm text-[#1F1720] placeholder:text-[#6B5A64]/50 focus:border-[#A7066A] focus:ring-1 focus:ring-[#A7066A] outline-none resize-none transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider block mb-2">Product Narrative (Markdown)</Label>
            <MarkdownEditor value={description || ""} onChange={setDescription} placeholder="Tell the brand story for this item..." />
          </div>
        </div>


        {/* Section 2: Media & Gallery */}
        <div className="space-y-8">
          <div className="rounded-2xl border border-brand-border bg-[#FAFAFA] px-4 py-3">
            <p className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Section 2: Media & Gallery</p>
            <p className="text-xs text-[#6B5A64] mt-1">Upload and curate product visuals. Select a lead visual for storefronts.</p>
          </div>

          <Card className="border-brand-border shadow-sm">
            <CardContent className="space-y-6 pt-6">
              <div className="bg-[#FAFAFA] text-center p-10 rounded-3xl border-2 border-dashed border-brand-border group hover:bg-[#FCEAF4]/10 transition-colors">
                <ImageUpload multiple value={stagedImages.map((image) => image.file || image.url)} onChange={handleImageSelect} />
              </div>

              {stagedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                  {stagedImages.map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      className={`relative rounded-2xl overflow-hidden border-2 bg-white flex flex-col group transition-all ${
                        image.isMain ? "border-[#A7066A] ring-4 ring-[#A7066A]/10" : "border-brand-border"
                      }`}
                    >
                      <div className="relative aspect-square w-full">
                        <Image src={image.file ? image.previewUrl || "" : image.url} alt={`Preview ${index + 1}`} fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => setStagedImages(stagedImages.filter((_, imageIndex) => imageIndex !== index))}
                          className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-3 space-y-3 bg-white">
                        <label className="flex items-center justify-between cursor-pointer w-full text-[10px] font-black uppercase text-[#1F1720] tracking-tighter">
                          <span className="flex items-center gap-1">
                            <Star className={`w-3 h-3 ${image.isMain ? "fill-[#A7066A] text-[#A7066A]" : "text-gray-300"}`} />
                            Lead Visual
                          </span>
                          <input
                            type="radio"
                            name="mainImageSelection"
                            checked={image.isMain || false}
                            onChange={() => setStagedImages(stagedImages.map((item, itemIndex) => ({ ...item, isMain: itemIndex === index })))}
                            className="accent-[#A7066A]"
                          />
                        </label>
                        <select
                          className="w-full text-[10px] p-1.5 border rounded-lg border-brand-border text-[#6B5A64]"
                          value={image.color || ""}
                          onChange={(event) =>
                            setStagedImages(stagedImages.map((item, itemIndex) => (itemIndex === index ? { ...item, color: event.target.value } : item)))
                          }
                        >
                          <option value="">No Color Tag</option>
                          {colors.map((color) => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>


        {/* Section 3: Classification & Discovery */}
        <div className="space-y-8">
          <div className="rounded-2xl border border-brand-border bg-[#FAFAFA] px-4 py-3">
            <p className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Section 3: Classification & Discovery</p>
            <p className="text-xs text-[#6B5A64] mt-1">Organize your product for easy customer discovery.</p>
          </div>


          <div className="space-y-2">
            <Label required className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Main Category</Label>
            <select
              required
              className="w-full h-12 rounded-xl border border-brand-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A]"
              value={categoryId}
              onChange={(event) => {
                const selectedId = event.target.value;
                setCategoryId(selectedId);
                setWatchedValue("categoryId", selectedId);
              }}
            >
              <option value="" disabled>
                Select Item Type...
              </option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId ? <p className="text-sm text-destructive">{fieldErrors.categoryId}</p> : null}
            {optionsLoading && categoryOptions.length === 0 ? (
              <p className="text-xs text-[#6B5A64]">Loading categories...</p>
            ) : null}
          </div>

          {formMode === "box" ? (
            <Card className="border-[#A7066A]/25 bg-[#FFF8FC] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#1F1720]">📦 Gift Box Configuration</CardTitle>
                <p className="text-xs text-[#6B5A64]">Configure premium placement and included products for this gift box.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1F1720]">Premium Gift Box</p>
                    <p className="text-xs text-[#6B5A64]">Enable this to feature the product in the Premium Gift Boxes home section.</p>
                  </div>
                  <FormField
                    control={control}
                    name="isPremiumGiftBox"
                    render={({ field }) => (
                      <Switch
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                        disabled={isEdit}
                      />
                    )}
                  />
                </div>

                <div className="mt-4 space-y-3">
                  <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Items Included in this Box</Label>
                  <Popover open={giftItemPickerOpen} onOpenChange={setGiftItemPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={giftItemPickerOpen}
                        className="h-12 w-full justify-between border-brand-border"
                      >
                        Search and add products...
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search products..." />
                        <CommandList>
                          <CommandEmpty>No matching products found.</CommandEmpty>
                          <CommandGroup>
                            {selectableGiftItems.map((item) => (
                              <CommandItem
                                key={item.id}
                                value={`${item.name} ${item.category?.name ?? ""}`}
                                onSelect={() => addGiftItem(item)}
                                className="flex items-center justify-between"
                              >
                                <div>
                                  <p className="text-sm font-medium text-[#1F1720]">{item.name}</p>
                                  <p className="text-xs text-[#6B5A64]">
                                    {item.category?.name ?? "Uncategorized"} • {formatPrice(item.price)} • Stock {item.stock}
                                  </p>
                                </div>
                                <Check className="h-4 w-4 text-[#A7066A] opacity-0" />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {selectedGiftItems.length > 0 ? (
                    <div className="space-y-2 rounded-xl border border-brand-border bg-white p-3">
                      {selectedGiftItems.map((entry, index) => (
                        <div key={entry.itemId} className="flex flex-col gap-2 rounded-lg border border-brand-border p-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold text-[#1F1720]">{entry.item?.name || entry.itemId}</p>
                            <div className="flex items-center gap-2 text-xs font-medium">
                              <span className="text-[#A7066A]">{formatPrice(entry.item?.price ?? 0)}</span>
                              <span className="text-[#6B5A64]">/ unit</span>
                              <span className="h-1 w-1 rounded-full bg-[#6B5A64]/30" />
                              <span className={`${(entry.item?.stock ?? 0) > 0 ? "text-green-600" : "text-red-600"}`}>
                                Stock: {entry.item?.stock ?? 0}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(entry.item?.stock ?? 0) < entry.quantity && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="p-1.5 bg-red-50 rounded-lg text-red-600 border border-red-100 cursor-help">
                                      <AlertTriangle className="w-4 h-4" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-red-600 text-white border-none text-xs font-bold">
                                    Insufficient Stock: Need {entry.quantity}, Have {entry.item?.stock ?? 0}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <Label className="text-xs font-semibold uppercase tracking-wide text-[#6B5A64]">Qty</Label>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={entry.quantity}
                              onChange={(event) => updateGiftItemQuantity(entry.itemId, Number(event.target.value))}
                              className="h-9 w-20"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => removeGiftItem(entry.itemId)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}

                      <div className="mt-2 flex items-center justify-between border-t border-brand-border/10 pt-3 px-1">
                        <div>
                          <p className="text-sm font-bold text-[#1F1720]">Total Box Value</p>
                          <p className="text-[10px] text-[#6B5A64] uppercase tracking-wider font-semibold">Sum of included item prices</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-[#A7066A]">
                            {formatPrice(selectedGiftItems.reduce((sum, entry) => sum + ((entry.item?.price ?? 0) * entry.quantity), 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6B5A64]">Add one or more included products for this gift box.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isWebsiteEnabled && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-brand-border bg-[#FAFAFA] p-4">
                <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Occasions</Label>
                <div className="flex flex-wrap gap-2">
                  {occasionOptions.map((occasion) => {
                    const selected = selectedOccasionIds.includes(occasion.id);
                    return (
                      <button
                        key={occasion.id}
                        type="button"
                        onClick={() => toggleOccasion(occasion.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          selected
                            ? "border-[#A7066A] bg-[#FCEAF4] text-[#A7066A]"
                            : "border-brand-border bg-white text-[#3A2B35] hover:border-[#A7066A]/40"
                        }`}
                      >
                        {occasion.name}
                      </button>
                    );
                  })}
                </div>
                {selectedOccasionIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedOccasionIds.map((id) => {
                      const occasion = occasionOptions.find((item) => item.id === id);
                      if (!occasion) return null;

                      return (
                        <Badge key={id} className="bg-brand-surface text-[#1F1720] border-brand-border py-1.5 group">
                          {occasion.name}
                          <X
                            className="w-3 h-3 ml-2 cursor-pointer group-hover:text-red-500"
                            onClick={() => toggleOccasion(id)}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#6B5A64]">Select one or more occasions for this product.</p>
                )}
              </div>

              <div className="space-y-3 rounded-2xl border border-brand-border bg-[#FAFAFA] p-4">
                <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Recipients</Label>
                <div className="flex flex-wrap gap-2">
                  {recipientOptions.map((recipient) => {
                    const selected = selectedRecipientIds.includes(recipient.id);
                    return (
                      <button
                        key={recipient.id}
                        type="button"
                        onClick={() => toggleRecipient(recipient.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          selected
                            ? "border-[#A7066A] bg-[#FCEAF4] text-[#A7066A]"
                            : "border-brand-border bg-white text-[#3A2B35] hover:border-[#A7066A]/40"
                        }`}
                      >
                        {recipient.name}
                      </button>
                    );
                  })}
                </div>
                {selectedRecipientIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipientIds.map((id) => {
                      const recipient = recipientOptions.find((item) => item.id === id);
                      if (!recipient) return null;

                      return (
                        <Badge key={id} className="bg-brand-surface text-[#1F1720] border-brand-border py-1.5 group">
                          {recipient.name}
                          <X
                            className="w-3 h-3 ml-2 cursor-pointer group-hover:text-red-500"
                            onClick={() => toggleRecipient(id)}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#6B5A64]">Select one or more recipient groups for this product.</p>
                )}
              </div>
            </div>
          )}

          {/* 
          <div className="space-y-3">
            <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Mood Selection</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 rounded-xl border border-brand-border bg-[#FAFAFA] p-3">
              {moodOptions.map((mood) => {
                const selected = selectedMoodIds.includes(mood.id);
                return (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => toggleMood(mood.id)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors flex items-center gap-2 ${
                      selected
                        ? "border-[#A7066A] bg-[#FCEAF4] text-[#A7066A]"
                        : "border-brand-border bg-white text-[#3A2B35] hover:border-[#A7066A]/40"
                    }`}
                  >
                    <span className="text-sm leading-none">{mood.icon || "✨"}</span>
                    <span>{mood.name}</span>
                  </button>
                );
              })}
            </div>
            {fieldErrors.moodIds ? <p className="text-sm text-destructive">{fieldErrors.moodIds}</p> : null}
            {selectedMoodIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedMoodIds.map((id) => {
                  const mood = moodOptions.find((item) => item.id === id);
                  if (!mood) return null;

                  return (
                    <Badge key={id} className="bg-brand-surface text-[#1F1720] border-brand-border py-1.5 group">
                      <span className="mr-1">{mood.icon || "✨"}</span>
                      {mood.name}
                      <X
                        className="w-3 h-3 ml-2 cursor-pointer group-hover:text-red-500"
                        onClick={() => toggleMood(id)}
                      />
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#6B5A64]">Tag this product with one or more moods for mood-based shopping.</p>
            )}
          </div>
          */}
        </div>

        {/* Section 4: Pricing & Inventory */}
        <div className="space-y-8">
          <div className="rounded-2xl border border-brand-border bg-[#FAFAFA] px-4 py-3">
            <p className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Section 4: Pricing & Inventory</p>
            <p className="text-xs text-[#6B5A64] mt-1">Base pricing, stock, supplier, and attribute variations.</p>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label required className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Base Price ({currency})</Label>
                {formMode === "box" && selectedGiftItems.length > 0 && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-tighter h-5">Auto-calculated</Badge>
                )}
              </div>
              <Input
                required
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(event) => setPrice(event.target.value ? Number(event.target.value) : "")}
                placeholder="2500.00"
                readOnly={formMode === "box" && selectedGiftItems.length > 0}
                className={cn(
                  "h-12",
                  formMode === "box" && selectedGiftItems.length > 0 && "bg-[#FAFAFA] cursor-not-allowed border-dashed"
                )}
              />
              {fieldErrors.price ? <p className="text-sm text-destructive">{fieldErrors.price}</p> : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label required={formMode !== "box" && variants.length === 0} className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">
                  {formMode === "box" ? "Effective Stock" : "Stock"}
                </Label>
                {formMode === "box" && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-tighter h-5">Auto-calculated</Badge>
                )}
                {formMode !== "box" && variants.length > 0 && (
                  <Badge variant="outline" className="text-[10px] uppercase tracking-tighter h-5">Variant Aggregated</Badge>
                )}
              </div>
              <Input
                required={formMode !== "box" && variants.length === 0}
                type="number"
                min="0"
                step="1"
                value={formMode === "box" ? effectiveStockValue : (variants.length > 0 ? variantTotalStock : stock)}
                onChange={(event) => {
                  if (formMode !== "box" && variants.length === 0) {
                    setStock(event.target.value ? Number(event.target.value) : "");
                  }
                }}
                placeholder="150"
                readOnly={formMode === "box" || variants.length > 0}
                className={cn(
                  "h-12",
                  (formMode === "box" || variants.length > 0) && "bg-[#FAFAFA] cursor-not-allowed border-dashed text-gray-500"
                )}
              />
              {formMode === "box" && (
                <p className="text-[10px] text-[#6B5A64] font-medium leading-tight">
                  Reflects the minimum availability of items included in this box.
                </p>
              )}
              {formMode !== "box" && variants.length > 0 && (
                <p className="text-[10px] text-[#6B5A64] font-medium leading-tight">
                  Automatically calculated as the sum of all variant stock allocations.
                </p>
              )}
              {fieldErrors.stock ? <p className="text-sm text-destructive">{fieldErrors.stock}</p> : null}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Cost Price ({currency})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(event) => setCostPrice(event.target.value ? Number(event.target.value) : "")}
                placeholder="1200.00"
                className="h-12"
              />
              <p className="text-[11px] text-[#6B5A64]">Internal cost price — not shown to customers.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Supplier</Label>
              <FormField
                control={control}
                name="supplierId"
                render={({ field }) => (
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(val) => {
                      const finalVal = val === "__none__" ? "" : val;
                      field.onChange(finalVal);
                      setSupplierId(finalVal);
                    }}
                  >
                    <SelectTrigger className="h-12 w-full border-brand-border">
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {supplierOptions.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-[11px] text-[#6B5A64]">Assign a supplier for inventory tracking.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Supply Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!supplierId}
                    className={`h-12 w-full justify-start text-left font-normal border-brand-border ${
                      !supplyDate ? "text-muted-foreground" : ""
                    } ${!supplierId ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {supplyDate ? format(supplyDate, "dd MMM yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={supplyDate}
                    onSelect={setSupplyDate}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-[11px] text-[#6B5A64]">
                {!supplierId
                  ? "Select a supplier first to enable this field."
                  : "Date this supplier last provided this product."}
              </p>
            </div>
          </div>

          <Card className="border-brand-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-[#1F1720]">Attributes & Variants</CardTitle>
              <p className="text-xs text-[#6B5A64]">Manage size, color, and variant-level pricing/stock combinations.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Size Options</Label>
                  <div className="flex gap-2">
                    <Input
                      value={sizeInput}
                      onChange={(event) => setSizeInput(event.target.value)}
                      placeholder="e.g. XL"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAddItem(sizeInput, setSizeInput, sizes, setSizes);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => handleAddItem(sizeInput, setSizeInput, sizes, setSizes)}>
                      Register
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((sizeValue) => (
                      <Badge key={sizeValue} className="bg-brand-surface text-[#1F1720] hover:bg-red-50 border-brand-border py-1.5 group">
                        {sizeValue}
                        <button type="button" onClick={() => setSizes((prev) => prev.filter((item) => item !== sizeValue))} className="ml-2 text-[#1F1720]/60 hover:text-red-500 focus:outline-none">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Color Palette</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1 flex gap-2">
                      <Input
                        value={colorInput}
                        onChange={(event) => setColorInput(event.target.value)}
                        placeholder="e.g. Midnight Blue"
                        className="flex-1"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddColor();
                          }
                        }}
                      />
                      <div className="relative w-12 h-10 rounded-md overflow-hidden border border-brand-border shrink-0">
                        <input
                          type="color"
                          value={colorHexInput}
                          onChange={(event) => setColorHexInput(event.target.value)}
                          className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                        />
                      </div>
                    </div>
                    <Button type="button" variant="outline" onClick={handleAddColor}>
                      Register
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((colorValue) => {
                      const [cName, cHex] = colorValue.split('|');
                      return (
                        <Badge key={colorValue} className="bg-[#1F1720] text-white py-1.5 px-3 group flex items-center gap-2">
                          {cHex && (
                            <div 
                              className="w-3 h-3 rounded-full border border-white/20 shrink-0 shadow-sm" 
                              style={{ backgroundColor: cHex }} 
                            />
                          )}
                          <span className="font-medium">{cName || colorValue}</span>
                          <button type="button" onClick={() => setColors((prev) => prev.filter((item) => item !== colorValue))} className="ml-1 text-white/60 hover:text-red-400 focus:outline-none shrink-0">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              {variants.length > 0 && (
                <div className="border border-brand-border rounded-2xl overflow-hidden shadow-sm mt-4">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#FAFAFA] border-b border-brand-border">
                      <tr>
                        <th className="px-6 py-4 font-bold text-[#1F1720] uppercase text-[11px] tracking-wider">Combination Path</th>
                        <th className="px-6 py-4 font-bold text-[#1F1720] uppercase text-[11px] tracking-wider w-32">Price Offset</th>
                        <th className="px-6 py-4 font-bold text-[#1F1720] uppercase text-[11px] tracking-wider w-32">Stock Allocation</th>
                        <th className="px-6 py-4 font-bold text-center w-16 text-[#A7066A]">
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {variants.map((variant, index) => (
                        <tr key={`${variant.size}:${variant.color}:${index}`} className="hover:bg-[#FAFAFA]/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-[#6B5A64]">
                            {[variant.size, variant.color ? variant.color.split('|')[0] : ""].filter(Boolean).join(" • ") || "Pure Unit"}
                          </td>
                          <td className="px-6 py-4">
                            <Input
                              type="number"
                              step="0.01"
                              className="h-9 border-brand-border focus:border-[#A7066A]"
                              value={variant.price ?? ""}
                              onChange={(event) => {
                                setVariants((prev) => {
                                  const edited = [...prev];
                                  edited[index] = { ...edited[index], price: event.target.value };
                                  return edited;
                                });
                              }}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <Input
                              type="number"
                              step="1"
                              className="h-9 border-brand-border focus:border-[#A7066A]"
                              value={variant.stock ?? ""}
                              onChange={(event) => {
                                setVariants((prev) => {
                                  const edited = [...prev];
                                  edited[index] = { ...edited[index], stock: event.target.value };
                                  return edited;
                                });
                              }}
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => setRemovedVariants([...removedVariants, `${variant.size}:${variant.color}`])}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 5: Visibility & Marketing Flags */}
        <div className="space-y-8">
          {(isWebsiteEnabled || isDiscountsEnabled) && (
            <div className="rounded-2xl border border-brand-border bg-[#FAFAFA] px-4 py-3">
              <p className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Section 5: Visibility & Marketing</p>
              <p className="text-xs text-[#6B5A64] mt-1">Control storefront visibility, promotions, and merchandising surfaces.</p>
            </div>
          )}

          {isWebsiteEnabled && (
            <Card className="border-[#A7066A]/25 bg-[#FFF8FC] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#1F1720]">Status Toggles & Visibility Flags</CardTitle>
                <p className="text-xs text-[#6B5A64]">
                  Control which homepage and merchandising surfaces this product can appear in.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {isMounted && storefrontOptionsLocked ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                    ⚠️ Add at least one product image to enable marketing and visibility flags.
                  </p>
                ) : null}
                <div className={cn(
                  "grid grid-cols-1 gap-4 md:grid-cols-2",
                  !isMounted && "opacity-0"
                )}>
                  <FormField
                    control={control}
                    name="isNewArrival"
                    render={({ field }) => (
                      <div className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1F1720]">New Arrival</p>
                          <p className="text-xs text-[#6B5A64]">Show in the new arrivals section</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <SwitchStateLabel checked={field.value} disabled={storefrontOptionsLocked} />
                          <Switch
                            checked={!!field.value}
                            onCheckedChange={field.onChange}
                            disabled={storefrontOptionsLocked}
                          />
                        </div>
                      </div>
                    )}
                  />
                  <FormField
                    control={control}
                    name="isTrending"
                    render={({ field }) => (
                      <div className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1F1720]">Trending</p>
                          <p className="text-xs text-[#6B5A64]">Show in trending sections</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <SwitchStateLabel checked={field.value} disabled={storefrontOptionsLocked} />
                          <Switch
                            checked={!!field.value}
                            onCheckedChange={field.onChange}
                            disabled={storefrontOptionsLocked}
                          />
                        </div>
                      </div>
                    )}
                  />
                  <FormField
                    control={control}
                    name="isBestSeller"
                    render={({ field }) => (
                      <div className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1F1720]">Best Seller</p>
                          <p className="text-xs text-[#6B5A64]">Show in bestseller modules</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <SwitchStateLabel checked={field.value} disabled={storefrontOptionsLocked} />
                          <Switch
                            checked={!!field.value}
                            onCheckedChange={field.onChange}
                            disabled={storefrontOptionsLocked}
                          />
                        </div>
                      </div>
                    )}
                  />
                  <FormField
                    control={control}
                    name="isTopRated"
                    render={({ field }) => (
                      <div className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1F1720]">Top Rated</p>
                          <p className="text-xs text-[#6B5A64]">Show in highly-rated lists</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <SwitchStateLabel checked={field.value} disabled={storefrontOptionsLocked} />
                          <Switch
                            checked={!!field.value}
                            onCheckedChange={field.onChange}
                            disabled={storefrontOptionsLocked}
                          />
                        </div>
                      </div>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {isDiscountsEnabled && (
            <Card className="border-[#A7066A]/25 bg-[#FFF8FC] shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#1F1720]">Promotions & Discount Options</h4>
                  <p className="text-xs text-[#6B5A64]">Apply a discount and control its visibility on the storefront.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-[#6B5A64] uppercase tracking-wider">Apply Promotion/Discount (Optional)</Label>
                    <select
                      className="w-full h-12 rounded-xl border border-brand-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A]"
                      value={selectedDiscountId}
                      onChange={(event) => {
                        const val = event.target.value;
                        setSelectedDiscountId(val);
                        setWatchedValue("discountId", val || null);
                      }}
                    >
                      <option value="">None</option>
                      {discountOptions.map((disc) => (
                        <option key={disc.id} value={disc.id}>
                          {disc.name} ({disc.type === "PERCENTAGE" ? `${disc.value}% Off` : `${formatPrice(disc.value)} Off`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-4 rounded-xl border border-brand-border/50 bg-[#F9F9FB]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6B5A64]">Discount Preview</p>
                    <p className="mt-1 text-xs text-[#6B5A64]">Base Price: {typeof price === "number" ? formatPrice(price) : "-"}</p>
                    <p className="mt-1 text-xs text-[#E11D48]">
                      Discount Amount: {selectedDiscount && typeof price === "number"
                        ? selectedDiscount.type === "FIXED"
                          ? formatPrice(Math.min(price, selectedDiscount.value))
                          : formatPrice((price * Math.min(Math.max(selectedDiscount.value, 0), 100)) / 100)
                        : "-"}
                    </p>
                    <p className="mt-1 text-lg font-bold text-[#16A34A]">
                      Final Sale Price: {computedSalePrice !== null ? formatPrice(computedSalePrice) : "-"}
                    </p>
                  </div>
                </div>

                <FormField
                  control={control}
                  name="showInDiscountSection"
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1F1720]">Show in Discount Section</p>
                        <p className="text-xs text-[#6B5A64]">
                          {isMounted && discountSwitchDisabled && !storefrontOptionsLocked
                            ? "Select a promotion/discount above to enable this option."
                            : "Feature this product in discount-driven storefront modules."}
                        </p>
                        {fieldErrors.showInDiscountSection ? <p className="text-xs text-destructive mt-1">{fieldErrors.showInDiscountSection}</p> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <SwitchStateLabel checked={field.value} disabled={isMounted && discountSwitchDisabled} />
                        <Switch
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                          disabled={isMounted && discountSwitchDisabled}
                        />
                      </div>
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {isWebsiteEnabled && (
            <Card className="border-[#F2D8B6] bg-[#FFFDF8] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#1F1720]">CART & UPSELL FLAGS</CardTitle>
                <p className="text-xs text-[#6B5A64]">
                  Control which products can surface as a cart drawer upsell and how they are ordered.
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-3">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-[#1F1720]">Special Touch Upsell</p>
                    <p className="text-xs text-[#6B5A64]">Feature this product inside the cart drawer add-on rail.</p>
                  </div>
                  <FormField
                    control={control}
                    name="isSpecialTouch"
                    render={({ field }) => (
                      <Switch
                        checked={!!field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2 rounded-xl border border-brand-border bg-white p-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-[#6B5A64]">Display Priority</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={specialTouchOrder}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setSpecialTouchOrder(nextValue === "" ? "" : Number(nextValue));
                    }}
                    className="h-11"
                  />
                  <p className="text-[11px] text-[#6B5A64]">Lower numbers are shown first in the cart drawer.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>


        <div className="flex items-center justify-end gap-4 w-full pt-6 border-t border-gray-100 mt-6">
          <Button type="button" variant="ghost" className="text-[#6B5A64]" onClick={() => router.push(`/admin/products`)}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#A7066A] hover:bg-[#8A0558] text-white px-12 h-14 rounded-2xl shadow-xl shadow-[#A7066A]/20 transition-all hover:scale-105 active:scale-95 text-lg font-bold"
          >
            {loading ? <RefreshCw className="w-5 h-5 mr-3 animate-spin" /> : <Tag className="w-5 h-5 mr-3" />}
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Publish Product to Store"}
          </Button>
        </div>
          </form>
        </div>
      </div>

      {/* Right Column: Live Preview Sticky Sidebar */}
      <div className="hidden lg:block w-80 h-full overflow-y-auto border-l border-gray-200 bg-white p-4 shrink-0 custom-scrollbar">
        <div className="space-y-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#1F1720]">Storefront Preview</h2>
            <p className="text-sm text-[#6B5A64]">Real-time look at how customers will see this product.</p>
          </div>

          <ProductPreview
            name={name}
            price={Number(price) || 0}
            salePrice={computedSalePrice}
            sku={sku}
            stock={effectiveStockValue}
            description={description}
            images={stagedImages}
            categoryName={selectedCategory?.name}
            isNew={isNewArrival}
            isTrending={isTrending}
            isBestSeller={isBestSeller}
            hasDiscount={hasValidDiscount}
            discountPercentage={discountPercentage}
            isOutOfStock={isEffectivelyOutOfStock || (formMode !== "box" && stock !== "" && Number(stock) <= 0)}
            isGiftBox={formMode === "box"}
            includedItems={selectedGiftItems}
          />

          <div className="p-4 bg-[#FAFAFA] rounded-2xl border border-brand-border/50">
            <p className="text-[11px] font-bold text-[#A7066A] uppercase tracking-wider mb-2">Live Status</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B5A64]">Listing Visibility</span>
                <Badge variant={isEffectivelyOutOfStock ? "destructive" : "outline"} className="h-5 text-[9px]">
                  {isEffectivelyOutOfStock ? "Hidden" : "Public"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B5A64]">Promotion Status</span>
                <span className="font-semibold text-[#1F1720]">{hasValidDiscount ? `${discountPercentage}% OFF` : "Standard Price"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductPreview({
  name,
  price,
  salePrice,
  sku,
  stock,
  description,
  images,
  categoryName,
  isNew,
  isTrending,
  isBestSeller,
  hasDiscount,
  discountPercentage,
  isOutOfStock,
  isGiftBox,
  includedItems = []
}: any) {
  const { formatPrice } = useCurrency();
  const displayPrice = salePrice || price || 0;
  const originalPrice = salePrice ? price : null;

  const mainImage = images[0]?.previewUrl || images[0]?.url || "/logo/logo.png";

  return (
    <div className="bg-white rounded-[32px] border border-brand-border overflow-hidden shadow-2xl shadow-[#A7066A]/5 transition-all duration-500 hover:shadow-3xl">
      {/* Image Section */}
      <div className="relative aspect-square bg-[#FCEAF4] overflow-hidden group">
        <img
          src={mainImage}
          alt={name || "Product Preview"}
          className={cn(
            "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
            isOutOfStock && "opacity-60"
          )}
        />

        {/* Badges Overlay */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {isOutOfStock && (
            <Badge variant="destructive" className="bg-red-500 text-white border-0 shadow-lg px-3 py-1 animate-pulse">
              Out of Stock
            </Badge>
          )}
          {hasDiscount && !isOutOfStock && (
            <Badge className="bg-[#FF4757] text-white border-0 shadow-lg px-3 py-1">
              -{discountPercentage}% OFF
            </Badge>
          )}
          {isNew && !isOutOfStock && (
            <Badge className="bg-[#A7066A] text-white border-0 shadow-lg px-3 py-1">
              New Arrival
            </Badge>
          )}
          {isTrending && !isOutOfStock && (
            <Badge className="bg-[#F78C2D] text-white border-0 shadow-lg px-3 py-1">
              Trending
            </Badge>
          )}
        </div>

        {!isOutOfStock && isBestSeller && (
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-brand-border/50">
              <Star className="w-4 h-4 text-[#FFD700] fill-[#FFD700]" />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        {/* Header Section */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#A7066A] uppercase tracking-[0.2em]">
            {categoryName || "Uncategorized"}
          </span>
          <h3 className="text-xl font-bold text-[#1F1720] leading-tight line-clamp-2">
            {name || "Product Name"}
          </h3>
        </div>

        {/* Meta Section */}
        <div className="flex items-center gap-3 text-xs font-medium text-[#6B5A64]">
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            <span>SKU: {sku || "---"}</span>
          </div>
          <div className="w-px h-3 bg-brand-border/50" />
          <div className="flex items-center gap-1.5">
            <Package className={cn("w-3.5 h-3.5", isOutOfStock ? "text-red-500" : "text-green-500")} />
            <span className={isOutOfStock ? "text-red-500" : ""}>
              {isOutOfStock ? "Out of Stock" : `In Stock: ${stock}`}
            </span>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-black text-[#A7066A]">
            {formatPrice(displayPrice)}
          </span>
          {originalPrice && (
            <span className="text-sm text-[#6B5A64] line-through decoration-[#A7066A]/30">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>

        {/* Box Contents Section (Conditional) */}
        {isGiftBox && includedItems.length > 0 && (
          <div className="pt-4 border-t border-brand-border/50 animate-in fade-in slide-in-from-top-2 duration-500">
            <p className="text-xs font-bold text-[#1F1720] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-[#A7066A]" />
              What's inside:
            </p>
            <ul className="space-y-2">
              {includedItems.map((entry: any, idx: number) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-[#6B5A64] bg-[#FAFAFA] p-2 rounded-xl border border-brand-border/30">
                  <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-white flex items-center justify-center font-bold text-[10px] text-[#A7066A] border border-brand-border/50">
                    {entry.quantity}x
                  </span>
                  <span className="line-clamp-1">{entry.item?.name || "Included Item"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Placeholder */}
        <div className="pt-4 flex items-center justify-between">
          <div className="flex -space-x-2">
             <div className="w-8 h-8 rounded-full border-2 border-white bg-[#FCEAF4] flex items-center justify-center">
               <ShoppingCart className="w-4 h-4 text-[#A7066A]" />
             </div>
             <div className="w-8 h-8 rounded-full border-2 border-white bg-[#FCEAF4] flex items-center justify-center">
               <Star className="w-4 h-4 text-[#A7066A]" />
             </div>
          </div>
          <div className="text-[10px] font-bold text-[#A7066A] uppercase flex items-center gap-1 group-hover:gap-2 transition-all">
            View Details 
            <RefreshCw className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
