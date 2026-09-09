"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ShieldAlert, Database, Plus, Trash2, Edit2, Check, X, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import qz from "qz-tray";
import { initQZSecurity } from "@/lib/qz-init";
import { generateReceiptPdf } from "@/lib/pdf-receipt";

interface Outlet {
  id: string;
  name: string;
  isActive: boolean;
  posPrinterName?: string | null;
  posPrintMode?: string;
  receiptCharWidth?: number;
  receiptLogoWidth?: number;
  receiptLogoHeight?: number;
  receiptPrintArea?: number;
  createdAt: string;
}

export default function OutletsPage() {
  const { data: session } = useSession();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // State for in-app delete modal
  const [deleteTarget, setDeleteTarget] = useState<Outlet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for printer configuration modal
  const [printerTarget, setPrinterTarget] = useState<Outlet | null>(null);
  const [printerForm, setPrinterForm] = useState({
    posPrinterName: "",
    posPrintMode: "raw",
    receiptCharWidth: 34,
    receiptLogoWidth: 200,
    receiptLogoHeight: 80,
    receiptPrintArea: 80,
  });
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [isConnectingQz, setIsConnectingQz] = useState(false);
  const [isSavingPrinter, setIsSavingPrinter] = useState(false);

  // Fetch outlets
  const fetchOutlets = async () => {
    try {
      const res = await fetch("/api/admin/outlets");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOutlets(data);
    } catch (error) {
      toast.error("Failed to load outlets");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === "DEV_ADMIN") {
      fetchOutlets();
    }
  }, [session]);

  // QZ Tray printer discovery for printer modal
  const handleConnectQz = async () => {
    setIsConnectingQz(true);
    try {
      initQZSecurity();
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({ retries: 0 });
      }
      const found = await qz.printers.find();
      setAvailablePrinters(found);
      toast.success("Connected to QZ Tray & found local printers!");
    } catch (err) {
      console.error(err);
      toast.error("Could not connect to QZ Tray. Make sure QZ Tray is running.");
    } finally {
      setIsConnectingQz(false);
    }
  };

  const openPrinterModal = (outlet: Outlet) => {
    setPrinterTarget(outlet);
    setPrinterForm({
      posPrinterName: outlet.posPrinterName || "",
      posPrintMode: outlet.posPrintMode || "raw",
      receiptCharWidth: outlet.receiptCharWidth ?? 34,
      receiptLogoWidth: outlet.receiptLogoWidth ?? 200,
      receiptLogoHeight: outlet.receiptLogoHeight ?? 80,
      receiptPrintArea: outlet.receiptPrintArea ?? 80,
    });
    // Auto-attempt quiet QZ connection
    initQZSecurity();
    if (qz.websocket.isActive()) {
      qz.printers.find().then(setAvailablePrinters).catch(() => {});
    } else {
      qz.websocket.connect({ retries: 0 }).then(() => qz.printers.find()).then(setAvailablePrinters).catch(() => {});
    }
  };

  const handleSavePrinterSettings = async () => {
    if (!printerTarget) return;
    setIsSavingPrinter(true);
    try {
      const res = await fetch("/api/admin/outlets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: printerTarget.id,
          posPrinterName: printerForm.posPrinterName,
          posPrintMode: printerForm.posPrintMode,
          receiptCharWidth: Number(printerForm.receiptCharWidth),
          receiptLogoWidth: Number(printerForm.receiptLogoWidth),
          receiptLogoHeight: Number(printerForm.receiptLogoHeight),
          receiptPrintArea: Number(printerForm.receiptPrintArea),
        }),
      });

      if (!res.ok) throw new Error("Failed to save printer settings");

      toast.success(`Printer settings for ${printerTarget.name} updated live!`);
      setPrinterTarget(null);
      fetchOutlets();
    } catch (error) {
      toast.error("Failed to update printer settings");
    } finally {
      setIsSavingPrinter(false);
    }
  };

  const handleTestBranchPrint = async () => {
    if (!printerForm.posPrinterName) {
      toast.error("Please select or enter a printer name first");
      return;
    }
    try {
      toast.info(`Sending test print to ${printerForm.posPrinterName}...`);
      await generateReceiptPdf({
        orderNumber: `TEST-${printerTarget?.name.toUpperCase().replace(/\s+/g, '-')}`,
        total: 1250.00,
        subtotal: 1250.00,
        changeDue: 0,
        paymentMethod: "CASH",
        date: new Date().toLocaleString(),
        customerName: "Branch Test Customer",
        items: [
          { name: "Branch Test Book Item", sku: "TEST-001", quantity: 1, price: 1250.00 }
        ],
        companyDetails: {
          companyName: "Ahasa Mediaworks (Pvt) Ltd.",
          address: "No 188, 8A High Level Rd, Maharagama 10280",
          mobileNumber: "+94 76 058 8688",
          email: "ahasabooks15@gmail.com",
          website: "www.ahasabooks.lk",
          posPrinterName: printerForm.posPrinterName,
          posPrintMode: printerForm.posPrintMode,
          receiptCharWidth: printerForm.receiptCharWidth,
          receiptLogoWidth: printerForm.receiptLogoWidth,
          receiptLogoHeight: printerForm.receiptLogoHeight,
          receiptPrintArea: printerForm.receiptPrintArea,
        },
      }, "print");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send test print.");
    }
  };

  // Only allow DEV_ADMIN
  if (!session || session.user?.role !== "DEV_ADMIN") {
    return (
      <div className="flex h-[50vh] items-center justify-center text-red-500">
        <ShieldAlert className="mr-2 h-6 w-6" />
        <span className="text-xl font-semibold">Unauthorized. DEV_ADMIN role required.</span>
      </div>
    );
  }

  // Create outlet
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) throw new Error("Failed to create");

      toast.success("Outlet created successfully!");
      setNewName("");
      fetchOutlets();
    } catch (error) {
      toast.error("Failed to create outlet");
    } finally {
      setLoading(false);
    }
  };

  // Edit outlet
  const handleEdit = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      const res = await fetch("/api/admin/outlets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editingName }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success("Outlet updated successfully!");
      setEditingId(null);
      setEditingName("");
      fetchOutlets();
    } catch (error) {
      toast.error("Failed to update outlet");
    }
  };

  // Toggle active/disabled status
  const handleToggleStatus = async (outlet: Outlet) => {
    const nextStatus = !outlet.isActive;
    try {
      const res = await fetch("/api/admin/outlets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: outlet.id, isActive: nextStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(
        nextStatus
          ? `Outlet '${outlet.name}' enabled!`
          : `Outlet '${outlet.name}' disabled! Users tagged to this outlet are now blocked from logging in.`
      );
      fetchOutlets();
    } catch (error) {
      toast.error("Failed to toggle outlet status");
    }
  };

  // Delete outlet handler with deleteWithContent flag
  const executeDelete = async (deleteWithContent: boolean) => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/outlets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id, deleteWithContent }),
      });

      if (!res.ok) throw new Error("Failed to delete outlet");

      toast.success("Outlet deleted successfully!");
      setDeleteTarget(null);
      fetchOutlets();
    } catch (error) {
      toast.error("Failed to delete outlet");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Database className="mr-3 h-8 w-8 text-indigo-600" />
          Branch & Outlet Management
        </h1>
        <p className="mt-2 text-gray-600">
          Manage system branches, assign dedicated POS receipt printers, and adjust alignment settings per location.
        </p>
      </div>

      {/* Create form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-lg text-gray-900 mb-4">Add New Branch / Outlet</h3>
        <form onSubmit={handleCreate} className="flex gap-4">
          <input
            type="text"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border text-sm"
            placeholder="Branch Name (e.g., Maharagama Branch, Kandy Outlet)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newName.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Branch
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-lg text-gray-900">Available Branches</h3>
        </div>
        {fetching ? (
          <div className="p-8 text-center text-gray-500">Loading branches...</div>
        ) : outlets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No branches added yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {outlets.map((outlet) => (
              <li key={outlet.id} className="p-6 flex items-center justify-between">
                {editingId === outlet.id ? (
                  <div className="flex items-center space-x-4 flex-1 mr-4">
                    <input
                      type="text"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary px-3 py-1.5 border text-sm"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                    <button
                      onClick={() => handleEdit(outlet.id)}
                      className="text-green-600 hover:text-green-800 p-1"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditingName("");
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-bold text-base">{outlet.name}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              outlet.isActive !== false
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {outlet.isActive !== false ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            <Printer className="h-3.5 w-3.5 text-indigo-600" />
                            {outlet.posPrinterName ? `Printer: ${outlet.posPrinterName}` : "Default System Printer"}
                          </span>
                          <span className="text-gray-400">|</span>
                          <span>Print Width: {outlet.receiptPrintArea ?? 80}mm</span>
                          <span className="text-gray-400">|</span>
                          <span>Char Width: {outlet.receiptCharWidth ?? 34}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openPrinterModal(outlet)}
                        className="px-3 py-1.5 rounded-md text-xs font-bold transition-colors bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Configure Printer & Alignment
                      </button>

                      <button
                        onClick={() => handleToggleStatus(outlet)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
                          outlet.isActive !== false
                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        {outlet.isActive !== false ? "Disable" : "Enable"}
                      </button>

                      <button
                        onClick={() => {
                          setEditingId(outlet.id);
                          setEditingName(outlet.name);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
                        title="Edit Branch Name"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(outlet)}
                        className="p-2 text-red-400 hover:text-red-600 border border-red-100 rounded-md hover:bg-red-50"
                        title="Delete Branch"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Branch Printer Configuration Dialog */}
      <AlertDialog open={!!printerTarget} onOpenChange={(open) => !open && setPrinterTarget(null)}>
        <AlertDialogContent className="max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 border-b pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-gray-900">
                  {printerTarget?.name} - Receipt Printer & Alignment
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-gray-500">
                  Assign a hardware printer and adjust paper alignment parameters for this branch.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="space-y-4 text-sm text-gray-700 max-h-[60vh] overflow-y-auto pr-1">
            {/* Printer Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-xs uppercase text-slate-700">Printer Name / IP</label>
                <button
                  type="button"
                  onClick={handleConnectQz}
                  disabled={isConnectingQz}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  {isConnectingQz ? "Connecting QZ..." : "Fetch QZ Printers"}
                </button>
              </div>
              {availablePrinters.length > 0 ? (
                <select
                  value={printerForm.posPrinterName}
                  onChange={(e) => setPrinterForm({ ...printerForm, posPrinterName: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">-- Use Default System Printer --</option>
                  {availablePrinters.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. XP-80C or tcp://192.168.1.100:9100"
                  value={printerForm.posPrinterName}
                  onChange={(e) => setPrinterForm({ ...printerForm, posPrinterName: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              )}
            </div>

            {/* Print Mode */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs uppercase text-slate-700">Printer Format Mode</label>
              <select
                value={printerForm.posPrintMode}
                onChange={(e) => setPrinterForm({ ...printerForm, posPrintMode: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="raw">ESC/POS Text Mode (Fast, standard ESC-POS thermal text)</option>
                <option value="raster">Raster Graphics Mode (Pixel perfect layout / images)</option>
              </select>
            </div>

            {/* Alignment Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <div className="space-y-1">
                <label className="font-bold text-xs text-slate-700">Print Paper Width (mm)</label>
                <input
                  type="number"
                  value={printerForm.receiptPrintArea}
                  onChange={(e) => setPrinterForm({ ...printerForm, receiptPrintArea: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
                  placeholder="80 or 58"
                />
                <span className="text-[10px] text-gray-400">Standard: 80mm or 58mm roll width</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-xs text-slate-700">Characters Per Line (Text Mode)</label>
                <input
                  type="number"
                  value={printerForm.receiptCharWidth}
                  onChange={(e) => setPrinterForm({ ...printerForm, receiptCharWidth: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
                  placeholder="34"
                />
                <span className="text-[10px] text-gray-400">80mm = 34-42, 58mm = 24-32</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-xs text-slate-700">Logo Max Width (px)</label>
                <input
                  type="number"
                  value={printerForm.receiptLogoWidth}
                  onChange={(e) => setPrinterForm({ ...printerForm, receiptLogoWidth: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
                  placeholder="200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-xs text-slate-700">Logo Max Height (px)</label>
                <input
                  type="number"
                  value={printerForm.receiptLogoHeight}
                  onChange={(e) => setPrinterForm({ ...printerForm, receiptLogoHeight: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
                  placeholder="80"
                />
              </div>
            </div>
          </div>

          <AlertDialogFooter className="flex items-center justify-between border-t pt-3 gap-2">
            <button
              type="button"
              onClick={handleTestBranchPrint}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
            >
              Test Print Settings
            </button>

            <div className="flex gap-2">
              <AlertDialogCancel className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-medium">
                Cancel
              </AlertDialogCancel>
              <button
                type="button"
                onClick={handleSavePrinterSettings}
                disabled={isSavingPrinter}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSavingPrinter ? "Saving..." : "Save Settings Live"}
              </button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* In-App Custom Delete Modal */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-gray-900">
                Delete Branch Options
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-gray-600 mt-2">
              Choose how you want to delete <span className="font-bold text-gray-900">&quot;{deleteTarget?.name}&quot;</span>. Select an action below:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 space-y-3">
            {/* Option 1: Soft Delete metadata */}
            <div className="rounded-xl border border-gray-200 p-3 bg-gray-50 hover:bg-gray-100/80 transition-colors">
              <p className="text-xs font-bold text-gray-800">Option 1: Delete Branch Metadata Only</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Deletes the branch entry. Products and staff will be unassigned without deleting their records.
              </p>
            </div>

            {/* Option 2: Deep Delete outlet + all content */}
            <div className="rounded-xl border border-red-200 p-3 bg-red-50/50 hover:bg-red-50 transition-colors">
              <p className="text-xs font-bold text-red-800">Option 2: Delete Branch & ALL Related Content</p>
              <p className="text-[11px] text-red-600 mt-0.5">
                Permanently deletes all products tagged to this branch and all orders made from this branch.
              </p>
            </div>
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
            <AlertDialogCancel
              disabled={isDeleting}
              className="w-full sm:w-auto rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </AlertDialogCancel>

            <button
              onClick={() => executeDelete(false)}
              disabled={isDeleting}
              className="w-full sm:w-auto rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete Branch Only"}
            </button>

            <button
              onClick={() => executeDelete(true)}
              disabled={isDeleting}
              className="w-full sm:w-auto rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? "Purging..." : "Delete All Content"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
