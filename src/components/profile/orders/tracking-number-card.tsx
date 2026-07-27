"use client";

import { useState } from "react";
import { Check, Copy, PackageSearch } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TrackingNumberCardProps = {
  trackingNumber: string;
  locale: string;
};

export function TrackingNumberCard({ trackingNumber, locale }: TrackingNumberCardProps) {
  const [copied, setCopied] = useState(false);
  const label = locale === "si"
    ? "පාර්සල් ලුහුබැඳීමේ අංකය (Tracking Number)"
    : "Tracking Number";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Card className="rounded-2xl border border-gray-100 shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-4 bg-muted rounded-2xl p-3 text-sm font-medium border">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white text-[#A7066A] shadow-sm ring-1 ring-gray-200/70">
              <PackageSearch className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-gray-500">Shipment Update</p>
              <p className="truncate text-sm font-semibold text-gray-900">{label}: <span className="font-mono">{trackingNumber}</span></p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className={cn(
              "shrink-0 rounded-xl border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#A7066A]",
              copied && "border-emerald-200 text-emerald-700 hover:text-emerald-700"
            )}
          >
            {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
            {copied ? "Copied" : "Copy Code"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}