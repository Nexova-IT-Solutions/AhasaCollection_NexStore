"use client";

import { useState, useEffect, useRef } from "react";
import { version } from "../../../package.json";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { 
  Search, 
  ShoppingCart, 
  Menu, 
  Gift, 
  ChevronDown,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCartStore } from "@/store";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type CatData = { id: string; name: string; slug: string; image?: string; children?: CatData[] };

let cachedCategories: CatData[] | null = null;
let categoriesRequest: Promise<CatData[]> | null = null;

async function fetchCategoriesOnce(): Promise<CatData[]> {
  if (cachedCategories) return cachedCategories;
  if (!categoriesRequest) {
    categoriesRequest = fetch("/api/categories")
      .then((response) => response.json())
      .then((data) => {
        const resolved = Array.isArray(data) ? (data as CatData[]) : [];
        cachedCategories = resolved;
        return resolved;
      })
      .catch((error) => {
        categoriesRequest = null;
        throw error;
      });
  }
  return categoriesRequest;
}

const navigation = [
  { name: "Categories", href: "#categories", hasDropdown: true },
  { name: "Build Your Box", href: "/box-builder", icon: Sparkles, highlight: true },
];

export function Header() {
  const t = useTranslations("Navigation");
  const router = useRouter();
  const pathname = usePathname();

  const { data: toggles } = useSWR<Record<string, boolean>>("/api/admin/feature-toggles", fetcher);
  const isWebsiteEnabled = toggles?.storefront_website_enabled !== false;
  const isGiftboxesAvailable = toggles?.giftboxes_available !== false;
  const isGiftcardsEnabled = toggles?.storefront_giftcards !== false;

  useEffect(() => {
    if (toggles && toggles.storefront_website_enabled === false) {
      const isAuthPage = pathname.includes("/sign-in") || pathname.includes("/sign-up") || pathname.includes("/auth");
      if (!isAuthPage) {
        router.push("/sign-in");
      }
    }
  }, [toggles, pathname, router]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [categories, setCategories] = useState<CatData[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const { data: session, status } = useSession();
  const { openCart, getItemCount, getSubtotal, clearCart, syncPrices, items } = useCartStore();
  const itemCount = getItemCount();
  const subtotal = getSubtotal();
  const isCustomer = session?.user?.role === "USER";
  const isStaff = Boolean(session?.user?.role) && !isCustomer;
  const previousUserIdRef = useRef<string | null>(null);

  // REMOVED: clearPersistedCartStorage — calling localStorage.removeItem()
  // directly was bypassing Zustand's persist middleware, causing items to
  // disappear on refresh. clearCart() already writes { items: [] } to
  // localStorage via the persist serialiser.

  const displayItemCount = itemCount;
  const displaySubtotal = subtotal;
  const formattedCartTotal = `LKR ${displaySubtotal.toLocaleString()}`;

  useEffect(() => {
    setMounted(true);
    setIsCategoriesLoading(true);

    fetchCategoriesOnce()
      .then((items) => setCategories(items))
      .catch((error) => {
        console.error(error);
        setCategories([]);
      })
      .finally(() => {
        setIsCategoriesLoading(false);
      });

    // Global Cart Sync on Load
    const syncCartOnMount = async () => {
      // Small delay to ensure hydrator has finished or to avoid initial race
      if (items.length === 0) return;
      try {
        const payload = items.map(item => ({
          id: item.product?.id || item.giftBox?.id || item.id,
          type: item.type
        }));

        const res = await fetch("/api/v1/cart/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: payload })
        });

        if (res.ok) {
          const { data } = await res.json();
          syncPrices(data);
        }
      } catch (error) {
        console.error("Global cart sync error:", error);
      }
    };

    syncCartOnMount();
  }, [items.length, syncPrices]);

  useEffect(() => {
    if (status === "loading") return;

    const currentUserId = session?.user?.id ?? null;
    const previousUserId = previousUserIdRef.current;

    // Only clear if transitioning from one user to another entirely different user
    if (previousUserId && currentUserId && previousUserId !== currentUserId) {
      clearCart();
    }

    if (currentUserId) {
      previousUserIdRef.current = currentUserId;
    }
  }, [clearCart, session?.user?.id, status]);

  const handleLogout = async () => {
    clearCart();

    if (typeof window !== "undefined") {
      window.sessionStorage.clear();
    }

    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-brand-border shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <div className="relative group-hover:scale-105 transition-transform flex items-center">
              <Image 
                src="/logo/logo.png" 
                alt="SPC Logo" 
                width={113}
                height={32}
                className="object-contain"
                priority
              />
              <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md border border-gray-200 ml-2 self-center select-none">v{version}</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {isWebsiteEnabled && (
            <nav className="hidden lg:flex items-center gap-1">
              <Link href="/" prefetch={true} className="px-3 py-2 text-[#1F1720] hover:text-[#A7066A] transition-colors rounded-lg hover:bg-[#FCEAF4] font-medium text-sm">
                {t("home")}
              </Link>

            {/* Categories Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setOpenDropdown("categories")}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link href="/categories" prefetch={true} className="flex items-center gap-1 px-3 py-2 text-[#1F1720] hover:text-[#A7066A] transition-colors rounded-lg hover:bg-[#FCEAF4] font-medium text-sm">
                {t("categories")}
                <ChevronDown className="w-4 h-4" />
              </Link>
              {openDropdown === "categories" && (
                <div className="absolute top-full left-0 w-64 bg-white border border-brand-border rounded-xl shadow-lg p-2 animate-fade-in max-h-[80vh] overflow-y-visible z-50">
                  {isCategoriesLoading ? (
                    <div className="space-y-2 p-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-10 rounded-lg bg-[#F3EDF1] animate-pulse" />
                      ))}
                    </div>
                  ) : categories.length > 0 ? categories.map((category) => (
                    <div key={category.id} className="relative group">
                      <Link
                        href={`/categories?categories=${category.slug}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-[#FCEAF4] transition-colors"
                      >
                        <span className="font-medium text-[#1F1720]">{category.name}</span>
                        {category.children && category.children.length > 0 && (
                          <ChevronRight className="w-4 h-4 text-[#6B5A64]" />
                        )}
                      </Link>
                      
                      {/* Subcategories Flyout */}
                      {category.children && category.children.length > 0 && (
                        <div className="absolute top-0 left-full ml-1 w-56 bg-white border border-brand-border rounded-xl shadow-xl p-2 invisible opacity-0 translate-x-2 group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 transition-all z-50">
                          {category.children.map(sub => (
                            <Link 
                              key={sub.id} 
                              href={`/categories?categories=${sub.slug}`} 
                              className="block p-2.5 rounded-lg hover:bg-[#FCEAF4] transition-colors text-sm font-medium text-[#6B5A64] hover:text-[#A7066A]"
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="p-4 text-center text-sm text-gray-500">{t("noCategoriesFound")}</div>
                  )}
                </div>
              )}
            </div>

            {isGiftboxesAvailable && (
              <Link href="/categories?categories=gift-boxes" prefetch={true} className="px-3 py-2 text-[#1F1720] hover:text-[#A7066A] transition-colors rounded-lg hover:bg-[#FCEAF4] font-medium text-sm">
                {t("giftBoxes")}
              </Link>
            )}
            
            {isGiftcardsEnabled && (
              <Link href="/gift-card" prefetch={true} className="px-3 py-2 text-[#1F1720] hover:text-[#A7066A] transition-colors rounded-lg hover:bg-[#FCEAF4] font-medium text-sm">
                {t("giftCard")}
              </Link>
            )}
            
            <Link href="/contact" prefetch={true} className="px-3 py-2 text-[#1F1720] hover:text-[#A7066A] transition-colors rounded-lg hover:bg-[#FCEAF4] font-medium text-sm">
              {t("contact")}
            </Link>

              {/* Build Your Box */}
              {isGiftboxesAvailable && (
                <Link
                  href="/box-builder"
                  className="flex items-center gap-2 ml-1 px-4 py-2 bg-gradient-to-r from-[#A7066A] to-[#E91E8C] text-white rounded-full hover:shadow-lg transition-all text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  {t("boxBuilder")}
                </Link>
              )}
            </nav>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Desktop Auth */}
            <div className="hidden lg:flex items-center gap-2 mr-2 min-h-10">
              {status === "loading" ? (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                  <div className="hidden sm:block">
                    <div className="h-4 w-24 rounded bg-gray-200 animate-pulse mb-1" />
                    <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
                  </div>
                </div>
              ) : session ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-opacity-80 p-0 overflow-hidden">
                      {session.user?.image ? (
                        <Image
                          src={session.user.image}
                          alt={session.user?.name || "Profile"}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover rounded-full"
                          priority
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-[#A7066A] text-white text-lg font-semibold">
                          {session.user?.name?.charAt(0)?.toUpperCase() || session.user?.email?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{session.user?.name || "User"}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session.user?.email}
                        </p>
                        {(session.user?.role === "SUPER_ADMIN" || session.user?.role === "DEV_ADMIN") && (
                          <Badge className="mt-2 w-fit bg-[#A7066A] hover:bg-[#8A0558]">Super Admin</Badge>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {isStaff && (
                      <DropdownMenuItem asChild>
                        <a href="/admin" className="w-full cursor-pointer hover:text-[#A7066A] font-medium">
                          {t("adminPanel")}
                        </a>
                      </DropdownMenuItem>
                    )}
                    {isCustomer && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/profile" className="w-full cursor-pointer hover:text-[#A7066A] font-medium">
                            {t("viewProfile")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/profile/orders" className="w-full cursor-pointer hover:text-[#A7066A] font-medium">
                            {t("orderDetails")}
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                      onClick={() => {
                        void handleLogout();
                      }}
                    >
                      {t("signOut")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link href="/sign-in" className="px-4 py-2 text-[#1F1720] hover:text-[#A7066A] font-medium text-sm transition-colors">
                    {t("signIn")}
                  </Link>
                  {isWebsiteEnabled && (
                    <Link href="/sign-up" className="px-4 py-2 bg-[#1F1720] text-white hover:bg-[#A7066A] rounded-full font-medium text-sm transition-colors">
                      {t("signUp")}
                    </Link>
                  )}
                </>
              )}
            </div>

            <div className="flex h-10 items-center shrink-0">
              <LanguageSwitcher />
            </div>

            {/* Search Button */}
            {isWebsiteEnabled && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-10 w-10 sm:flex items-center justify-center hover:bg-[#FCEAF4]"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              >
                <Search className="w-5 h-5 text-[#6B5A64]" />
              </Button>
            )}

            {/* Cart Button */}
            {isWebsiteEnabled && (
              <Button
                variant="ghost"
                className="relative h-10 rounded-full border border-brand-border/60 bg-[#F7F7FA] px-3 hover:bg-[#FCEAF4]"
                onClick={openCart}
              >
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-[#6B5A64]" />
                  {mounted && displayItemCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-[#A7066A] text-white text-xs">
                        {displayItemCount}
                      </Badge>
                    )}
                  </div>

                  <span className="whitespace-nowrap text-sm font-medium leading-none text-[#A7066A]">
                    {mounted ? formattedCartTotal : "LKR 0"}
                  </span>
                </div>
              </Button>
            )}

            {/* Mobile Menu */}
            {isWebsiteEnabled && (
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen} modal={false}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-hidden={isMobileMenuOpen}
                    className={cn(
                      "lg:hidden hover:bg-[#FCEAF4] transition-opacity duration-200",
                      isMobileMenuOpen && "opacity-0 pointer-events-none"
                    )}
                  >
                    <Menu className="w-5 h-5 text-[#6B5A64]" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <MobileNav onClose={() => setIsMobileMenuOpen(false)} isGiftboxesAvailable={isGiftboxesAvailable} />
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>

        {/* Search Bar (Expandable) */}
        {isSearchOpen && (
          <div className="pb-4 animate-slide-up">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B5A64]" />
              <Input
                placeholder={t("searchPlaceholder")}
                className="pl-10 h-12 border-brand-border focus:border-[#A7066A] focus:ring-[#A7066A]"
                autoFocus
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function MobileNav({ onClose, isGiftboxesAvailable }: { onClose: () => void; isGiftboxesAvailable?: boolean }) {
  const t = useTranslations("Navigation");
  const { getItemCount } = useCartStore();
  const { data: session, status } = useSession();
  const isCustomer = session?.user?.role === "USER";
  const isStaff = Boolean(session?.user?.role) && !isCustomer;
  
  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col">
        {/* Navigation Links */}
        <div className="space-y-1 mb-6">
          <Link href="/" onClick={onClose} className="block px-4 py-3 text-[#1F1720] font-medium rounded-xl hover:bg-[#FCEAF4] transition-colors">{t("home")}</Link>
          <Link href="/categories" prefetch={true} onClick={onClose} className="block px-4 py-3 text-[#1F1720] font-medium rounded-xl hover:bg-[#FCEAF4] transition-colors">{t("categories")}</Link>
          {isGiftboxesAvailable !== false && (
            <Link href="/categories?categories=gift-boxes" prefetch={true} onClick={onClose} className="block px-4 py-3 text-[#1F1720] font-medium rounded-xl hover:bg-[#FCEAF4] transition-colors">{t("giftBoxes")}</Link>
          )}
          {isGiftcardsEnabled && (
            <Link href="/gift-card" prefetch={true} onClick={onClose} className="block px-4 py-3 text-[#1F1720] font-medium rounded-xl hover:bg-[#FCEAF4] transition-colors">{t("giftCard")}</Link>
          )}
          <Link href="/contact" prefetch={true} onClick={onClose} className="block px-4 py-3 text-[#1F1720] font-medium rounded-xl hover:bg-[#FCEAF4] transition-colors">{t("contact")}</Link>
        </div>

        {/* Build Your Box CTA */}
        {isGiftboxesAvailable !== false && (
          <Link
            href="/box-builder"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full p-4 mb-6 bg-gradient-to-r from-[#A7066A] to-[#E91E8C] text-white rounded-2xl font-semibold shrink-0"
          >
            <Sparkles className="w-5 h-5" />
            {t("boxBuilder")}
          </Link>
        )}

        {/* Auth Links */}
        <div className="mt-auto pt-6 border-t border-gray-100 flex flex-col gap-3 min-h-16 shrink-0">
          {status === "loading" ? (
             <div className="space-y-3">
               <div className="h-10 w-full bg-gray-200 animate-pulse rounded-lg" />
               <div className="h-10 w-full bg-gray-100 animate-pulse rounded-lg" />
             </div>
          ) : session ? (
            <div className="bg-[#FCEAF4]/50 p-4 rounded-xl border border-brand-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A7066A] text-white font-medium">
                  {session.user?.name?.charAt(0)?.toUpperCase() || session.user?.email?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#1F1720] truncate">{session.user?.name || "User"}</p>
                  <p className="text-xs text-[#6B5A64] truncate">{session.user?.email}</p>
                  {(session.user?.role === "SUPER_ADMIN" || session.user?.role === "DEV_ADMIN") && (
                    <Badge className="mt-1 bg-[#A7066A] text-[10px] h-4">Super Admin</Badge>
                  )}
                </div>
              </div>

              {isStaff && (
                <a 
                  href="/admin" 
                  onClick={onClose} 
                  className="flex w-full items-center justify-center p-2 mb-3 bg-white text-[#A7066A] border border-[#A7066A]/20 rounded-lg text-sm font-semibold hover:bg-[#FCEAF4] transition-colors"
                >
                  {t("adminPanel")}
                </a>
              )}

              {isCustomer && (
                <div className="space-y-2 mb-3">
                  <Link 
                    href="/profile" 
                    onClick={onClose} 
                    className="flex w-full items-center justify-center p-2 bg-white text-[#A7066A] border border-[#A7066A]/20 rounded-lg text-sm font-semibold hover:bg-[#FCEAF4] transition-colors"
                  >
                    {t("viewProfile")}
                  </Link>
                  <Link 
                    href="/profile/orders" 
                    onClick={onClose} 
                    className="flex w-full items-center justify-center p-2 bg-white text-[#A7066A] border border-[#A7066A]/20 rounded-lg text-sm font-semibold hover:bg-[#FCEAF4] transition-colors"
                  >
                    {t("orderDetails")}
                  </Link>
                </div>
              )}

              <Button 
                variant="outline" 
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                onClick={() => {
                  void handleLogout();
                  onClose();
                }}
              >
                {t("signOut")}
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                href="/sign-in"
                onClick={onClose}
                className="flex-1 flex items-center justify-center p-3 text-[#1F1720] border border-brand-border rounded-xl font-semibold hover:bg-[#FCEAF4] transition-colors"
              >
                {t("signIn")}
              </Link>
              <Link
                href="/sign-up"
                onClick={onClose}
                className="flex-1 flex items-center justify-center p-3 bg-[#1F1720] text-white rounded-xl font-semibold hover:bg-[#A7066A] transition-colors"
              >
                {t("signUp")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
