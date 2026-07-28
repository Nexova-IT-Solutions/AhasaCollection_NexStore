"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LogOut,
  Settings,
  User,
  Menu,
  MonitorSmartphone,
  Wifi,
  WifiOff,
  Store,
  ShieldCheck,
} from "lucide-react"

import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebarStore } from "@/store/use-sidebar-store"
import { usePosCart } from "@/store/use-pos-cart"
import { useEffect, useState } from "react"

type MainHeaderUser = {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
  templateName?: string | null
  outletName?: string | null
  outletId?: string | null
}

type MainHeaderProps = {
  locale?: string
  user?: MainHeaderUser | null
}

function getInitials(name: string, email?: string | null) {
  const source = name.trim() || email?.trim() || "POS"
  const parts = source
    .replace(/@.*/, "")
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return "A"
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function MainHeader({ locale = "en", user }: MainHeaderProps) {
  const pathname = usePathname()
  const toggleSidebar = useSidebarStore((s) => s.toggleSidebar)
  const sidebarIsOpen = useSidebarStore((s) => s.isOpen)
  const activeShift = usePosCart((s) => s.activeShift)

  const [isOnline, setIsOnline] = useState(true)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)

  const isPosRoute = pathname.includes("/admin/pos")

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "POS"
  const email = user?.email?.trim() || "No email available"
  const initials = getInitials(displayName, user?.email)

  // ─── Online/offline detection ──────────────────────────────
  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    setIsOnline(navigator.onLine)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  // ─── Clock (only for POS route, client-only) ───────────────
  useEffect(() => {
    if (!isPosRoute) {
      setCurrentTime(null)
      return
    }
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [isPosRoute])

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      window.localStorage.clear()
      window.sessionStorage.clear()
    }
    await signOut({ callbackUrl: `/sign-in` })
  }

  const handleToggle = () => {
    console.log("[MainHeader] Toggle clicked. Current isOpen:", sidebarIsOpen)
    toggleSidebar()
  }

  const roleLabel =
    user?.templateName ||
    (user?.role === "DEV_ADMIN"
      ? "Dev Admin"
      : user?.role === "SUPER_ADMIN"
      ? "Super Admin"
      : user?.role === "POS_ADMIN"
      ? "POS Admin"
      : user?.role || "Staff")

  const outletLabel = user?.outletName ? user.outletName : "All Outlets"

  return (
    <header className="h-16 flex-shrink-0 z-10 border-b border-brand-border bg-white/95 backdrop-blur-sm px-4 sm:px-6">
      <div className="flex h-full items-center gap-3">
        {/* ── Left: Sidebar toggle ─────────────────────────── */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className="h-9 w-9 rounded-lg text-slate-500 hover:text-[#A7066A] hover:bg-[#FCEAF4] transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* ── Center: Context-sensitive content ─────────────── */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          {isPosRoute ? (
            /* ── POS Mode: Status badges ────────────────────── */
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <Badge
                variant="outline"
                className="bg-[#1F1720] text-white border-[#1F1720] text-[10px] font-bold px-2.5 py-1 gap-1.5 shrink-0"
              >
                <MonitorSmartphone className="h-3 w-3" />
                POS Terminal
              </Badge>

              {activeShift ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 text-[10px] font-semibold shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Shift Active · {activeShift.operatorName}
                </Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 text-[10px] font-semibold shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
                  No Active Shift
                </Badge>
              )}

              {/* Online/Offline */}
              <div className="flex items-center gap-1 shrink-0">
                {isOnline ? (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50 gap-1">
                    <Wifi className="h-3 w-3" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50 gap-1">
                    <WifiOff className="h-3 w-3" />
                    Offline
                  </Badge>
                )}
              </div>

              {/* Clock */}
              {currentTime && (
                <span
                  className="text-[11px] font-mono font-semibold text-slate-500 tabular-nums shrink-0 ml-auto"
                  suppressHydrationWarning
                >
                  {formatTime(currentTime)}
                </span>
              )}
            </div>
          ) : (
            /* ── Standard Mode: Breadcrumbs ─────────────────── */
            <div className="min-w-0">
              <AdminBreadcrumb />
            </div>
          )}
        </div>

        {/* ── Right: Assigned Outlet & Role Badges + User avatar ────────────────────── */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Assigned Outlet Badge */}
          <Badge
            variant="outline"
            className="hidden sm:inline-flex bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold px-2.5 py-1 gap-1.5 items-center rounded-xl shadow-xs"
          >
            <Store className="h-3.5 w-3.5 text-purple-600" />
            <span>{outletLabel}</span>
          </Badge>

          {/* Access Template / Role Badge */}
          <Badge
            variant="outline"
            className="hidden md:inline-flex bg-amber-50 text-amber-800 border-amber-200 text-xs font-semibold px-2.5 py-1 gap-1.5 items-center rounded-xl shadow-xs"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
            <span>{roleLabel}</span>
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Open user profile menu"
                className="inline-flex items-center justify-center rounded-full border border-transparent p-0.5 transition hover:border-[#A7066A]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7066A]/30"
              >
                <Avatar className="size-9 ring-1 ring-border/60">
                  <AvatarImage src={user?.image ?? undefined} alt={displayName} />
                  <AvatarFallback className="bg-[#FCEAF4] text-xs font-semibold text-[#A7066A]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={12}
              className="w-72 rounded-2xl border border-brand-border bg-white p-2 shadow-xl shadow-black/5"
            >
              <DropdownMenuLabel className="px-3 py-2">
                <div className="space-y-1.5">
                  <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{email}</p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
                      <Store className="h-3 w-3 text-purple-600" />
                      {outletLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                      <ShieldCheck className="h-3 w-3 text-amber-600" />
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="my-2" />

              <DropdownMenuItem
                className="min-h-11 rounded-xl px-3 py-2.5 text-sm text-red-600 focus:bg-red-50 focus:text-red-700"
                onSelect={() => {
                  void handleLogout()
                }}
              >
                <span className="flex items-center gap-2">
                  <LogOut className="size-4" />
                  <span>Logout</span>
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
