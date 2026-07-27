"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ReusablePagination } from "@/components/admin/reusable-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { SupplierFormModal } from "./SupplierFormModal";
import type { Supplier } from "@/types/supplier";

interface SupplierTableProps {
  initialSuppliers: Supplier[];
  totalCount: number;
  currentPage: number;
  limit: number;
}

export function SupplierTable({ 
  initialSuppliers,
  totalCount,
  currentPage,
  limit
}: SupplierTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  const refreshSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/suppliers", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers ?? []);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingSupplier(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingSupplier(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    refreshSuppliers();
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/suppliers/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete supplier");
      }

      toast({
        title: "Deleted",
        description: `Supplier "${deleteTarget.name}" has been removed.`,
      });

      setSuppliers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete supplier";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
        <div className="p-4">
          <Skeleton className="h-10 w-40 mb-4" />
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAFAFA] border-b border-brand-border">
              <TableHead className="font-semibold text-[#6B5A64]">Name</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Contact</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Email</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Phone</TableHead>
              <TableHead className="font-semibold text-[#6B5A64]">Products</TableHead>
              <TableHead className="font-semibold text-[#6B5A64] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#A7066A]" />
            <h2 className="text-lg font-bold text-[#1F1720]">
              Suppliers
              <Badge className="ml-2 bg-[#FCEAF4] text-[#A7066A] border-[#A7066A]/20">
                {suppliers.length}
              </Badge>
            </h2>
          </div>
          <Button
            onClick={handleAdd}
            className="bg-[#A7066A] hover:bg-[#8A0558] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </div>

        {suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-12 h-12 text-[#A7066A]/20 mb-4" />
            <p className="text-[#6B5A64] font-medium mb-1">No suppliers found</p>
            <p className="text-sm text-[#6B5A64]/70 mb-4">
              Get started by adding your first supplier.
            </p>
            <Button
              onClick={handleAdd}
              variant="outline"
              className="border-[#A7066A] text-[#A7066A] hover:bg-[#FCEAF4]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Supplier
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FAFAFA] border-b border-brand-border">
                  <TableHead className="font-semibold text-[#6B5A64]">Name</TableHead>
                  <TableHead className="font-semibold text-[#6B5A64]">Contact</TableHead>
                  <TableHead className="font-semibold text-[#6B5A64]">Email</TableHead>
                  <TableHead className="font-semibold text-[#6B5A64]">Phone</TableHead>
                  <TableHead className="font-semibold text-[#6B5A64]">Products</TableHead>
                  <TableHead className="font-semibold text-[#6B5A64] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className="hover:bg-[#FAFAFA]/50 transition-colors"
                  >
                    <TableCell>
                      <Link
                        href={`/en/admin/suppliers/${supplier.id}`}
                        className="font-semibold text-[#1F1720] hover:text-[#A7066A] transition-colors underline-offset-2 hover:underline"
                      >
                        {supplier.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[#6B5A64]">
                      {supplier.contactName}
                    </TableCell>
                    <TableCell className="text-[#6B5A64]">
                      {supplier.email || "—"}
                    </TableCell>
                    <TableCell className="text-[#6B5A64]">
                      {supplier.phoneNumber || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          (supplier._count?.products ?? 0) > 0
                            ? "bg-[#FCEAF4] text-[#A7066A] border-[#A7066A]/20"
                            : "bg-slate-100 text-slate-500"
                        }
                      >
                        {supplier._count?.products ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="h-8 w-8 text-[#A7066A] hover:text-[#8A0558] hover:bg-[#FCEAF4]"
                        >
                          <Link href={`/en/admin/suppliers/${supplier.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(supplier)}
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(supplier)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <ReusablePagination 
          totalItems={totalCount}
          itemsPerPage={limit}
          currentPage={currentPage}
          pageParamKey="page"
          limitParamKey="limit"
        />
      </div>

      {/* Supplier Form Modal */}
      <SupplierFormModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        supplier={editingSupplier}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteTarget?.name}</span>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
