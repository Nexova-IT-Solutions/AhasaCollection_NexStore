"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Trash2,
  Edit2,
  Upload,
  Loader2,
  ImageIcon,
  X,
  GripVertical,
  Timer,
  Images,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/utils/supabase";
import Image from "next/image";

const ALLOWED_BANNER_KEYS = ["promo_1", "promo_2"] as const;
const MAX_IMAGES = 5;

const BANNER_KEY_LABELS: Record<string, string> = {
  promo_1: "Promo Banner 1 (between Trending Now & Categories)",
  promo_2: "Promo Banner 2 (between Chocolates & Discounted Items)",
};

const INTERVAL_OPTIONS = [
  { label: "1 Second (1000ms)", value: "1000" },
  { label: "2 Seconds (2000ms)", value: "2000" },
  { label: "3 Seconds (3000ms)", value: "3000" },
  { label: "5 Seconds (5000ms)", value: "5000" },
  { label: "8 Seconds (8000ms)", value: "8000" },
];

interface SlotImage {
  /** null = newly added file not yet uploaded */
  file: File | null;
  /** remote URL (existing) or blob URL (preview) */
  previewUrl: string;
  /** original remote URL when editing — needed for Supabase replace */
  remoteUrl: string | null;
}

interface PromoBannerData {
  id: string;
  key: string;
  imageUrl: string;
  images: string[];
  slideInterval: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BannersClientProps {
  initialBanners: PromoBannerData[];
}

// ─── tiny preview carousel used in the list card ─────────────────────────────
function MiniCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) return null;
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);
  return (
    <div className="relative w-full h-full">
      <Image src={images[idx]} alt={`slide-${idx}`} fill className="object-cover" />
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function BannersClient({ initialBanners }: BannersClientProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [banners, setBanners] = useState<PromoBannerData[]>(initialBanners);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromoBannerData | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [slideInterval, setSlideInterval] = useState("3000");
  const [slotImages, setSlotImages] = useState<SlotImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Revoke all blob URLs when slot images change (cleanup)
  const revokeBlobs = useCallback((imgs: SlotImage[]) => {
    imgs.forEach((img) => {
      if (img.previewUrl.startsWith("blob:")) URL.revokeObjectURL(img.previewUrl);
    });
  }, []);

  const resetForm = useCallback(() => {
    revokeBlobs(slotImages);
    setSelectedKey("");
    setSlotImages([]);
    setSlideInterval("3000");
    setIsActive(true);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [slotImages, revokeBlobs]);

  // Auto-populate form when key changes
  useEffect(() => {
    if (!selectedKey) {
      revokeBlobs(slotImages);
      setSlotImages([]);
      setEditingId(null);
      setIsActive(true);
      setSlideInterval("3000");
      return;
    }
    const existing = banners.find((b) => b.key === selectedKey);
    if (existing) {
      setEditingId(existing.id);
      setIsActive(existing.isActive);
      setSlideInterval(String(existing.slideInterval ?? 3000));
      const imgs: SlotImage[] = (Array.isArray(existing.images) && existing.images.length > 0 ? existing.images : existing.imageUrl ? [existing.imageUrl] : []).map((url) => ({
        file: null,
        previewUrl: url,
        remoteUrl: url,
      }));
      setSlotImages(imgs);
    } else {
      setEditingId(null);
      setIsActive(true);
      setSlideInterval("3000");
      revokeBlobs(slotImages);
      setSlotImages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, banners]);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_IMAGES - slotImages.length;
    if (remaining <= 0) {
      return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    const newSlots: SlotImage[] = toAdd.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      remoteUrl: null,
    }));
    setSlotImages((prev) => [...prev, ...newSlots]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [slotImages]);

  const removeImage = useCallback((index: number) => {
    setSlotImages((prev) => {
      const removed = prev[index];
      if (removed.previewUrl.startsWith("blob:")) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const moveImage = useCallback((index: number, dir: -1 | 1) => {
    setSlotImages((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const canSubmit = Boolean(selectedKey) && slotImages.length > 0 && !isSubmitting;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Upload any new files; keep existing remote URLs as-is
      const resolvedUrls: string[] = await Promise.all(
        slotImages.map(async (slot) => {
          if (slot.file) {
            return uploadFile(slot.file, "banners", {
              replacePublicUrl: slot.remoteUrl || undefined,
            });
          }
          return slot.remoteUrl ?? slot.previewUrl;
        })
      );

      const payload = {
        images: resolvedUrls,
        imageUrl: resolvedUrls[0],
        slideInterval: Number(slideInterval),
        isActive,
      };

      if (editingId) {
        const res = await fetch(`/api/admin/banners/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).message || "Update failed");
        const updated: PromoBannerData = await res.json();
        setBanners((prev) => prev.map((b) => (b.id === editingId ? updated : b)));
        toast({ title: "Banner Updated", description: "Carousel banner updated successfully." });
      } else {
        const res = await fetch("/api/admin/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: selectedKey, ...payload }),
        });
        if (!res.ok) throw new Error((await res.json()).message || "Create failed");
        const created: PromoBannerData = await res.json();
        setBanners((prev) => [created, ...prev]);
        toast({ title: "Banner Created", description: `${selectedKey.toUpperCase()} carousel banner is live.` });
      }
      resetForm();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Operation failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [editingId, isActive, resetForm, selectedKey, slideInterval, slotImages, toast]);

  const handleToggleActive = useCallback(async (banner: PromoBannerData) => {
    setTogglingId(banner.id);
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const updated: PromoBannerData = await res.json();
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? updated : b)));
      toast({ title: updated.isActive ? "Banner Activated" : "Banner Deactivated", description: `${banner.key.toUpperCase()} is now ${updated.isActive ? "visible" : "hidden"}.` });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  }, [toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/banners/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).message);
      setBanners((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      toast({ title: "Banner Deleted", description: `${deleteTarget.key.toUpperCase()} removed.` });
      setDeleteTarget(null);
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Delete failed", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, toast]);

  const handleEdit = useCallback((banner: PromoBannerData) => {
    setSelectedKey(banner.key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const takenKeys = banners.map((b) => b.key);

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1F1720] flex items-center gap-3">
          <div className="p-2 bg-brand-surface rounded-xl">
            <Images className="w-6 h-6 text-[#A7066A]" />
          </div>
          Promotional Banners
        </h1>
        <p className="text-[#6B5A64] mt-2">
          Each banner slot supports up to {MAX_IMAGES} images displayed as an auto-playing carousel.
        </p>
      </div>

      {/* Create / Edit Form */}
      <Card className="border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-base font-semibold text-gray-900">
            {editingId ? "✏️ Update Existing Banner" : "➕ Create New Banner"}
          </CardTitle>
          <p className="text-xs text-slate-500 font-medium">
            {editingId
              ? "Replace images, adjust order, or change the slide interval."
              : "Select a slot, upload up to 5 images, and publish."}
          </p>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Banner Slot Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Banner Slot *</Label>
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                disabled={isSubmitting}
                className="h-12 w-full rounded-xl border border-gray-150 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A]/20"
              >
                <option value="">Select banner slot...</option>
                {ALLOWED_BANNER_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {BANNER_KEY_LABELS[key] || key}
                    {takenKeys.includes(key) ? " ● (has banner)" : ""}
                  </option>
                ))}
              </select>
              {editingId && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <Edit2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs font-medium text-amber-700">
                    Editing <strong>{selectedKey.toUpperCase()}</strong> — changes will replace the live banner.
                  </p>
                </div>
              )}
            </div>

            {/* Slide Interval */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Timer className="w-3.5 h-3.5" /> Slide Interval Duration
              </Label>
              <Select value={slideInterval} onValueChange={setSlideInterval} disabled={isSubmitting}>
                <SelectTrigger className="h-12 rounded-xl border-gray-150 focus:ring-[#A7066A]/20">
                  <SelectValue placeholder="Select interval..." />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 font-medium">
                How long each slide is displayed before auto-advancing.
              </p>
            </div>

            {/* Multi-Image Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Banner Images * ({slotImages.length}/{MAX_IMAGES})
                </Label>
                {slotImages.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="text-xs font-semibold text-[#A7066A] hover:underline flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" /> Add Images
                  </button>
                )}
              </div>

              {slotImages.length === 0 ? (
                <div
                  className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer border-gray-200 hover:border-[#A7066A]/40 bg-[#FAFAFA] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-[#A7066A]/50 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-900">Click to upload banner images</p>
                  <p className="text-xs text-slate-500 mt-1">Up to {MAX_IMAGES} images · PNG, JPG, WebP · Max 10MB each</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {slotImages.map((img, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-150 h-32 bg-gray-50">
                      <Image src={img.previewUrl} alt={`Slide ${i + 1}`} fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                      {/* Slide number */}
                      <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
                        {i + 1}
                      </span>
                      {/* Actions */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {i > 0 && (
                          <button type="button" onClick={() => moveImage(i, -1)} className="p-1 bg-white/90 rounded text-gray-700 hover:bg-white" title="Move left">
                            <GripVertical className="w-3 h-3" />
                          </button>
                        )}
                        <button type="button" onClick={() => removeImage(i)} className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Remove">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {img.file && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                          <p className="text-[10px] text-white truncate">New: {img.file.name}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {slotImages.length < MAX_IMAGES && (
                    <div
                      className="h-32 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#A7066A]/40 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="text-center">
                        <Upload className="w-5 h-5 text-[#A7066A]/40 mx-auto mb-1" />
                        <span className="text-xs text-slate-400">Add more</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => addFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-gray-150 bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Banner is Active</p>
                <p className="text-xs text-slate-500 font-medium">Active banners are visible on the storefront immediately.</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} disabled={isSubmitting} />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-[#A7066A] hover:bg-[#8A0558] text-white px-8 h-12 rounded-xl shadow-lg shadow-[#A7066A]/20 transition-all hover:scale-[1.02] active:scale-95 font-bold"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{editingId ? "Updating..." : "Creating..."}</>
                ) : editingId ? "Update Banner" : "Create Banner"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting} className="border-gray-200 text-slate-600 h-12 rounded-xl px-6">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Banners List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#1F1720]">All Banners ({banners.length})</h2>
        {banners.length === 0 ? (
          <Card className="border border-gray-150 rounded-2xl shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-brand-surface rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-150">
                <ImageIcon className="w-8 h-8 text-[#A7066A] opacity-30" />
              </div>
              <p className="font-bold text-lg text-[#1F1720]">No banners created yet</p>
              <p className="text-sm text-[#6B5A64] mt-1">Use the form above to create your first promotional banner.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {banners.map((banner) => {
              const displayImages = Array.isArray(banner.images) && banner.images.length > 0 ? banner.images : banner.imageUrl ? [banner.imageUrl] : [];
              return (
                <Card
                  key={banner.id}
                  className={`overflow-hidden border rounded-2xl shadow-sm hover:shadow-md transition-all group ${banner.isActive ? "border-gray-150" : "border-gray-250 opacity-90"}`}
                >
                  <div className="relative w-full h-48 bg-[#FAFAFA]">
                    <MiniCarousel images={displayImages} />
                    {!banner.isActive && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />}

                    <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                      <Badge className="bg-[#1F1720]/80 text-white hover:bg-[#1F1720]/80 uppercase text-[10px] tracking-wider font-bold px-2.5 py-1 backdrop-blur-sm">
                        {banner.key}
                      </Badge>
                      <Badge className={`text-[10px] tracking-wider font-bold px-2.5 py-1 backdrop-blur-sm ${banner.isActive ? "bg-emerald-500/90 text-white hover:bg-emerald-500/90" : "bg-gray-500/80 text-white hover:bg-gray-500/80"}`}>
                        {banner.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {displayImages.length > 1 && (
                        <Badge className="bg-[#A7066A]/80 text-white hover:bg-[#A7066A]/80 text-[10px] px-2 py-1 backdrop-blur-sm">
                          {displayImages.length} slides
                        </Badge>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button type="button" onClick={() => handleEdit(banner)} className="p-2 bg-white/90 text-[#A7066A] rounded-lg shadow-md hover:bg-white backdrop-blur-sm" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(banner)} className="p-2 bg-white/90 text-red-500 rounded-lg shadow-md hover:bg-white backdrop-blur-sm" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="px-5 py-4 flex items-center justify-between bg-white border-t border-gray-100">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {BANNER_KEY_LABELS[banner.key]?.split("(")[0]?.trim() || banner.key}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                        <Timer className="w-3 h-3" />
                        {(banner.slideInterval ?? 3000) / 1000}s interval ·{" "}
                        {new Date(banner.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 font-semibold">{banner.isActive ? "Live" : "Off"}</span>
                      <Switch checked={banner.isActive} onCheckedChange={() => handleToggleActive(banner)} disabled={togglingId === banner.id} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the <strong>{deleteTarget?.key.toUpperCase()}</strong> banner? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => { e.preventDefault(); void handleDelete(); }}
              disabled={isDeleting}
            >
              {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
