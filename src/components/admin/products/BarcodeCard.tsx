"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer } from "lucide-react";

const Barcode = dynamic(() => import("react-barcode"), { ssr: false });

interface BarcodeCardProps {
  sku: string;
  productName: string;
}

export function BarcodeCard({ sku, productName }: BarcodeCardProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const truncatedName =
    productName.length > 30 ? productName.slice(0, 30) + "…" : productName;

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: 2in 1in;
            margin: 2mm;
          }
          body * { visibility: hidden; }
          .barcode-print-area,
          .barcode-print-area * { visibility: visible; }
          .barcode-print-area {
            position: fixed;
            top: 0;
            left: 0;
            width: 2in;
          }
        }
      `}</style>

      <Card className="border-brand-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-[#1F1720]">Barcode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <div ref={printRef} className="barcode-print-area flex flex-col items-center">
              <Barcode
                value={sku}
                format="CODE128"
                width={1.5}
                height={60}
                fontSize={12}
                displayValue={true}
              />
              <p className="text-xs text-[#6B5A64] mt-1 text-center">
                {truncatedName}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => handlePrint()}
              className="border-brand-border gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Barcode
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
