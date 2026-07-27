import React from "react";

export default function AdminDashboardLoading() {
  return (
    <div className="w-full bg-[#FAFAFB] min-h-screen py-8 px-4 sm:px-6 lg:px-10 animate-pulse">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header Section Skeleton */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 rounded-xl border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gray-200" />
            <div className="space-y-2">
              <div className="h-5 w-48 bg-gray-200 rounded-md" />
              <div className="h-3.5 w-32 bg-gray-100 rounded-md" />
            </div>
          </div>
          <div className="space-y-2 xl:text-right">
            <div className="h-3 w-20 bg-gray-100 rounded-md xl:ml-auto" />
            <div className="h-4 w-28 bg-gray-200 rounded-md xl:ml-auto" />
          </div>
        </div>

        {/* Top Section: Responsive grid containing 3 uniform rectangular cards */}
        <div className="space-y-4">
          <div className="h-5 w-36 bg-gray-200 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1 Skeleton: Revenue */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-gray-100 rounded-md" />
                  <div className="h-7 w-36 bg-gray-200 rounded-md" />
                </div>
                <div className="h-10 w-10 bg-gray-100 rounded-lg" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-3 w-16 bg-gray-100 rounded-md" />
                <div className="h-5 w-32 bg-gray-200 rounded-md" />
              </div>
            </div>

            {/* Card 2 Skeleton: Active Boxes */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-gray-100 rounded-md" />
                  <div className="h-7 w-36 bg-gray-200 rounded-md" />
                </div>
                <div className="h-10 w-10 bg-gray-100 rounded-lg" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-3 w-16 bg-gray-100 rounded-md" />
                <div className="h-5 w-20 bg-gray-200 rounded-md" />
              </div>
            </div>

            {/* Card 3 Skeleton: Orders */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-gray-100 rounded-md" />
                  <div className="h-7 w-20 bg-gray-200 rounded-md" />
                </div>
                <div className="h-10 w-10 bg-gray-100 rounded-lg" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-3 w-20 bg-gray-100 rounded-md" />
                <div className="h-5 w-24 bg-gray-200 rounded-md" />
              </div>
            </div>

          </div>
        </div>

        {/* Sales Summary Skeleton Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="h-5 w-64 bg-gray-200 rounded-md" />
              <div className="h-3 w-96 bg-gray-100 rounded-md" />
            </div>
            <div className="flex gap-3">
              <div className="h-9 w-28 bg-gray-100 rounded-lg" />
              <div className="h-9 w-28 bg-gray-100 rounded-lg" />
              <div className="h-9 w-36 bg-gray-200 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-6 space-y-4 bg-gray-50/30">
                <div className="h-8 w-8 bg-gray-100 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-gray-100 rounded-md" />
                  <div className="h-6 w-32 bg-gray-200 rounded-md" />
                  <div className="h-3 w-36 bg-gray-100 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Section: Multi-column grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Column (Span 2) */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Orders Over Time Chart Skeleton */}
            <div className="border border-gray-100 rounded-xl bg-white p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-5 w-40 bg-gray-200 rounded-md" />
                <div className="h-3.5 w-64 bg-gray-100 rounded-md" />
              </div>
              <div className="h-72 w-full bg-gray-50/50 rounded-lg flex items-end justify-between px-6 py-4">
                {/* Simulated Chart Bars/Line Placeholder */}
                <div className="w-[10%] h-[20%] bg-gray-200 rounded-t-sm" />
                <div className="w-[10%] h-[40%] bg-gray-200 rounded-t-sm" />
                <div className="w-[10%] h-[30%] bg-gray-200 rounded-t-sm" />
                <div className="w-[10%] h-[60%] bg-gray-200 rounded-t-sm" />
                <div className="w-[10%] h-[80%] bg-gray-200 rounded-t-sm" />
                <div className="w-[10%] h-[50%] bg-gray-200 rounded-t-sm" />
                <div className="w-[10%] h-[70%] bg-gray-200 rounded-t-sm" />
              </div>
            </div>

            {/* Top Products Table Skeleton */}
            <div className="border border-gray-100 rounded-xl bg-white p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-5 w-44 bg-gray-200 rounded-md" />
                <div className="h-3 w-56 bg-gray-100 rounded-md" />
              </div>
              <div className="space-y-3 pt-2">
                <div className="h-8 w-full bg-gray-50 rounded-md" />
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div className="h-4 w-32 bg-gray-200 rounded-md" />
                    <div className="h-6 w-16 bg-gray-100 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column (Span 1) */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Quick Actions Skeleton */}
            <div className="border border-gray-100 rounded-xl bg-white p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-5 w-32 bg-gray-200 rounded-md" />
                <div className="h-3 w-52 bg-gray-100 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-gray-50 rounded-xl border border-gray-100" />
                ))}
              </div>
            </div>

            {/* Recent Activity Skeleton */}
            <div className="border border-gray-100 rounded-xl bg-white p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-5 w-32 bg-gray-200 rounded-md" />
                <div className="h-3 w-48 bg-gray-100 rounded-md" />
              </div>
              <div className="space-y-4 pt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="h-8 w-8 bg-gray-100 rounded-lg shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-1/2 bg-gray-200 rounded-md" />
                      <div className="h-2.5 w-3/4 bg-gray-100 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
