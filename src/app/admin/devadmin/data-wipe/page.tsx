"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { AlertTriangle, Trash2, Database, ShieldAlert } from "lucide-react";

export default function DataWipePage() {
  const { data: session } = useSession();
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  // Only allow DEV_ADMIN
  if (!session || session.user?.role !== "DEV_ADMIN") {
    return (
      <div className="flex h-[50vh] items-center justify-center text-red-500">
        <ShieldAlert className="mr-2 h-6 w-6" />
        <span className="text-xl font-semibold">Unauthorized. DEV_ADMIN role required.</span>
      </div>
    );
  }

  const handleWipe = async () => {
    if (confirmation !== "WIPE PRODUCTION DATA") {
      toast.error("Please type the exact confirmation text.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/devadmin/wipe-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      toast.success("Production data wiped successfully!");
      setConfirmation("");
    } catch (error: any) {
      toast.error(error.message || "Failed to wipe data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Database className="mr-3 h-8 w-8 text-red-600" />
          Production Data Wipe Tool
        </h1>
        <p className="mt-2 text-gray-600">
          Use this tool to completely wipe all test transactions and customer data before going live.
        </p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-bold text-red-800 flex items-center mb-4">
          <AlertTriangle className="mr-2 h-6 w-6" />
          WARNING: DESTRUCTIVE ACTION
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-bold text-red-900 border-b border-red-200 pb-2 mb-2">Will be DELETED forever:</h3>
            <ul className="list-disc pl-5 text-red-700 space-y-1">
              <li>All Orders, Order Items, and Order Histories</li>
              <li>All Return Requests and Reviews</li>
              <li>All Point-of-Sale Shifts and Cash Drawer logs</li>
              <li>All Customer Accounts (Users with 'USER' role)</li>
              <li>All Customer Addresses, Carts, and Ledgers</li>
              <li>All Issued Gift Cards and Redemptions</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-green-900 border-b border-green-200 pb-2 mb-2">Will be KEPT safe:</h3>
            <ul className="list-disc pl-5 text-green-700 space-y-1">
              <li>Product Catalog, Inventory counts, Categories</li>
              <li>Discounts, Suppliers, Occasions, Moods</li>
              <li>Store Configurations, Shipping zones, Payment setups</li>
              <li>All Staff/Admin Accounts (ADMIN, DEV_ADMIN, POS_ADMIN, etc.)</li>
              <li>All Roles and Permission Templates</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-lg mb-2">Confirm Data Wipe</h3>
        <p className="text-sm text-gray-600 mb-4">
          To proceed with the wipe, please type <strong>WIPE PRODUCTION DATA</strong> in the box below.
        </p>
        
        <div className="flex space-x-4">
          <input
            type="text"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 px-4 py-2 border"
            placeholder="WIPE PRODUCTION DATA"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            disabled={loading}
          />
          <button
            onClick={handleWipe}
            disabled={loading || confirmation !== "WIPE PRODUCTION DATA"}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Wiping Data...
              </span>
            ) : (
              <span className="flex items-center">
                <Trash2 className="mr-2 h-4 w-4" />
                Execute Wipe
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
