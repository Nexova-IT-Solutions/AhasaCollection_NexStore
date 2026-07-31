"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Store, Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Outlet {
  id: string;
  name: string;
}

interface ReportOutletSelectProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export function ReportOutletSelect({
  value,
  onChange,
  className = "",
}: ReportOutletSelectProps) {
  const { data: meData, isLoading: meLoading } = useSWR("/api/admin/me", fetcher);
  const { data: outletsData, isLoading: outletsLoading } = useSWR(
    "/api/admin/outlets",
    fetcher
  );

  const outlets: Outlet[] = Array.isArray(outletsData) ? outletsData : [];

  const user = meData;
  const userOutletId = user?.outletId || null;
  const userOutletName = user?.outlet?.name || "My Outlet";
  const userRole = user?.role || "";
  const isGlobalAdmin =
    userRole === "SUPER_ADMIN" ||
    userRole === "DEV_ADMIN" ||
    user?.customPermissions?.["catalog.stock_admin"] === true;

  const isTaggedToOutlet = !!userOutletId && !isGlobalAdmin;

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

  // If user is tagged to an outlet (not Super Admin / Dev Admin / Stock Admin), show locked badge
  if (isTaggedToOutlet) {
    return (
      <div className={`flex flex-col space-y-1 ${className}`}>
        <span className="text-xs text-slate-500 font-medium">Outlet Scope</span>
        <div className="flex items-center gap-1.5 h-9 px-3 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-md font-semibold text-xs shadow-sm">
          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="truncate">{userOutletName}</span>
        </div>
      </div>
    );
  }

  // Otherwise, user is untagged or an admin — show dropdown filter
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <span className="text-xs text-slate-500 font-medium">Filter Outlet</span>
      <Select value={value || "all"} onValueChange={(val) => onChange(val === "all" ? "" : val)}>
        <SelectTrigger className="h-9 text-xs border-slate-200 bg-white font-medium focus:ring-[#A7066A]">
          <div className="flex items-center gap-2 truncate">
            <Store className="w-3.5 h-3.5 text-[#A7066A] shrink-0" />
            <SelectValue placeholder="All Outlets" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Outlets & Warehouses</SelectItem>
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
