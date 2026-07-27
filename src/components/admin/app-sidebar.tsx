"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Package,
  Tags,
  Sparkles,
  Gift,
  Percent,
  ShoppingCart,
  Image as ImageIcon,
  Users,
  Settings,
  CreditCard,
  Truck,
  Building2,
  AlertTriangle,
  LayoutGrid,
  ChevronRight,
  Star,
  MonitorSmartphone,
  RefreshCcw,
  BarChart3,
  Wallet,
  PackageX,
  ArrowRightLeft,
  ClipboardCheck,
  PieChart,
  Smile,
  Heart,
  Banknote,
  Box,
  Database,
} from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import * as Collapsible from "@radix-ui/react-collapsible"
import { useSession } from "next-auth/react"
import useSWR from "swr"
import { hasPermission } from "@/lib/permissions"

type NavItem = {
  title: string
  url?: string
  icon: React.ComponentType<any>
  requiredPermission: string
  children?: NavItem[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Sidebar Groups & Items Map - Hardcoded strictly in English
const overviewItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutGrid,
    requiredPermission: "",
  },
]

const catalogItems: NavItem[] = [
  {
    title: "Products",
    url: "/admin/products",
    icon: Package,
    requiredPermission: "catalog.manage_products",
  },
  {
    title: "Categories",
    url: "/admin/categories",
    icon: Tags,
    requiredPermission: "catalog.manage_categories",
  },
]

const salesPosItems: NavItem[] = [
  {
    title: "Orders",
    url: "/admin/orders",
    icon: ShoppingCart,
    requiredPermission: "pos.manage_orders",
  },
  {
    title: "POS Terminal",
    url: "/admin/pos",
    icon: MonitorSmartphone,
    requiredPermission: "pos.terminal_access",
  },
  {
    title: "Denominations",
    url: "/admin/pos/denominations",
    icon: Banknote,
    requiredPermission: "pos.shift_manage",
  },
]

const storefrontItems: NavItem[] = [
  {
    title: "Promo Banners",
    url: "/admin/banners",
    icon: ImageIcon,
    requiredPermission: "catalog.manage_categories",
  },
  {
    title: "Occasions",
    url: "/admin/occasions",
    icon: Gift,
    requiredPermission: "catalog.manage_categories",
  },
  {
    title: "Recipients",
    url: "/admin/recipients",
    icon: Heart,
    requiredPermission: "catalog.manage_categories",
  },
  {
    title: "Discount",
    url: "/admin/discounts",
    icon: Percent,
    requiredPermission: "catalog.manage_products",
  },
  {
    title: "Gift Cards",
    url: "/admin/gift-cards",
    icon: CreditCard,
    requiredPermission: "catalog.manage_categories",
  },
  {
    title: "Gift Wrapping",
    url: "/admin/settings/wrappings",
    icon: Box,
    requiredPermission: "catalog.manage_categories",
  },
]

const operationsItems: NavItem[] = [
  {
    title: "Reviews",
    url: "/admin/reviews",
    icon: Star,
    requiredPermission: "catalog.manage_products",
  },
  {
    title: "Returns",
    url: "/admin/returns",
    icon: ArrowRightLeft,
    requiredPermission: "pos.manage_returns",
  },
  {
    title: "Suppliers",
    url: "/admin/suppliers",
    icon: Building2,
    requiredPermission: "catalog.manage_inventory",
  },
  {
    title: "Shipping",
    url: "/admin/settings/shipping",
    icon: Truck,
    requiredPermission: "system.manage_templates",
  },
]

