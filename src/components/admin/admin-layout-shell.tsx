"use client"

import { useSidebarStore } from "@/store/use-sidebar-store"

interface AdminLayoutShellProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function AdminLayoutShell({ sidebar, children }: AdminLayoutShellProps) {
  const isOpen = useSidebarStore((s) => s.isOpen)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      {/* Sidebar aside: transitions between w-64 and w-0 */}
      <aside
        className={`flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out z-20 ${
          isOpen ? "w-64" : "w-0"
        }`}
      >
        {/*
          Fixed-width inner wrapper: The sidebar content always renders
          at w-64. When the parent <aside> animates to w-0, overflow-hidden
          clips this div. This prevents content from squishing/reflowing.
        */}
        <div className="w-64 h-full">
          {sidebar}
        </div>
      </aside>

      {/* Main content area fills remaining horizontal space */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
