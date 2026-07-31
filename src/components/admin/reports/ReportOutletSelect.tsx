"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Store, Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Outlet {
  id: string;
  name: string;
}

interface ReportOutletSelectProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  hideLabel?: boolean;
}

export function ReportOutletSelect({
  value,
  onChange,
  className = "",
  hideLabel = false,
}: ReportOutletSelectProps) {
  const { data: session } = useSession();
  const { data: meData, isLoading: meLoading } = useSWR("/api/admin/me", fetcher);
  const { data: outletsData, isLoading: outletsLoading } = useSWR(
    "/api/admin/outlets",
    fetcher
  );

  const outlets: Outlet[] = Array.isArray(outletsData) ? outletsData : [];

  // Determine user info using session first, then meData as fallback
  const sessionUser = session?.user as any;
  const userOutletId = sessionUser?.outletId || meData?.outletId || null;
  const userOutletName = sessionUser?.outletName || meData?.outlet?.name || "My Outlet";
  const userRole = sessionUser?.role || meData?.role || "";

  const customPerms = sessionUser?.customPermissions || meData?.customPermissions || {};
  const templatePerms = sessionUser?.template?.permissions || meData?.template?.permissions || {};

  // Only SUPER_ADMIN, DEV_ADMIN, or users explicitly granted catalog.stock_admin permission can view/filter all outlets
  const hasStockAdminPerm =
    customPerms["catalog.stock_admin"] === true ||
    templatePerms?.catalog?.stock_admin === true ||
    templatePerms?.["catalog.stock_admin"] === true;

  const canFilterAllOutlets =
    userRole === "SUPER_ADMIN" ||
    userRole === "DEV_ADMIN" ||
    hasStockAdminPerm;

  const isTaggedToOutlet = !!userOutletId && !canFilterAllOutlets;

  // Auto-lock selected value if user is tagged to an outlet
  useEffect(() => {
    if (isTaggedToOutlet && userOutletId && value !== userOutletId) {
      onChange(userOutletId);
    }
  }, [isTaggedToOutlet, userOutletId, value, onChange]);

  if (meLoading || outletsLoading) {
    return (
      <div className={`flex items-center gap-1 text-xs text-slate-400 ${className}`}>
        <Store className="w-3.5 h-3.5 animate-pulse" />
        <span>Loading outlets...</span>
      </div>
    );
  }

  // If user is tagged to an outlet (and not global admin), render a disabled/read-only Select pre-selected to their outlet
  if (isTaggedToOutlet) {
    return (
      <div className={`flex flex-col space-y-1 ${className}`}>
        {!hideLabel && (
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <span>Outlet</span>
            <Lock className="w-3 h-3 text-amber-600" />
          </span>
        )}
        <Select value={userOutletId || ""} disabled>
          <SelectTrigger className="h-9 text-xs border-amber-200 bg-amber-50/60 text-amber-900 font-semibold cursor-not-allowed">
            <div className="flex items-center gap-2 truncate">
              <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <SelectValue>{userOutletName}</SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent>
            {userOutletId && (
              <SelectItem value={userOutletId}>{userOutletName}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Otherwise, user is untagged or an admin — show active dropdown filter
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      {!hideLabel && (
        <span className="text-xs text-slate-500 font-medium">Filter Outlet</span>
      )}
      <Select value={value || "all"} onValueChange={(val) => onChange(val === "all" ? "" : val)}>
        <SelectTrigger className="h-9 text-xs border-slate-200 bg-white font-medium focus:ring-[#A7066A]">
          <div className="flex items-center gap-2 truncate">
            <Store className="w-3.5 h-3.5 text-[#A7066A] shrink-0" />
            <SelectValue placeholder="All Outlets" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Outlets</SelectItem>
          {outlets.map((outlet) => (
            <SelectItem key={outlet.id} value={outlet.id}>
              {outlet.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
