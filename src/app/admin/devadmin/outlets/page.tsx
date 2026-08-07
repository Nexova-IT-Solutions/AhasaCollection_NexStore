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

interface Outlet {
  id: string;
  name: string;
  isActive: boolean;
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

      toast.success(
        deleteWithContent
          ? `Outlet '${deleteTarget.name}' and all associated products/orders deleted!`
          : `Outlet '${deleteTarget.name}' deleted!`
      );
      setDeleteTarget(null);
      fetchOutlets();
    } catch (error) {
      toast.error("Failed to delete outlet");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Database className="mr-3 h-8 w-8 text-primary" />
          Outlets Management
        </h1>
        <p className="mt-2 text-gray-600">
          Manage system outlets used for retail locations, staff assignments, and access control.
        </p>
      </div>

      {/* Create form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
        <h3 className="font-semibold text-lg mb-4">Add New Outlet</h3>
        <form onSubmit={handleCreate} className="flex space-x-4">
          <input
            type="text"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary px-4 py-2 border text-sm"
            placeholder="Outlet name (e.g., Colombo Outlet)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newName.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Outlet
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-lg text-gray-900">Available Outlets</h3>
        </div>
        {fetching ? (
          <div className="p-8 text-center text-gray-500">Loading outlets...</div>
        ) : outlets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No outlets added yet.</div>
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
                          <span className="text-gray-900 font-medium">{outlet.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              outlet.isActive !== false
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {outlet.isActive !== false ? "Active" : "Disabled (Login Blocked)"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(outlet.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleStatus(outlet)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
                          outlet.isActive !== false
                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        }`}
                        title={
                          outlet.isActive !== false
                            ? "Disable outlet and block tagged users from logging in"
                            : "Enable outlet"
                        }
                      >
                        {outlet.isActive !== false ? "Disable Outlet" : "Enable Outlet"}
                      </button>

                      <button
                        onClick={() => {
                          setEditingId(outlet.id);
                          setEditingName(outlet.name);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
                        title="Edit Outlet Name"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(outlet)}
                        className="p-2 text-red-400 hover:text-red-600 border border-red-100 rounded-md hover:bg-red-50"
                        title="Delete Outlet"
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

      {/* In-App Custom Delete Modal */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-gray-900">
                Delete Outlet Options
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-gray-600 mt-2">
              Choose how you want to delete <span className="font-bold text-gray-900">&quot;{deleteTarget?.name}&quot;</span>. Select an action below:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 space-y-3">
            {/* Option 1: Soft Delete metadata */}
            <div className="rounded-xl border border-gray-200 p-3 bg-gray-50 hover:bg-gray-100/80 transition-colors">
              <p className="text-xs font-bold text-gray-800">Option 1: Delete Outlet Metadata Only</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Deletes the outlet entry. Products and staff will be unassigned without deleting their records.
              </p>
            </div>

            {/* Option 2: Deep Delete outlet + all content */}
            <div className="rounded-xl border border-red-200 p-3 bg-red-50/50 hover:bg-red-50 transition-colors">
              <p className="text-xs font-bold text-red-800">Option 2: Delete Outlet & ALL Related Content</p>
              <p className="text-[11px] text-red-600 mt-0.5">
                Permanently deletes all products tagged to this outlet and all orders made from this outlet.
              </p>
            </div>
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
            {/* Cancel Button */}
            <AlertDialogCancel
              disabled={isDeleting}
              className="w-full sm:w-auto rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </AlertDialogCancel>

            {/* Button 1: Delete Metadata Only */}
            <button
              onClick={() => executeDelete(false)}
              disabled={isDeleting}
              className="w-full sm:w-auto rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete Outlet Only"}
            </button>

            {/* Button 2: Delete Outlet + All Content */}
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
