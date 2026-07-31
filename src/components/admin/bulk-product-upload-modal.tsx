"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type BulkProductUploadModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function BulkProductUploadModal({
  open,
  onOpenChange,
  onSuccess,
}: BulkProductUploadModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [targetDestination, setTargetDestination] = useState<string>("default");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    createdCount: number;
    errors: string[];
    message: string;
  } | null>(null);

  const { data: repositoriesData } = useSWR(open ? "/api/admin/repositories" : null, fetcher);
  const { data: outletsData } = useSWR(open ? "/api/admin/outlets" : null, fetcher);

  const repositories = Array.isArray(repositoriesData) ? repositoriesData : [];
  const outlets = Array.isArray(outletsData) ? outletsData : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select an Excel or CSV file.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (targetDestination.startsWith("repo:")) {
        formData.append("targetRepositoryId", targetDestination.replace("repo:", ""));
      } else if (targetDestination.startsWith("outlet:")) {
        formData.append("targetOutletId", targetDestination.replace("outlet:", ""));
      }

      const res = await fetch("/api/admin/products/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Bulk upload failed");
      }

      setResult({
        createdCount: data.createdCount || 0,
        errors: data.errors || [],
        message: data.message || "Bulk import completed",
      });

      toast({
        title: "Bulk Upload Successful!",
        description: data.message,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      toast({
        title: "Bulk Upload Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-[#1F1720]">
            <FileSpreadsheet className="w-5 h-5 text-[#A7066A]" />
            Bulk Product Upload via Excel
          </DialogTitle>
          <DialogDescription>
            Import multiple products at once into live catalog inventory using an Excel spreadsheet (.xlsx or .csv).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs">
          {/* Download Template Step */}
          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-800 text-xs">1. Download Template</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Use pre-formatted Excel template with correct column names.
              </p>
            </div>
            <a href="/api/admin/products/bulk-upload/template" download>
              <Button size="sm" variant="outline" className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-100 font-semibold text-xs shrink-0">
                <Download className="w-3.5 h-3.5" />
                Template .xlsx
              </Button>
            </a>
          </div>

          {/* Target Location Step */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 text-xs block">
              2. Select Target Stock Location (Outlet or Warehouse)
            </label>
            <select
              value={targetDestination}
              onChange={(e) => setTargetDestination(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 bg-white text-xs px-3 py-1.5 font-medium text-slate-800 focus:border-[#A7066A] focus:outline-none"
            >
              <option value="default">Default Warehouse (Warehouse One / As defined in Excel)</option>
              {repositories.length > 0 && (
                <optgroup label="Warehouses / Repositories">
                  {repositories.map((repo: any) => (
                    <option key={repo.id} value={`repo:${repo.id}`}>
                      🏬 {repo.name} {repo.code ? `(${repo.code})` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {outlets.length > 0 && (
                <optgroup label="Store Outlets">
                  {outlets.map((outlet: any) => (
                    <option key={outlet.id} value={`outlet:${outlet.id}`}>
                      🏪 Outlet: {outlet.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Upload Dropzone Step */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 text-xs block">
              3. Choose Excel or CSV File
            </label>
            <div className="relative border-2 border-dashed border-brand-border rounded-xl p-6 bg-slate-50/60 hover:bg-slate-100/70 transition-colors text-center cursor-pointer">
              <Upload className="w-8 h-8 text-[#A7066A] mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-800 text-xs">
                {file ? file.name : "Click to select or drag & drop .xlsx / .csv file"}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports Excel (.xlsx) and CSV (.csv)"}
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Results Box */}
          {result && (
            <div className="p-3 rounded-xl border bg-slate-50 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{result.message}</span>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Warnings / Skipped Rows:
                  </p>
                  <ul className="text-[10px] text-slate-600 max-h-24 overflow-y-auto space-y-0.5 pl-4 list-disc">
                    {result.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleUploadSubmit}
            disabled={!file || isUploading}
            className="bg-[#A7066A] hover:bg-[#8A0558] text-white font-bold gap-1.5"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Start Bulk Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
