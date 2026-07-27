"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Edit2, Plus, RefreshCw, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/utils/supabase";

type GiftWrapData = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

const formatPrice = (value: number) => `LKR ${value.toLocaleString()}`;

export function WrappingsClient({ initialWrappings }: { initialWrappings: GiftWrapData[] }) {
  const { toast } = useToast();
  const [wrappings, setWrappings] = useState<GiftWrapData[]>(initialWrappings);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [stagedImages, setStagedImages] = useState<(string | File)[]>([]);

  const isEditing = Boolean(editingId);

  const activeCount = useMemo(() => wrappings.filter((wrap) => wrap.isActive).length, [wrappings]);

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
    setIsActive(true);
    setStagedImages([]);
  };

  const startEdit = (wrap: GiftWrapData) => {
    setIsAdding(true);
    setEditingId(wrap.id);
    setName(wrap.name);
    setDescription(wrap.description || "");
    setPrice(String(wrap.price));
    setIsActive(wrap.isActive);
    setStagedImages(wrap.imageUrl ? [wrap.imageUrl] : []);
  };

  const handleCreateOrUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numericPrice = Number(price);
    if (!name.trim()) {
      toast({ title: "Validation error", description: "Name is required", variant: "destructive" });
      return;
    }

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      toast({ title: "Validation error", description: "Price must be a valid positive number", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      let imageUrl = typeof stagedImages[0] === "string" ? stagedImages[0] : "";
      if (stagedImages.length > 0 && typeof stagedImages[0] !== "string") {
        imageUrl = await uploadFile(stagedImages[0], "wrappings");
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: numericPrice,
        imageUrl: imageUrl || null,
        isActive,
      };

      const url = isEditing ? `/api/admin/wrappings/${editingId}` : "/api/admin/wrappings";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to save wrapping");
      }

      if (isEditing) {
        setWrappings((prev) => prev.map((wrap) => (wrap.id === editingId ? data : wrap)));
        toast({ title: "Updated", description: "Wrapping option updated" });
      } else {
        setWrappings((prev) => [data, ...prev]);
        toast({ title: "Created", description: "Wrapping option added" });
      }

      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to save wrapping", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this wrapping option?")) return;

    try {
      const response = await fetch(`/api/admin/wrappings/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.message || "Failed to delete");
      }

      setWrappings((prev) => prev.filter((wrap) => wrap.id !== id));
      toast({ title: "Deleted", description: "Wrapping option removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to delete", variant: "destructive" });
    }
  };

  const toggleActive = async (wrap: GiftWrapData) => {
    try {
      const response = await fetch(`/api/admin/wrappings/${wrap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !wrap.isActive }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.message || "Failed to update status");
      }

      const updated = await response.json();
      setWrappings((prev) => prev.map((item) => (item.id === wrap.id ? updated : item)));
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update status", variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1F1720]">Gift Wrapping Settings</h1>
          <p className="mt-2 text-[#6B5A64]">Manage premium wrapping options shown in checkout.</p>
          <p className="mt-1 text-sm text-[#6B5A64]">{activeCount} active option{activeCount === 1 ? "" : "s"}</p>
        </div>
        <Button
          onClick={() => {
            if (isAdding) resetForm();
            else setIsAdding(true);
          }}
          className="bg-[#A7066A] text-white hover:bg-[#8A0558]"
        >
          {isAdding ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {isAdding ? "Close Form" : "Add Wrapping"}
        </Button>
      </div>

      {isAdding ? (
        <Card className="mb-8 rounded-2xl border border-gray-150 bg-white shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-base font-semibold text-gray-900">{isEditing ? "Edit Wrapping" : "Add Wrapping"}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="space-y-5" onSubmit={handleCreateOrUpdate}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wrap-name" required className="text-xs font-bold text-slate-400 uppercase tracking-wider">Name</Label>
                  <Input id="wrap-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Luxury Rose Wrap" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wrap-price" required className="text-xs font-bold text-slate-400 uppercase tracking-wider">Price (LKR)</Label>
                  <Input id="wrap-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="250" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wrap-description" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</Label>
                <Textarea
                  id="wrap-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Matte paper with satin ribbon"
                  className="min-h-[90px]"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preview Image</Label>
                <ImageUpload value={stagedImages} onChange={setStagedImages} multiple={false} />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-gray-150 bg-white p-4 text-sm text-gray-900 w-full cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#A7066A] focus:ring-[#A7066A]/20" />
                <span>Show this wrapping option at checkout</span>
              </label>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading} className="bg-[#A7066A] text-white hover:bg-[#8A0558] h-11 px-6 rounded-xl">
                  {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isEditing ? "Save Changes" : "Create Wrapping"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {wrappings.map((wrap) => (
          <Card key={wrap.id} className="rounded-2xl border border-gray-150 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
            <CardContent className="p-4">
              <div className="mb-3 overflow-hidden rounded-xl border border-gray-150 bg-slate-50">
                <div className="relative h-40 w-full">
                  {wrap.imageUrl ? (
                    <Image src={wrap.imageUrl} alt={wrap.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#6B5A64]">No image</div>
                  )}
                </div>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-gray-900">{wrap.name}</p>
                  <p className="text-sm text-[#A7066A] font-semibold mt-0.5">{formatPrice(wrap.price)}</p>
                </div>
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold border inline-block",
                  wrap.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-700 border-slate-200"
                )}>
                  {wrap.isActive ? "Active" : "Hidden"}
                </span>
              </div>

              {wrap.description ? <p className="mt-2 text-xs text-slate-500 font-medium line-clamp-2">{wrap.description}</p> : null}

              <div className="mt-4 flex items-center gap-2 pt-2 border-t border-gray-100">
                <Button variant="outline" size="sm" onClick={() => startEdit(wrap)} className="border-gray-205 h-9 rounded-lg">
                  <Edit2 className="mr-2 h-3.5 w-3.5 text-blue-600" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleActive(wrap)} className="border-gray-205 h-9 rounded-lg">
                  {wrap.isActive ? <ToggleLeft className="mr-2 h-3.5 w-3.5 text-slate-500" /> : <ToggleRight className="mr-2 h-3.5 w-3.5 text-emerald-600" />}
                  {wrap.isActive ? "Hide" : "Activate"}
                </Button>
                <Button variant="outline" size="sm" className="border-gray-250 hover:bg-red-50 text-red-600 h-9 rounded-lg" onClick={() => handleDelete(wrap.id)}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
