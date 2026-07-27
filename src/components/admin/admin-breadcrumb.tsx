"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * Converts a URL segment into a human-readable title.
 * Handles IDs by shortening them if they are too long.
 */
function titleize(segment: string) {
  // Check if the segment looks like a database ID (CUID or long alphanumeric)
  if (segment.length > 20 || /^[a-z0-9]{20,}$/.test(segment)) {
    return "Details";
  }
  
  return segment
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

const NON_NAVIGABLE_ROUTES = new Set([
  "/admin/reports",
  "/admin/reports/inventory",
  "/admin/profile",
  "/admin/inventory",
]);

function isRouteNavigable(path: string) {
  if (NON_NAVIGABLE_ROUTES.has(path)) {
    return false;
  }
  
  // Products detail page doesn't have a direct page (only edit/new do)
  if (/\/admin\/products\/[a-zA-Z0-9_-]+$/.test(path)) {
    return false;
  }

  return true;
}

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  
  // Find where "admin" starts to correctly handle localized paths (e.g., /en/admin)
  const adminIndex = segments.indexOf("admin");
  
  // If we're not in the admin section, don't render breadcrumbs
  if (adminIndex === -1) return null;

  // Admin is always at /admin/* (never localized)
  const adminPathSegments = segments.slice(adminIndex + 1);

  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        {/* Always show Admin (Dashboard) as the root */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild className="cursor-pointer transition-colors hover:text-[#A7066A]">
            <Link href="/admin">Admin</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {adminPathSegments.length === 0 ? (
          <React.Fragment>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-slate-900">Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </React.Fragment>
        ) : (
          adminPathSegments.map((segment, idx) => {
            const isLast = idx === adminPathSegments.length - 1;
            const href = `/admin/${adminPathSegments.slice(0, idx + 1).join("/")}`;
            
            return (
              <React.Fragment key={href}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="font-semibold text-slate-900">
                      {titleize(segment)}
                    </BreadcrumbPage>
                  ) : !isRouteNavigable(href) ? (
                    <span className="text-sm font-normal text-slate-500">
                      {titleize(segment)}
                    </span>
                  ) : (
                    <BreadcrumbLink asChild className="cursor-pointer transition-colors hover:text-[#A7066A]">
                      <Link href={href}>{titleize(segment)}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
