"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { LogOut, Settings, User } from "lucide-react"

import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"

type AdminHeaderUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

type AdminHeaderProps = {
  user?: AdminHeaderUser | null
}

function getInitials(name: string, email?: string | null) {
  const source = name.trim() || email?.trim() || "Admin"
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

export function AdminHeader({ user }: AdminHeaderProps) {
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Admin"
  const email = user?.email?.trim() || "No email available"
  const initials = getInitials(displayName, user?.email)

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      window.localStorage.clear()
      window.sessionStorage.clear()
    }

    await signOut({ callbackUrl: `/sign-in` })
  }

  return (
    <header className="h-14 border-b border-brand-border bg-white/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex h-full items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <div className="min-w-0">
            <AdminBreadcrumb />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open user profile menu"
              className="ml-auto inline-flex items-center justify-center rounded-full border border-transparent p-0.5 transition hover:border-[#A7066A]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A7066A]/30"
            >
              <Avatar className="size-10 ring-1 ring-border/60">
                <AvatarImage src={user?.image ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-[#FCEAF4] text-sm font-semibold text-[#A7066A]">
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
              <div className="space-y-0.5">
                <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{email}</p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="my-2" />

            {/* 
            <DropdownMenuItem asChild className="min-h-11 rounded-xl px-3 py-2.5 text-sm">
              <Link href="/admin/profile/edit" className="flex w-full items-center gap-2">
                <User className="size-4 text-slate-500" />
                <span>Edit Profile</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="min-h-11 rounded-xl px-3 py-2.5 text-sm">
              <Link href="/admin/settings/account" className="flex w-full items-center gap-2">
                <Settings className="size-4 text-slate-500" />
                <span>Account Settings</span>
              </Link>
            </DropdownMenuItem>
            */}

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
    </header>
  )
}