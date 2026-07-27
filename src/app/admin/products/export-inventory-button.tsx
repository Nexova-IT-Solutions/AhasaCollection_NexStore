"use client";

import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ExportInventoryButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products/export");
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Unauthorized to export inventory.");
        }
        throw new Error("Failed to export inventory.");
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Inventory_Backup_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Inventory exported successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to export inventory");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      variant="outline"
      className="border-[#A7066A] text-[#A7066A] hover:bg-[#A7066A]/10 hover:text-[#A7066A] w-full md:w-auto"
    >
      {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
      Export Inventory
    </Button>
  );
}
