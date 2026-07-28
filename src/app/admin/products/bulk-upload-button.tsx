"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { BulkProductUploadModal } from "@/components/admin/bulk-product-upload-modal";
import { useRouter } from "next/navigation";

export function BulkUploadButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold gap-2 h-10 px-4"
      >
        <FileSpreadsheet className="w-4 h-4 text-purple-600" />
        Bulk Upload Excel
      </Button>

      <BulkProductUploadModal
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </>
  );
}