const reportItems: NavItem[] = [
  {
    title: "Financial Reports",
    icon: BarChart3,
    requiredPermission: "",
    children: [
      {
        title: "Sales Summary",
        url: "/admin/reports/sales-summary",
        icon: BarChart3,
        requiredPermission: "reports.sales_summary",
      },
      {
        title: "Cash Close (EOD)",
        url: "/admin/reports/cash-close",
        icon: Banknote,
        requiredPermission: "reports.cash_close",
      },
      {
        title: "Schedule Reports",
        url: "/admin/reports/schedule",
        icon: BarChart3,
        requiredPermission: "SYSTEM_DEV_ONLY",
      },
      {
        title: "Accounts Receivable",
        url: "/admin/reports/accounts-receivable",
        icon: Banknote,
        requiredPermission: "reports.accounts_receivable",
      },
    ],
  },
  {
    title: "Inventory Analytics",
    icon: Sparkles,
    requiredPermission: "",
    children: [
      {
        title: "Stock Drill-down",
        url: "/admin/reports/inventory/drilldown",
        icon: Package,
        requiredPermission: "reports.stock_audit",
      },
      {
        title: "Out of Stock Items",
        url: "/admin/reports/out-of-stock",
        icon: PackageX,
        requiredPermission: "reports.out_of_stock",
      },
      {
        title: "Item Movement",
        url: "/admin/reports/inventory/movement",
        icon: ShoppingCart,
        requiredPermission: "reports.item_movement",
      },
      {
        title: "Stock Audit",
        url: "/admin/reports/inventory/audit",
        icon: ClipboardCheck,
        requiredPermission: "reports.stock_audit",
      },
      {
        title: "Supplier Products",
        url: "/admin/reports/suppliers",
        icon: Truck,
        requiredPermission: "reports.supplier_products",
      },
      {
        title: "Returned Items",
        url: "/admin/reports/returns",
        icon: PackageX,
        requiredPermission: "reports.returns",
      },
    ],
  },
  {
    title: "Customer Analytics",
    icon: PieChart,
    requiredPermission: "",
    children: [
      {
        title: "Category Sales",
        url: "/admin/reports/category-sales",
        icon: PieChart,
        requiredPermission: "reports.category_sales",
      },
      {
        title: "Customer Insights",
        url: "/admin/reports/customers",
        icon: Users,
        requiredPermission: "reports.customer_insights",
      },
    ],
  },
]

