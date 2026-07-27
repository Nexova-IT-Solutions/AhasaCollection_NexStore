"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Heart, RefreshCw, Trash2, Edit2, CheckCircle, XCircle } from "lucide-react";
import { uploadFile } from "@/utils/supabase";
import Image from "next/image";
import { ReusablePagination } from "@/components/admin/reusable-pagination";

type OccasionData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  isPopular: boolean;
  createdAt: Date;
};

export function OccasionsClient({ 
  initialOccasions,
  totalCount,
  currentPage,
  limit
}: { 
  initialOccasions: OccasionData[];
  totalCount: number;
  currentPage: number;
  limit: number;
}) {
  const { toast } = useToast();
  const [occasions, setOccasions] = useState<OccasionData[]>(initialOccasions);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stagedImages, setStagedImages] = useState<(string | File)[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setStagedImages([]);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Upload image if staged
      let imageUrl = stagedImages.length > 0 ? (typeof stagedImages[0] === 'string' ? stagedImages[0] as string : '') : '';
      if (stagedImages.length > 0 && typeof stagedImages[0] !== 'string') {
        imageUrl = await uploadFile(stagedImages[0], "occasions");
      }

      // 2. Submit to API
      const method = editingId ? "PATCH" : "POST";
      const payload = { id: editingId, name, description, image: imageUrl || null };

      const res = await fetch("/api/admin/occasions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save occasion");
      }

      const savedOccasion = await res.json();

      if (editingId) {
        setOccasions(occasions.map(o => o.id === editingId ? savedOccasion : o));
        toast({ title: "Updated", description: "Occasion saved successfully." });
      } else {
        setOccasions([savedOccasion, ...occasions]);
        toast({ title: "Created", description: "Successfully added occasion to the system." });
      }

      resetForm();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this occasion?")) return;
    try {
      const res = await fetch("/api/admin/occasions", {
        method: "DELETE",
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setOccasions(occasions.filter(o => o.id !== id));
        toast({ title: "Deleted", description: "Occasion permanently removed." });
      }
    } catch { toast({ title: "Error", description: "Failed to delete" }); }
  };

  const handleToggle = async (id: string, field: "isActive" | "isPopular", currentValue: boolean) => {
    try {
      const res = await fetch("/api/admin/occasions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: !currentValue })
      });
      if (res.ok) {
        setOccasions(occasions.map(o => o.id === id ? { ...o, [field]: !currentValue } : o));
        toast({
          title: "Updated",
          description:
            field === "isPopular"
              ? `Show in Trending ${!currentValue ? "enabled" : "disabled"}.`
              : `Occasion is now ${!currentValue ? "active" : "inactive"}.`,
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update occasion", variant: "destructive" });
    }
  };

  const startEdit = (occ: OccasionData) => {
    setEditingId(occ.id);
    setName(occ.name);
    setDescription(occ.description || "");
    setStagedImages(occ.image ? [occ.image] : []);
    setIsAdding(true);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1F1720]">Occasions Setup</h1>
          <p className="text-[#6B5A64] mt-2">Manage gift occasions like Birthdays, Anniversaries, and holidays.</p>
        </div>
        <Button
          onClick={() => { if (isAdding) resetForm(); else setIsAdding(true); }}
          className="bg-[#A7066A] hover:bg-[#8A0558] text-white shrink-0"
        >
          {isAdding ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          {isAdding ? "Close Form" : "Add Occasion"}
        </Button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-border mb-8 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-bold text-[#1F1720] mb-6 flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#A7066A]" /> {editingId ? "Update Occasion" : "New Occasion"}
          </h2>
          <form onSubmit={handleCreateOrUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-[#1F1720]">Occasion Name</label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Valentine's Day" className="mt-1" />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1F1720] mb-2 block">Occasion Thumbnail Graphic</label>
                <div className="bg-[#FAFAFA] p-4 rounded-xl border border-brand-border border-dashed">
                  <ImageUpload 
                     multiple={false} 
                     value={stagedImages} 
                     onChange={(vals) => setStagedImages(vals)} 
                  />
                  <p className="text-[10px] text-gray-500 mt-2 text-center">Images are uploaded only when saving.</p>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[#1F1720]">Description (Optional)</label>
                <textarea
                  className="w-full mt-1 min-h-[80px] flex rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="E.g. Perfect gifts for the perfect couple."
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-brand-border mt-4">
              <Button type="submit" disabled={loading} className="bg-[#A7066A] hover:bg-[#8A0558] text-white px-8">
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Heart className="w-4 h-4 mr-2" />}
                {loading ? "Uploading & Saving..." : editingId ? "Save Changes" : "Create Occasion"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#FAFAFA] border-b border-brand-border text-[#6B5A64]">
              <tr>
                <th className="px-6 py-4 font-semibold w-16">Header</th>
                <th className="px-6 py-4 font-semibold">Occasion Name</th>
                <th className="px-6 py-4 font-semibold">Slug Mapping</th>
                <th className="px-6 py-4 font-semibold">Attributes</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {occasions.map((occ) => (
                <tr key={occ.id} className="hover:bg-[#FAFAFA]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div
                      className="w-10 h-10 rounded-lg bg-cover bg-center shrink-0 bg-gray-100 flex items-center justify-center text-lg font-bold text-[#A7066A] overflow-hidden relative"
                    >
                      {occ.image ? (
                        <Image src={occ.image} alt={occ.name} fill className="object-cover" />
                      ) : (
                        occ.name.charAt(0).toUpperCase()
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[#1F1720]">{occ.name}</div>
                    {occ.description && <div className="text-[#6B5A64] text-xs mt-1 max-w-[300px] truncate">{occ.description}</div>}
                  </td>
                  <td className="px-6 py-4 text-[#6B5A64]">/{occ.slug}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggle(occ.id, "isActive", occ.isActive)} className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border transition-colors ${occ.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                        {occ.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {occ.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <div className="flex items-center gap-2 rounded-md border border-brand-border bg-white px-2.5 py-1.5">
                        <span className="text-[11px] font-semibold text-[#6B5A64]">Show in Trending</span>
                        <Switch
                          checked={occ.isPopular}
                          onCheckedChange={() => handleToggle(occ.id, "isPopular", occ.isPopular)}
                          aria-label={`Show ${occ.name} in Trending`}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(occ)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(occ.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {occasions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#6B5A64]">
                    <Heart className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No occasions have been added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <ReusablePagination 
          totalItems={totalCount}
          itemsPerPage={limit}
          currentPage={currentPage}
          pageParamKey="page"
          limitParamKey="limit"
        />
      </div>
    </div>
  );
}
