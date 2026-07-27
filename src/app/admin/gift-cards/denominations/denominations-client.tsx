"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  MoreHorizontal
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Denomination {
  id: string;
  value: number;
  isActive: boolean;
  sortOrder: number;
}

interface DenominationsClientProps {
  initialData: Denomination[];
}

export function DenominationsClient({ initialData }: DenominationsClientProps) {
  const router = useRouter();
  const [denominations, setDenominations] = useState<Denomination[]>(initialData);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDenomination, setSelectedDenomination] = useState<Denomination | null>(null);

  const [formData, setFormData] = useState({
    value: "",
    sortOrder: "0",
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/gift-cards/denominations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: parseFloat(formData.value),
          sortOrder: parseInt(formData.sortOrder) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to add denomination");
      }

      toast.success("Denomination added successfully");
      setIsAddDialogOpen(false);
      setFormData({ value: "", sortOrder: "0" });
      router.refresh();
      // Update local state for optimistic UI or just refetch
      const newData = await fetch("/api/admin/gift-cards/denominations").then(r => r.json());
      setDenominations(newData);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDenomination) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/gift-cards/denominations/${selectedDenomination.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: parseFloat(formData.value),
          sortOrder: parseInt(formData.sortOrder) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update denomination");
      }

      toast.success("Denomination updated successfully");
      setIsEditDialogOpen(false);
      setSelectedDenomination(null);
      router.refresh();
      const newData = await fetch("/api/admin/gift-cards/denominations").then(r => r.json());
      setDenominations(newData);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDenomination) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/gift-cards/denominations/${selectedDenomination.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete denomination");

      toast.success("Denomination deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedDenomination(null);
      router.refresh();
      const newData = await fetch("/api/admin/gift-cards/denominations").then(r => r.json());
      setDenominations(newData);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/gift-cards/denominations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(`Denomination ${!currentStatus ? "activated" : "deactivated"}`);
      
      // Optimistic local update
      setDenominations(denominations.map(d => 
        d.id === id ? { ...d, isActive: !currentStatus } : d
      ));
      
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button 
          onClick={() => {
            setFormData({ value: "", sortOrder: "0" });
            setIsAddDialogOpen(true);
          }}
          className="bg-[#A7066A] hover:bg-[#8A0558] text-white shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Denomination
        </Button>
      </div>

      <Card className="border-brand-border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-brand-border hover:bg-transparent">
                <TableHead className="font-bold text-[#1F1720]">Value</TableHead>
                <TableHead className="font-bold text-[#1F1720]">Status</TableHead>
                <TableHead className="font-bold text-[#1F1720]">Sort Order</TableHead>
                <TableHead className="w-[100px] text-right font-bold text-[#1F1720]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {denominations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                    No denominations found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                denominations.map((den) => (
                  <TableRow key={den.id} className="border-brand-border hover:bg-slate-50/30">
                    <TableCell className="font-bold text-[#1F1720]">
                      {formatPrice(den.value)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={den.isActive} 
                          onCheckedChange={() => toggleStatus(den.id, den.isActive)}
                        />
                        {den.isActive ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none">
                            <XCircle className="w-3 h-3 mr-1" /> Inactive
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{den.sortOrder}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 border-brand-border">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={() => {
                              setSelectedDenomination(den);
                              setFormData({ value: den.value.toString(), sortOrder: den.sortOrder.toString() });
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => {
                              setSelectedDenomination(den);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px] border-brand-border">
          <DialogHeader>
            <DialogTitle>Add Denomination</DialogTitle>
            <DialogDescription>
              Create a new price option for gift cards.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="value">Amount (LKR)</Label>
              <Input 
                id="value" 
                type="number" 
                min="100" 
                required
                value={formData.value}
                onChange={(e) => setFormData({...formData, value: e.target.value})}
                placeholder="e.g. 1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input 
                id="sortOrder" 
                type="number" 
                value={formData.sortOrder}
                onChange={(e) => setFormData({...formData, sortOrder: e.target.value})}
                placeholder="0"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-[#A7066A] hover:bg-[#8A0558]"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Denomination
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] border-brand-border">
          <DialogHeader>
            <DialogTitle>Edit Denomination</DialogTitle>
            <DialogDescription>
              Update the value or sort order.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-value">Amount (LKR)</Label>
              <Input 
                id="edit-value" 
                type="number" 
                min="100" 
                required
                value={formData.value}
                onChange={(e) => setFormData({...formData, value: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sortOrder">Sort Order</Label>
              <Input 
                id="edit-sortOrder" 
                type="number" 
                value={formData.sortOrder}
                onChange={(e) => setFormData({...formData, sortOrder: e.target.value})}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-[#A7066A] hover:bg-[#8A0558]"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border-brand-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {selectedDenomination && formatPrice(selectedDenomination.value)} denomination. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
