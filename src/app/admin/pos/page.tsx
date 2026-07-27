"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Power,
  LogOut,
  Scan,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PosProductGrid } from "@/components/pos/PosProductGrid";
import { PosCart } from "@/components/pos/PosCart";
import { ShiftModal } from "@/components/pos/ShiftModal";
import { CheckoutModal } from "@/components/pos/CheckoutModal";
import { GiftCardActivationModal } from "@/components/pos/GiftCardActivationModal";
import { usePosCart } from "@/store/use-pos-cart";
import { useSidebarStore } from "@/store/use-sidebar-store";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import useSWR from "swr";

export default function PosTerminalPage() {
  const { data: session } = useSession();
  const { data: toggles } = useSWR<Record<string, boolean>>("/api/admin/feature-toggles");
  const isGiftcardsEnabled = toggles?.storefront_giftcards !== false;
  const [scannerActive, setScannerActive] = useState(true);
  const [isGiftCardActivationOpen, setIsGiftCardActivationOpen] = useState(false);

  const activeShift = usePosCart((s) => s.activeShift);
  const setActiveShift = usePosCart((s) => s.setActiveShift);
  const openShiftModal = usePosCart((s) => s.openShiftModal);
  const addItem = usePosCart((s) => s.addItem);
  const lastOrderNumber = usePosCart((s) => s.lastOrderNumber);

  const setSidebar = useSidebarStore((s) => s.setSidebar);

  // ─── Auto-hide sidebar on mount, restore on unmount ────────
  useEffect(() => {
    setSidebar(false);
    return () => {
      setSidebar(true);
    };
  }, [setSidebar]);

  // ─── Load existing open shift on mount ────────────────────
  useEffect(() => {
    const loadShift = async () => {
      try {
        const res = await fetch("/api/admin/pos/shifts/close");
        const data = await res.json();
        if (data.success && data.shift) {
          setActiveShift(data.shift);
        }
      } catch (error) {
        console.error("Failed to load shift:", error);
      }
    };
    loadShift();
  }, [setActiveShift]);

  // ─── Barcode Scanner Integration ──────────────────────────
  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      if (!scannerActive) return;

      toast.info(`Scanning: ${barcode}`, { duration: 1500 });

      try {
        const res = await fetch(
          `/api/admin/pos/products/scan?barcode=${encodeURIComponent(barcode)}`
        );
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.message || `Product not found: ${barcode}`);
          return;
        }

        if (data.type === "product") {
          const p = data.product;
          if (p.stock <= 0) {
            toast.error(`${p.name} is out of stock`);
            return;
          }

          addItem({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            salePrice: p.salePrice,
            stock: p.stock,
            image: p.image,
            discountName: p.discountName,
            discountValue: p.discountValue,
            discountType: p.discountType,
          });

          toast.success(`Added: ${p.name}`, { duration: 1500 });
        } else if (data.type === "giftcard") {
          const gc = data.giftCard;
          if (!gc.isUsable) {
            toast.error(
              gc.isExpired
                ? `Gift Card ${gc.code}: Expired`
                : gc.balance <= 0
                ? `Gift Card ${gc.code}: No balance remaining`
                : `Gift Card ${gc.code}: Not usable`,
              { duration: 4000 }
            );
            return;
          }
          // Payment method + code are already set in store by scanBarcode() in use-pos-cart
          toast.success(
            `Gift Card: ${gc.code} — Balance: Rs. ${gc.balance.toFixed(3)}`,
            {
              duration: 5000,
              action: {
                label: "Open Checkout",
                onClick: () => usePosCart.getState().openCheckout(),
              },
            }
          );
        }
      } catch (error) {
        console.error("Scan error:", error);
        toast.error("Failed to scan product");
      }
    },
    [addItem, scannerActive]
  );

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: scannerActive,
    allowInInputs: false,
    minLength: 3,
  });

  // ─── Keyboard Shortcuts ───────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Focus search
      if (e.key === "F2") {
        e.preventDefault();
        const searchInput = document.getElementById("pos-product-search");
        if (searchInput) searchInput.focus();
      }
      // F9: Open checkout
      if (e.key === "F9") {
        e.preventDefault();
        const { items, activeShift, openCheckout } = usePosCart.getState();
        if (items.length > 0 && activeShift) {
          openCheckout();
        }
      }
      // F12: Toggle scanner
      if (e.key === "F12") {
        e.preventDefault();
        setScannerActive((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="h-full w-full flex overflow-hidden p-4 gap-4 bg-slate-50">
      {/* ─── Left Panel: Products (2/3 width) ─────────────── */}
      <div className="w-2/3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Fixed top: POS toolbar */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2">
            {/* Scanner toggle */}
            <Badge
              className={`text-[10px] font-semibold cursor-pointer select-none transition-all ${
                scannerActive
                  ? "bg-blue-500/15 text-blue-700 border-blue-300 hover:bg-blue-500/25"
                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
              }`}
              onClick={() => setScannerActive(!scannerActive)}
            >
              <Scan className="h-3 w-3 mr-1" />
              {scannerActive ? "Scanner ON" : "Scanner OFF"}
            </Badge>

            {/* Last order */}
            {lastOrderNumber && (
              <span className="text-[10px] text-slate-400 font-mono">
                Last: <span className="font-bold text-slate-500">{lastOrderNumber}</span>
              </span>
            )}
          </div>

          {/* Shift actions */}
          <div className="flex items-center gap-2">
            {isGiftcardsEnabled && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsGiftCardActivationOpen(true)}
                className="h-8 border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold px-3 flex items-center gap-1 shadow-sm"
              >
                <Gift className="h-3.5 w-3.5 text-amber-500" />
                Activate Card
              </Button>
            )}
            {!activeShift ? (
              <Button
                size="sm"
                onClick={() => openShiftModal("open")}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-3 shadow-sm"
              >
                <Power className="h-3.5 w-3.5 mr-1" />
                Open Shift
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openShiftModal("close")}
                className="h-8 border-amber-300 text-amber-700 hover:bg-amber-50 text-[11px] font-semibold px-3"
              >
                <LogOut className="h-3.5 w-3.5 mr-1" />
                Close Shift
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable middle: Product grid */}
        <div className="flex-1 overflow-y-auto">
          <PosProductGrid />
        </div>

        {/* Fixed bottom: Keyboard shortcuts */}
        <div className="flex-shrink-0 flex items-center gap-4 px-4 py-2 border-t border-slate-100 bg-slate-50/80 text-[10px] text-slate-400">
          <span>
            <kbd className="px-1 py-0.5 rounded bg-slate-200 text-slate-500 font-mono text-[9px]">F2</kbd>{" "}
            Search
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-slate-200 text-slate-500 font-mono text-[9px]">F9</kbd>{" "}
            Checkout
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-slate-200 text-slate-500 font-mono text-[9px]">F12</kbd>{" "}
            Scanner
          </span>
          <span className="ml-auto text-slate-300">
            Barcode scanner auto-detect {scannerActive ? "active" : "disabled"}
          </span>
        </div>
      </div>

      {/* ─── Right Panel: Cart (1/3 width) ────────────────── */}
      <div className="w-1/3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <PosCart />
      </div>

      {/* ─── Modals ──────────────────────────────────────── */}
      <ShiftModal />
      <CheckoutModal />
      <GiftCardActivationModal
        isOpen={isGiftCardActivationOpen}
        onClose={() => setIsGiftCardActivationOpen(false)}
      />
    </div>
  );
}
