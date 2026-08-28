"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { AlertTriangle, Trash2, Database, ShieldAlert, CheckSquare, Square, Info } from "lucide-react";

export default function DataWipePage() {
  const { data: session } = useSession();
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  // Checkbox selections for selective wipe
  const [targets, setTargets] = useState({
    wipeOrders: true,
    wipePurchaseOrders: false,
    wipeProducts: false,
    wipeCategories: false,
    wipeOutlets: false,
    wipeRepositories: false,
    wipeUsers: true,
  });

  // Only allow DEV_ADMIN
  if (!session || session.user?.role !== "DEV_ADMIN") {
    return (
      <div className="flex h-[50vh] items-center justify-center text-red-500">
        <ShieldAlert className="mr-2 h-6 w-6" />
        <span className="text-xl font-semibold">Unauthorized. DEV_ADMIN role required.</span>
      </div>
    );
  }

  const toggleTarget = (key: keyof typeof targets) => {
    setTargets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    setTargets({
      wipeOrders: true,
      wipePurchaseOrders: true,
      wipeProducts: true,
      wipeCategories: true,
      wipeOutlets: true,
      wipeRepositories: true,
      wipeUsers: true,
    });
  };

  const selectNone = () => {
    setTargets({
      wipeOrders: false,
      wipePurchaseOrders: false,
      wipeProducts: false,
      wipeCategories: false,
      wipeOutlets: false,
      wipeRepositories: false,
      wipeUsers: false,
    });
  };

  const hasAnySelected = Object.values(targets).some(Boolean);

  const handleWipe = async () => {
    if (confirmation !== "WIPE PRODUCTION DATA") {
      toast.error("Please type the exact confirmation text.");
      return;
    }

    if (!hasAnySelected) {
      toast.error("Please select at least one data category to wipe.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/devadmin/wipe-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation, targets }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      toast.success("Selected data wiped successfully!");
      setConfirmation("");
    } catch (error: any) {
      toast.error(error.message || "Failed to wipe data");
    } finally {
      setLoading(false);
    }
  };

  const options: Array<{ key: keyof typeof targets; label: string; desc: string; isDanger?: boolean }> = [
    { key: "wipeOrders", label: "Orders & POS Sales", desc: "Order histories, items, returns, POS shifts, and gift card redemptions" },
    { key: "wipePurchaseOrders", label: "Purchase Orders & Receipts", desc: "PO requests, supplier receipts, and supplier payment history" },
    { key: "wipeProducts", label: "Product Catalog & Stock", desc: "All product listings, variants, images, and inventory stock counts", isDanger: true },
    { key: "wipeCategories", label: "Categories", desc: "Category tree structure (requires wiping products first or together)", isDanger: true },
    { key: "wipeOutlets", label: "Outlets", desc: "Store outlets (requires wiping products first or together)", isDanger: true },
    { key: "wipeRepositories", label: "Warehouses / Repositories", desc: "Storage repositories (requires wiping products first or together)", isDanger: true },
    { key: "wipeUsers", label: "Customer Accounts", desc: "User accounts with 'USER' role, addresses, and customer ledgers" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Database className="mr-3 h-8 w-8 text-red-600" />
          Selective Production Data Wipe Tool
        </h1>
        <p className="mt-2 text-gray-600">
          Select specific data components you wish to wipe before going live or resetting environments.
        </p>
      </div>

      {/* Target Selection Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-base font-bold text-gray-800">Select Data Categories to Wipe</h2>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              type="button"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-md border border-blue-100"
            >
              Select All
            </button>
            <button
              onClick={selectNone}
              type="button"
              className="text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-50 px-3 py-1 rounded-md border border-gray-200"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {options.map((opt) => {
            const isChecked = targets[opt.key];
            return (
              <div
                key={opt.key}
                onClick={() => toggleTarget(opt.key)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isChecked
                    ? opt.isDanger
                      ? "border-red-300 bg-red-50/40 text-red-950"
                      : "border-blue-300 bg-blue-50/30 text-slate-900"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isChecked ? (
                    <CheckSquare className={`h-5 w-5 ${opt.isDanger ? "text-red-600" : "text-blue-600"}`} />
                  ) : (
                    <Square className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold flex items-center gap-1.5">
                    {opt.label}
                    {opt.isDanger && isChecked && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">Destructive</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 leading-snug">{opt.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <Info className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Note: Database foreign keys require cascading. Selecting Products or Outlets will automatically clear related transactional records.
          </span>
        </div>
      </div>

      {/* Confirmation & Execution Card */}
      <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-lg text-red-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Confirm Data Wipe Action
        </h3>
        <p className="text-sm text-gray-600">
          To confirm wiping the selected categories above, please type <strong>WIPE PRODUCTION DATA</strong> in the box below.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            className="flex-1 rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 px-4 py-2.5 border text-sm"
            placeholder="WIPE PRODUCTION DATA"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            disabled={loading}
          />
          <button
            onClick={handleWipe}
            disabled={loading || confirmation !== "WIPE PRODUCTION DATA" || !hasAnySelected}
            className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Wiping Data...
              </span>
            ) : (
              <span className="flex items-center">
                <Trash2 className="mr-2 h-4 w-4" />
                Execute Selected Wipe
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
