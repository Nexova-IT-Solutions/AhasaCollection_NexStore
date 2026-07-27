"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, FolderTree, RefreshCw, Trash2, Edit2, CheckCircle, XCircle, ImageIcon, ChevronRight, ChevronDown } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { uploadFile } from "@/utils/supabase";
import Image from "next/image";
import { ReusablePagination } from "@/components/admin/reusable-pagination";

type CategoryData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  parent: CategoryData | null;
  children: CategoryData[];
  isActive: boolean;
  isPopular: boolean;
  createdAt: Date;
};

export function CategoriesClient({ 
  initialCategories,
  totalCount,
  currentPage,
  limit
}: { 
  initialCategories: CategoryData[];
  totalCount: number;
  currentPage: number;
  limit: number;
}) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryData[]>(initialCategories);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stagedImages, setStagedImages] = useState<(string | File)[]>([]);
  const [parentId, setParentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const categoriesByParent = useMemo(() => {
    const grouped = new Map<string | null, CategoryData[]>();

    for (const category of categories) {
      const key = category.parentId ?? null;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(category);
    }

    for (const [, list] of grouped) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return grouped;
  }, [categories]);

  const rootCategories = useMemo(() => categoriesByParent.get(null) || [], [categoriesByParent]);

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setStagedImages([]);
    setParentId("");
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Upload images if they are File objects
      let imageUrl = stagedImages.length > 0 ? (typeof stagedImages[0] === 'string' ? stagedImages[0] as string : '') : '';
      
      if (stagedImages.length > 0 && typeof stagedImages[0] !== 'string') {
        imageUrl = await uploadFile(stagedImages[0], "categories");
      }

      // 2. Submit to API
      const method = editingId ? "PATCH" : "POST";
      const payload = { 
        id: editingId, 
        name, 
        description, 
        image: imageUrl, 
        parentId: parentId || null 
      };

      const res = await fetch("/api/admin/categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save category");
      }

      const savedCategory = await res.json();
      
      if (editingId) {
        setCategories(categories.map(c => c.id === editingId ? savedCategory : c));
        toast({ title: "Updated", description: "Category saved successfully." });
      } else {
        setCategories([savedCategory, ...categories]);
        toast({ title: "Created", description: "Successfully created category." });
      }

      resetForm();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await fetch("/api/admin/categories", {
        method: "DELETE",
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setCategories(categories.filter(c => c.id !== id));
        toast({ title: "Deleted", description: "Category permanently removed." });
      }
    } catch { toast({ title: "Error", description: "Failed to delete" }); }
  };

  const handleToggle = async (id: string, field: "isActive" | "isPopular", currentValue: boolean) => {
    // Validate: "Show in Trending" requires an image
    if (field === "isPopular" && !currentValue) {
      const category = categories.find(c => c.id === id);
      if (category && (!category.image || category.image.trim() === "")) {
        toast({
          title: "Image Required",
          description: "An image is required to mark this as a trending category. Please edit the category and upload an image first.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: !currentValue })
      });
      if (res.ok) {
        setCategories(categories.map(c => c.id === id ? { ...c, [field]: !currentValue } : c));
        toast({
          title: "Updated",
          description:
            field === "isPopular"
              ? `Show in Trending ${!currentValue ? "enabled" : "disabled"}.`
              : `Category is now ${!currentValue ? "active" : "inactive"}.`,
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (cat: CategoryData) => {
     setEditingId(cat.id);
     setName(cat.name);
     setDescription(cat.description || "");
     setStagedImages(cat.image ? [cat.image] : []);
     setParentId(cat.parentId || "");
     setIsAdding(true);
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1F1720]">Categories</h1>
          <p className="text-[#6B5A64] mt-2">Manage your product classifications and hierarchy.</p>
        </div>
        <Button 
          onClick={() => { if(isAdding) resetForm(); else setIsAdding(true); }} 
          className="bg-[#A7066A] hover:bg-[#8A0558] text-white shrink-0 shadow-lg shadow-[#A7066A]/20"
        >
          {isAdding ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          {isAdding ? "Cancel" : "Add New Category"}
        </Button>
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-brand-border animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-bold text-[#1F1720] mb-8 flex items-center gap-2">
            <div className="p-2 bg-brand-surface rounded-xl">
              <FolderTree className="w-6 h-6 text-[#A7066A]" />
            </div>
            {editingId ? "Edit Category Details" : "Create New Category"}
          </h2>
          
          <form onSubmit={handleCreateOrUpdate} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Left Column: Image Upload */}
              <div className="lg:col-span-1 space-y-4">
                <label className="text-sm font-bold text-[#1F1720] flex items-center gap-2 uppercase tracking-wider">
                  <ImageIcon className="w-4 h-4 text-[#A7066A]" />
                  Category Image
                </label>
                <div className="bg-[#FAFAFA] border-2 border-dashed border-brand-border rounded-2xl p-6 hover:bg-[#FCEAF4]/20 transition-colors">
                   <ImageUpload 
                     value={stagedImages} 
                     onChange={(vals) => setStagedImages(vals)} 
                     multiple={false}
                   />
                   <p className="text-[10px] text-[#6B5A64] mt-4 text-center">
                     Image will be uploaded to the server when you click "Save".
                   </p>
                </div>
              </div>

              {/* Middle/Right Column: Form Details */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Name</label>
                    <Input 
                      required 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="e.g. Luxury Gift Boxes" 
                      className="border-brand-border focus:border-[#A7066A] focus:ring-[#A7066A] h-12" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Parent Category</label>
                    <select 
                      className="w-full h-12 rounded-lg border border-brand-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A] appearance-none"
                      value={parentId} 
                      onChange={(e) => setParentId(e.target.value)}
                    >
                      <option value="">None (Root Category)</option>
                      {categories.filter(c => c.id !== editingId).map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Overview Description</label>
                  <textarea 
                    className="w-full min-h-[120px] rounded-xl border border-brand-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A] resize-none"
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Briefly describe what products belong in this category..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-brand-border">
               <Button type="button" variant="ghost" onClick={resetForm} className="text-[#6B5A64]">
                 Cancel Changes
               </Button>
               <Button type="submit" disabled={loading} className="bg-[#A7066A] hover:bg-[#8A0558] text-white px-10 h-12 rounded-xl shadow-md">
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                {loading ? "Uploading & Saving..." : editingId ? "Update Category" : "Save Environment"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Tree View */}
      <div className="bg-white rounded-3xl shadow-xl border border-brand-border overflow-hidden">
        <div className="px-6 py-4 bg-[#FAFAFA] border-b border-brand-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B5A64]">Category Tree</h3>
        </div>

        <div className="divide-y divide-brand-border">
          {rootCategories.map((category) => (
            <CategoryTreeRow
              key={category.id}
              category={category}
              level={0}
              categoriesByParent={categoriesByParent}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onEdit={startEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}

          {rootCategories.length === 0 ? (
            <div className="px-6 py-20 text-center text-[#6B5A64]">
              <div className="w-16 h-16 bg-[#FAFAFA] rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-border">
                <FolderTree className="w-8 h-8 opacity-20" />
              </div>
              <p className="font-bold text-lg text-[#1F1720]">No hierarchies built yet</p>
              <p className="text-sm mt-1">Start by adding your first product category.</p>
            </div>
          ) : null}
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

function CategoryTreeRow({
  category,
  level,
  categoriesByParent,
  expandedIds,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggle,
}: {
  category: CategoryData;
  level: number;
  categoriesByParent: Map<string | null, CategoryData[]>;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (category: CategoryData) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, field: "isActive" | "isPopular", currentValue: boolean) => void;
}) {
  const children = categoriesByParent.get(category.id) || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(category.id);

  return (
    <div>
      <div
        className="group px-6 py-4 hover:bg-gray-50/80 even:bg-gray-50/40 transition-colors border-b border-gray-100"
        style={{ paddingLeft: `${24 + level * 28}px` }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-4 items-center">
          <div className="flex items-center gap-3 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onToggleExpand(category.id)}
                className="h-7 w-7 rounded-md border border-gray-150 bg-white flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-500 transition-colors"
                aria-label={isExpanded ? "Collapse category" : "Expand category"}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="h-7 w-7" />
            )}

            <div className="relative w-12 h-12 rounded-md border border-gray-150 bg-[#FAFAFA] overflow-hidden flex-shrink-0">
              {category.image ? (
                <Image src={category.image} alt={category.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate">{category.name}</div>
              <div className="text-xs text-slate-500 font-medium truncate mt-0.5">/{category.slug}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggle(category.id, "isActive", category.isActive)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${category.isActive ? "bg-blue-50 text-blue-700 hover:bg-blue-100/80" : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"}`}
            >
              {category.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {category.isActive ? "Live" : "Hidden"}
            </button>
            <div className="flex items-center gap-2 rounded-md border border-gray-150 bg-white px-2.5 py-1.5">
              <span className="text-xs font-medium text-slate-700">Show in Trending</span>
              <Switch
                checked={category.isPopular}
                onCheckedChange={() => onToggle(category.id, "isPopular", category.isPopular)}
                aria-label={`Show ${category.name} in Trending`}
              />
            </div>
          </div>

          <div className="flex justify-start lg:justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={() => onEdit(category)} className="h-9 w-9 rounded-xl text-slate-500 hover:text-blue-700 hover:bg-blue-50">
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(category.id)} className="h-9 w-9 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {hasChildren ? (
        <div className={isExpanded ? "max-h-[4000px] opacity-100 transition-all duration-300 overflow-hidden" : "max-h-0 opacity-0 transition-all duration-300 overflow-hidden"}>
          {children.map((child) => (
            <CategoryTreeRow
              key={child.id}
              category={child}
              level={level + 1}
              categoriesByParent={categoriesByParent}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
