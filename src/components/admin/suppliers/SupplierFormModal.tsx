"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, RefreshCw } from "lucide-react";
import type { Supplier } from "@/types/supplier";
import { supplierSchema, type SupplierSchemaType } from "@/lib/validations/supplier";

interface SupplierFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null;
}

export function SupplierFormModal({
  open,
  onClose,
  onSuccess,
  supplier,
}: SupplierFormModalProps) {
  const { toast } = useToast();
  const isEdit = !!supplier;
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierSchemaType>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phoneNumber: "",
      address: "",
    },
  });

  // Reset form when supplier prop changes or modal opens
  useEffect(() => {
    if (open) {
      reset({
        name: supplier?.name ?? "",
        contactName: supplier?.contactName ?? "",
        email: supplier?.email ?? "",
        phoneNumber: supplier?.phoneNumber ?? "",
        address: supplier?.address ?? "",
      });
    }
  }, [supplier, open, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
    }
  };

  const onSubmit = async (data: SupplierSchemaType) => {
    setLoading(true);

    try {
      const url = isEdit
        ? `/api/admin/suppliers/${supplier.id}`
        : "/api/admin/suppliers";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.message || `Failed to ${isEdit ? "update" : "create"} supplier`
        );
      }

      toast({
        title: isEdit ? "Supplier Updated" : "Supplier Created",
        description: isEdit
          ? `"${data.name.trim()}" has been updated successfully.`
          : `"${data.name.trim()}" has been added to your suppliers.`,
      });

      onSuccess();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Request failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#A7066A]" />
            {isEdit ? "Edit Supplier" : "Add New Supplier"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the supplier details below."
              : "Fill in the supplier details to add them to your system."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label
              htmlFor="supplier-name"
              className="text-sm font-semibold text-[#1F1720]"
            >
              Supplier Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="supplier-name"
              {...register("name")}
              placeholder="e.g. Lanka Crafts Pvt Ltd"
              className="h-11 border-brand-border"
            />
            {errors.name && (
              <p className="text-sm text-destructive font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="contact-name"
              className="text-sm font-semibold text-[#1F1720]"
            >
              Contact Name
            </Label>
            <Input
              id="contact-name"
              {...register("contactName")}
              placeholder="e.g. John Fernando"
              className="h-11 border-brand-border"
            />
            {errors.contactName && (
              <p className="text-sm text-destructive font-medium">{errors.contactName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="supplier-email"
                className="text-sm font-semibold text-[#1F1720]"
              >
                Email
              </Label>
              <Input
                id="supplier-email"
                type="email"
                {...register("email")}
                placeholder="supplier@example.com"
                className="h-11 border-brand-border"
              />
              {errors.email && (
                <p className="text-sm text-destructive font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="supplier-phone"
                className="text-sm font-semibold text-[#1F1720]"
              >
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="supplier-phone"
                {...register("phoneNumber")}
                placeholder="e.g. 0771234567"
                className="h-11 border-brand-border"
              />
              {errors.phoneNumber && (
                <p className="text-sm text-destructive font-medium">{errors.phoneNumber.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="supplier-address"
              className="text-sm font-semibold text-[#1F1720]"
            >
              Address
            </Label>
            <textarea
              id="supplier-address"
              {...register("address")}
              placeholder="123 Main Street, Colombo 07"
              rows={3}
              className="w-full flex rounded-md border border-brand-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A] resize-none"
            />
            {errors.address && (
              <p className="text-sm text-destructive font-medium">{errors.address.message}</p>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-brand-border">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="text-[#6B5A64]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#A7066A] hover:bg-[#8A0558] text-white px-6"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Building2 className="w-4 h-4 mr-2" />
              )}
              {loading
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Add Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