const systemItems: NavItem[] = [
  {
    title: "Administration",
    icon: Users,
    requiredPermission: "system.manage_users",
    children: [
      {
        title: "Users",
        url: "/admin/users",
        icon: Users,
        requiredPermission: "system.manage_users",
      },
      {
        title: "Permission Templates",
        url: "/admin/permission-templates",
        icon: CreditCard,
        requiredPermission: "system.manage_templates",
      },
    ],
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
    requiredPermission: "system.manage_templates",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [totalOrderCount, setTotalOrderCount] = React.useState(0)
  const [pendingReviewCount, setPendingReviewCount] = React.useState(0)
  const [pendingReturnCount, setPendingReturnCount] = React.useState(0)
  const [outOfStockCount, setOutOfStockCount] = React.useState(0)

  // Fetch the logged-in user's live profile (roles & custom permissions)
  const { data: liveUser } = useSWR(
    status === "authenticated" ? "/api/admin/me" : null,
    fetcher,
    { refreshInterval: 15000, revalidateOnFocus: true }
  )

  // Construct derived live permissionContext merging NextAuth session with fresh DB data
  const permissionContext = React.useMemo(() => {
    if (!session) return null
    if (!liveUser) return session
    return {
      ...session,
      user: {
        ...session.user,
        role: liveUser.role,
        customPermissions: liveUser.customPermissions,
        template: liveUser.template,
      },
    }
  }, [session, liveUser])

  // Fetch dynamic feature toggles
  const { data: toggles } = useSWR<Record<string, boolean>>(
    status === "authenticated" ? "/api/admin/feature-toggles" : null,
    fetcher
  )

  const isSuperAdmin = permissionContext?.user?.role === "SUPER_ADMIN" || permissionContext?.user?.role === "DEV_ADMIN"
  const isDevAdmin = permissionContext?.user?.role === "DEV_ADMIN"

  // Check if sections are enabled
  const storefrontEnabled = toggles?.storefront_section !== false;
  const operationsEnabled = toggles?.operations_section !== false;
  const reportsEnabled = toggles?.operations_reports !== false;

  // Filter storefront items based on toggles
  const filteredStorefrontItems = React.useMemo(() => {
    if (!storefrontEnabled) return [];
    return storefrontItems.filter(item => {
      if (item.url === "/admin/banners") return toggles?.storefront_banners !== false;
      if (item.url === "/admin/occasions") return toggles?.storefront_occasions !== false;
      if (item.url === "/admin/recipients") return toggles?.storefront_recipients !== false;
      if (item.url === "/admin/discounts") return toggles?.storefront_discounts !== false;
      if (item.url === "/admin/gift-cards") return toggles?.storefront_giftcards !== false;
      if (item.url === "/admin/settings/wrappings") return toggles?.storefront_wrapping !== false;
      return true;
    });
  }, [toggles, storefrontEnabled]);

  // Filter operations items based on toggles
  const filteredOperationsItems = React.useMemo(() => {
    if (!operationsEnabled) return [];
    return operationsItems.filter(item => {
      if (item.url === "/admin/reviews") return toggles?.operations_reviews !== false;
      if (item.url === "/admin/returns") return toggles?.operations_returns !== false;
      if (item.url === "/admin/suppliers") return toggles?.operations_suppliers !== false;
      if (item.url === "/admin/settings/shipping") return toggles?.operations_shipping !== false;
      return true;
    });
  }, [toggles, operationsEnabled]);

  // Filter report items individually based on toggles
  const filteredReportItems = React.useMemo(() => {
    if (!reportsEnabled) return [];
    return reportItems.map(group => {
      if (!group.children) return group;
      
      const filteredChildren = group.children.filter(item => {
        if (item.url === "/admin/reports/sales-summary") return toggles?.reports_sales_summary !== false;
        if (item.url === "/admin/reports/cash-close") return toggles?.reports_cash_close !== false;
        if (item.url === "/admin/reports/inventory/drilldown") return toggles?.reports_stock_drilldown !== false;
        if (item.url === "/admin/reports/out-of-stock") return toggles?.reports_out_of_stock !== false;
        if (item.url === "/admin/reports/inventory/movement") return toggles?.reports_item_movement !== false;
        if (item.url === "/admin/reports/inventory/audit") return toggles?.reports_stock_audit !== false;
        if (item.url === "/admin/reports/suppliers") return toggles?.reports_supplier_products !== false;
        if (item.url === "/admin/reports/category-sales") return toggles?.reports_category_sales !== false;
        if (item.url === "/admin/reports/customers") return toggles?.reports_customer_insights !== false;
        return true;
      });
      
      return { ...group, children: filteredChildren };
    }).filter(group => group.children && group.children.length > 0);
  }, [toggles, reportsEnabled]);

  // Track expanded state for nested menus
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({})

  // Initialize expanded state based on current route
  React.useEffect(() => {
    const allGroups = [
      ...overviewItems,
      ...catalogItems,
      ...salesPosItems,
      ...storefrontItems,
      ...operationsItems,
      ...systemItems,
      ...reportItems,
    ]
    const initialOpenMenus: Record<string, boolean> = {}

    allGroups.forEach((item) => {
      if (item.children?.some((child) => child.url && isActive(child.url))) {
        initialOpenMenus[item.title] = true
      }
    })

    setOpenMenus((prev) => ({ ...prev, ...initialOpenMenus }))
  }, [pathname])

  React.useEffect(() => {
    if (status !== "authenticated" || !permissionContext) return

    const controller = new AbortController()

    const fetchTotalOrderCount = async () => {
      try {
        const response = await fetch("/api/admin/orders/metrics", {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) return

        const payload = await response.json()
        if (typeof payload.totalOrders === "number") {
          setTotalOrderCount(payload.totalOrders)
        }
      } catch {
        // Sidebar alert is best-effort only.
      }
    }

    void fetchTotalOrderCount()

    return () => controller.abort()
  }, [permissionContext, status])

  React.useEffect(() => {
    if (status !== "authenticated" || !permissionContext) return
    if (!hasPermission(permissionContext, "pos.terminal_access")) {
      setPendingReviewCount(0)
      return
    }

    const controller = new AbortController()

    const fetchPendingReviewCount = async () => {
      try {
        const response = await fetch("/api/admin/reviews/count?status=PENDING", {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) return

        const payload = await response.json()
        if (typeof payload.count === "number") {
          setPendingReviewCount(payload.count)
        }
      } catch {
        // Sidebar alert is best-effort only.
      }
    }

    void fetchPendingReviewCount()

    return () => controller.abort()
  }, [permissionContext, status])

  React.useEffect(() => {
    if (status !== "authenticated" || !permissionContext) return
    if (!hasPermission(permissionContext, "reports.out_of_stock")) {
      setOutOfStockCount(0)
      return
    }

    const controller = new AbortController()

    const fetchOutOfStockCount = async () => {
      try {
        const response = await fetch("/api/admin/inventory/out-of-stock", {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) return

        const payload = await response.json()
        if (typeof payload.total === "number") {
          setOutOfStockCount(payload.total)
        }
      } catch {
        // Sidebar alert is best-effort only.
      }
    }

    void fetchOutOfStockCount()

    return () => controller.abort()
  }, [permissionContext, status])

  React.useEffect(() => {
    if (status !== "authenticated" || !permissionContext) return
    if (!hasPermission(permissionContext, "pos.terminal_access")) {
      setPendingReturnCount(0)
      return
    }

    const controller = new AbortController()

    const fetchPendingReturnCount = async () => {
      try {
        const response = await fetch("/api/admin/returns/count?status=PENDING", {
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) return

        const payload = await response.json()
        if (typeof payload.count === "number") {
          setPendingReturnCount(payload.count)
        }
      } catch {
        // Sidebar alert is best-effort only.
      }
    }

    void fetchPendingReturnCount()

    return () => controller.abort()
  }, [permissionContext, status])

  const isActive = (url: string) => {
    if (!url) return false
    const normalizedPath = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
    const localeAgnosticPath = normalizedPath.replace(/^\/(en|si|ta)(?=\/|$)/, "") || "/"

    if (url === "/admin") return localeAgnosticPath === "/admin"

    // Enforce strict path validation for POS Terminal
    if (url === "/admin/pos") {
      return localeAgnosticPath === "/admin/pos"
    }

    // Enforce strict path validation for Denominations
    if (url === "/admin/pos/denominations") {
      return localeAgnosticPath === "/admin/pos/denominations"
    }

    const isShiftSessionPath = localeAgnosticPath === "/admin/pos/shifts" || localeAgnosticPath.startsWith("/admin/pos/shifts/")

    if (isShiftSessionPath) {
      if (url === "/admin/reports/cash-close") {
        return true
      }
      if (url === "/admin/pos") {
        return false
      }
    }

    return localeAgnosticPath === url || localeAgnosticPath.startsWith(`${url}/`)
  }

  const localePrefix = pathname.split("/")[1]
  const isLocale = ["en", "si", "ta"].includes(localePrefix)
  const toHref = (url: string) => {
    if (url.startsWith("/admin") || url.startsWith("/devadmin")) {
      return url
    }
    return isLocale ? `/${localePrefix}${url}` : url
  }

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const renderNavItem = (item: NavItem) => {
    const hasChildren = item.children && item.children.length > 0
    const isParentOfActive = hasChildren && item.children!.some((child) => child.url && isActive(child.url))
    const isItemActive = item.url ? isActive(item.url) : isParentOfActive
    const isOpen = openMenus[item.title] || isParentOfActive

    if (hasChildren) {
      return (
        <li key={item.title}>
          <Collapsible.Root
            open={isOpen}
            onOpenChange={() => toggleMenu(item.title)}
            className="group/collapsible"
          >
            <Collapsible.Trigger asChild>
              <button
                className={`flex w-full items-center gap-3 mx-1 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors cursor-pointer group ${
                  isItemActive
                    ? "bg-[#A7066A] text-white"
                    : "text-[#1F1720] hover:bg-[#FCEAF4] hover:text-[#A7066A]"
                }`}
              >
                {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                {/* Always render title directly in English */}
                <span className="truncate">{item.title}</span>
                <ChevronRight className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
              </button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <ul className="ml-6 mt-1 flex flex-col gap-1 border-l border-brand-border/50 pl-2 overflow-hidden">
                {item.children!.map((child) => (
                  <li key={child.title}>
                    <Link
                      href={toHref(child.url!)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                        child.url && isActive(child.url)
                          ? "bg-[#FCEAF4] text-[#A7066A]"
                          : "text-[#6B5A64] hover:bg-[#FCEAF4] hover:text-[#A7066A]"
                      }`}
                    >
                      {child.icon && <child.icon className="h-3.5 w-3.5 shrink-0" />}
                      {/* Always render child title directly in English */}
                      <span className="truncate">{child.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Collapsible.Content>
          </Collapsible.Root>
        </li>
      )
    }

    return (
      <li key={item.title}>
        <Link
          href={toHref(item.url!)}
          className={`flex items-center gap-3 mx-1 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
            isItemActive
              ? "bg-[#A7066A] text-white"
              : "text-[#1F1720] hover:bg-[#FCEAF4] hover:text-[#A7066A]"
          }`}
        >
          {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
          {/* Always render title directly in English */}
          <span className="truncate">{item.title}</span>
          {item.url === "/admin/orders" && (
            <Badge className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold flex items-center justify-center min-w-[20px] ${
              isItemActive ? "bg-white text-[#A7066A]" : (totalOrderCount > 0 ? "bg-[#FCEAF4] text-[#A7066A]" : "bg-slate-100 text-slate-600")
            }`}>
              {totalOrderCount}
            </Badge>
          )}
          {item.url === "/admin/reviews" && (
            <Badge className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold flex items-center justify-center min-w-[20px] ${
              isItemActive ? "bg-white text-[#A7066A]" : (pendingReviewCount > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")
            }`}>
              {pendingReviewCount}
            </Badge>
          )}
          {item.url === "/admin/returns" && (
            <Badge className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold flex items-center justify-center min-w-[20px] ${
              isItemActive ? "bg-white text-[#A7066A]" : (pendingReturnCount > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600")
            }`}>
              {pendingReturnCount}
            </Badge>
          )}
          {item.url === "/admin/products" && outOfStockCount > 0 && (
            <Badge variant="destructive" className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {outOfStockCount}
            </Badge>
          )}
        </Link>
      </li>
    )
  }

  const renderNavGroup = (label: string, items: NavItem[]) => {
    if (!permissionContext) return null

    // Filter items based on dynamic granular permissions
    const allowedItems = items
      .map((item) => {
        if (item.children) {
          // Filter allowed children recursively
          const allowedChildren = item.children.filter((child) =>
            hasPermission(permissionContext, child.requiredPermission)
          )
          return { ...item, children: allowedChildren }
        }
        return item
      })
      .filter((item) => {
        // Special rule: POS_ADMIN should never see the Dashboard link
        if (item.title === "Dashboard" && permissionContext?.user?.role === "POS_ADMIN") {
          return false;
        }

        // Parent must pass permission validation
        if (!hasPermission(permissionContext, item.requiredPermission)) {
          return false
        }
        // If the item had children, it must still have at least one allowed child to render
        if (item.children && item.children.length === 0) {
          return false
        }
        return true
      })

    if (allowedItems.length === 0) {
      return null
    }

    return (
      <div className="px-3 py-2" key={label}>
        {/* Always render nav group labels directly in English */}
        <p className="px-2 pb-2 text-[11px] font-black uppercase tracking-wider text-[#6B5A64]">
          {label}
        </p>
        <ul className="flex flex-col gap-0.5">
          {allowedItems.map(renderNavItem)}
        </ul>
      </div>
    )
  }

  return (
    <nav className="flex flex-col h-full bg-white border-r border-brand-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="h-16 flex items-center justify-center border-b border-brand-border px-4 shrink-0">
        <Link href={`/${isLocale ? localePrefix : "en"}`} className="flex items-center gap-2 font-bold text-xl text-[#A7066A] overflow-hidden truncate">
          <Image src="/logo/logo.png" alt="SPC" width={38} height={38} className="h-[38px] w-[38px] shrink-0 object-contain" priority />
          <span className="truncate">SPC Admin</span>
        </Link>
      </div>

      {/* Scrollable navigation */}
      <div className="flex-1 overflow-y-auto py-3">
        {renderNavGroup("Overview", overviewItems)}
        {renderNavGroup("Catalog", catalogItems)}
        {renderNavGroup("Sales & POS", salesPosItems)}
        {renderNavGroup("Storefront", filteredStorefrontItems)}
        {renderNavGroup("Operations", filteredOperationsItems)}
        {reportsEnabled && renderNavGroup("Reports & Analytics", filteredReportItems)}

        {(isSuperAdmin || isDevAdmin) && renderNavGroup("Administration", [systemItems[0]])}

        {(isDevAdmin || isSuperAdmin) && renderNavGroup("System", systemItems.slice(1))}

        {isDevAdmin && renderNavGroup("Developer Tools", [
          {
            title: "Feature Toggles",
            url: "/admin/feature-toggles",
            icon: Settings,
            requiredPermission: "",
          },
          {
            title: "Company Details",
            url: "/admin/company-details",
            icon: Building2,
            requiredPermission: "",
          },
          {
            title: "Data Wipe",
            url: "/admin/devadmin/data-wipe",
            icon: Database,
            requiredPermission: "",
          }
        ])}
      </div>
    </nav>
  )
}
