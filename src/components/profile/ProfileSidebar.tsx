"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  MapPin, 
  CreditCard, 
  Settings, 
  LogOut,
  User
} from "lucide-react";
import { signOut } from "next-auth/react";
import { buttonVariants } from "@/components/ui/button";

export function ProfileSidebar() {
  const pathname = usePathname();
  const t = useTranslations("Profile");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Helper to check if a link is active
  const isActive = (href: string) => {
    if (!mounted) return false;
    return pathname.endsWith(href);
  };

  const navItems = [
    {
      title: t("dashboard"),
      href: "/profile",
      icon: LayoutDashboard,
    },
    {
      title: t("orders"),
      href: "/profile/orders",
      icon: ShoppingBag,
    },
    {
      title: t("addresses"),
      href: "/profile/addresses",
      icon: MapPin,
    },
    {
      title: t("billing"),
      href: "/profile/billing",
      icon: CreditCard,
    },
    {
      title: t("settings"),
      href: "/profile/settings",
      icon: Settings,
    },
  ];

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }

    await signOut();
  };

  return (
    <aside className="w-full lg:w-64 flex flex-col gap-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-[#A7066A]/5 to-[#E91E8C]/5 border-b border-gray-50 text-center">
          <div className="w-20 h-20 bg-white rounded-full mx-auto mb-3 flex items-center justify-center shadow-sm border-4 border-white">
            <User className="w-10 h-10 text-[#A7066A]" />
          </div>
          <h3 className="font-bold text-gray-900 leading-tight">My Account</h3>
        </div>
        
        <nav className="p-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group text-sm font-medium",
                    isActive(item.href)
                      ? "bg-[#A7066A] text-white shadow-md shadow-[#A7066A]/20"
                      : "text-gray-600 hover:bg-[#FCEAF4] hover:text-[#A7066A]"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5",
                    isActive(item.href) ? "text-white" : "text-gray-400 group-hover:text-[#A7066A]"
                  )} />
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
          
          <div className="mt-4 pt-4 border-t border-gray-50 px-4 pb-2">
            <button
              onClick={() => {
                void handleLogout();
              }}
              className="flex items-center gap-3 w-full py-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              {t("logout")}
            </button>
          </div>
        </nav>
      </div>
      
      {/* Promotion or Support Card could go here */}
      <div className="bg-gradient-to-r from-[#A7066A] to-[#E91E8C] rounded-3xl p-6 text-white text-center">
        <p className="text-sm font-medium opacity-90 mb-2">Need help?</p>
        <p className="text-xs mb-4 opacity-75">Our support team is always here for you.</p>
        <Link 
          href="/contact" 
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full rounded-full bg-white text-[#A7066A] border-none hover:bg-white/90")}
        >
          Contact Support
        </Link>
      </div>
    </aside>
  );
}
