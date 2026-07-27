"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Edit2, EyeOff, RefreshCw, Sparkles, Trash2, X, XCircle } from "lucide-react";

const REQUIRED_FIELD_MESSAGE = "This field is required.";

const moodFormSchema = z.object({
  name: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  slug: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}


type MoodData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: string | Date;
};

type MoodPayload = {
  id?: string | null;
  name: string;
  slug: string;
  description: string;
  icon: string;
  isActive: boolean;
};

const defaultForm = {
  name: "",
  slug: "",
  description: "",
  icon: "✨",
  isActive: true,
};

export function MoodsClient() {
  const { toast } = useToast();
  const [moods, setMoods] = useState<MoodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "slug", string>>>({});

  const isEditing = Boolean(editingId);

  const sortedMoods = useMemo(() => {
    return [...moods].sort((a, b) => a.name.localeCompare(b.name));
  }, [moods]);

  const loadMoods = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const res = await fetch("/api/admin/moods", { cache: "no-store" });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || "Failed to load moods");
      }

      const data = await res.json();
      setMoods(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setMoods([]);
      setLoadError(error.message || "Mood data is unavailable until the database migration is applied.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMoods();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setIsFormOpen(false);
    setForm(defaultForm);
    setFieldErrors({});
  };

  const startEdit = (mood: MoodData) => {
    setEditingId(mood.id);
    setIsFormOpen(true);
    setForm({
      name: mood.name,
      slug: mood.slug,
      description: mood.description || "",
      icon: mood.icon || "✨",
      isActive: mood.isActive,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    const parsed = moodFormSchema.safeParse({
      name: form.name,
      slug: form.slug,
    });

    if (!parsed.success) {
      const nextErrors: Partial<Record<"name" | "slug", string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "name" | "slug";
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);

    try {
      const method = editingId ? "PATCH" : "POST";
      const payload: MoodPayload = {
        id: editingId,
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        icon: form.icon.trim() || "✨",
        isActive: form.isActive,
      };

      const res = await fetch("/api/admin/moods", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || "Failed to save mood");
      }

      const savedMood = await res.json();

      setMoods((prev) => {
        if (editingId) {
          return prev.map((item) => (item.id === editingId ? savedMood : item));
        }
        return [savedMood, ...prev];
      });

      toast({
        title: editingId ? "Mood updated" : "Mood created",
        description: editingId ? "Mood changes saved successfully." : "Mood added to the catalog.",
      });

      resetForm();
      setLoadError(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Request failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mood: MoodData) => {
    if (!confirm(`Delete mood "${mood.name}"?`)) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/moods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mood.id }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || "Failed to delete mood");
      }

      setMoods((prev) => prev.filter((item) => item.id !== mood.id));
      if (editingId === mood.id) resetForm();
      toast({ title: "Mood deleted", description: "Mood removed successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Delete failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1F1720]">Moods Setup</h1>
          <p className="text-[#6B5A64] mt-2">Create mood tags so products can be browsed by vibe.</p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => void loadMoods()} className="border-brand-border">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            type="button"
            onClick={() => {
                if (isFormOpen) resetForm();
                else setIsFormOpen(true);
            }}
            className="bg-[#A7066A] hover:bg-[#8A0558] text-white shrink-0 shadow-lg shadow-[#A7066A]/20"
          >
              {isFormOpen ? <X className="w-5 h-5 mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
              {isFormOpen ? "Close Editor" : "Add Mood"}
          </Button>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
        </div>
      ) : null}

      {isFormOpen && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-brand-border animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-bold text-[#1F1720] mb-8 flex items-center gap-2">
            <div className="p-2 bg-brand-surface rounded-xl">
              <Sparkles className="w-6 h-6 text-[#A7066A]" />
            </div>
            {isEditing ? "Edit Mood" : "Create New Mood"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label required className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Mood Name</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => {
                      const nextName = event.target.value;
                      if (isEditing) return { ...prev, name: nextName };
                      return { ...prev, name: nextName, slug: slugify(nextName) };
                    })
                  }
                  placeholder="e.g. Romantic"
                  className="border-brand-border focus:border-[#A7066A] focus:ring-[#A7066A] h-12"
                />
                {fieldErrors.name ? <p className="text-sm text-destructive">{fieldErrors.name}</p> : null}
              </div>

              <div className="space-y-2">
                <Label required className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Slug</Label>
                <Input
                  required
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
                  placeholder="e.g. romantic"
                  className="border-brand-border focus:border-[#A7066A] focus:ring-[#A7066A] h-12"
                />
                {fieldErrors.slug ? <p className="text-sm text-destructive">{fieldErrors.slug}</p> : null}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Icon / Emoji</Label>
                <Input
                  value={form.icon}
                  onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
                  placeholder="✨"
                  className="border-brand-border focus:border-[#A7066A] focus:ring-[#A7066A] h-12"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm font-bold text-[#1F1720] uppercase tracking-wider">Description</Label>
                <textarea
                  className="w-full min-h-[120px] rounded-xl border border-brand-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A] resize-none"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Describe the feeling this mood represents..."
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    form.isActive
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-gray-200 bg-gray-50 text-gray-500"
                  }`}
                >
                  {form.isActive ? <CheckCircle className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {form.isActive ? "Active" : "Inactive"}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-brand-border">
              <Button type="button" variant="ghost" onClick={resetForm} className="text-[#6B5A64]">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-[#A7066A] hover:bg-[#8A0558] text-white px-10 h-12 rounded-xl shadow-md">
                {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {saving ? "Saving..." : isEditing ? "Update Mood" : "Save Mood"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl border border-brand-border overflow-hidden">
        <div className="px-6 py-4 bg-[#FAFAFA] border-b border-brand-border flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B5A64]">Mood Catalog</h3>
          <span className="text-xs text-[#6B5A64]">{sortedMoods.length} moods</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#FAFAFA] border-b border-brand-border text-[#6B5A64]">
              <tr>
                <th className="px-6 py-4 font-semibold w-16">Icon</th>
                <th className="px-6 py-4 font-semibold">Mood Name</th>
                <th className="px-6 py-4 font-semibold">Slug Mapping</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {sortedMoods.map((mood) => (
                <tr key={mood.id} className="hover:bg-[#FAFAFA]/50 transition-colors">
                  <td className="px-6 py-4 text-2xl">{mood.icon || "✨"}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[#1F1720]">{mood.name}</div>
                    {mood.description ? <div className="text-[#6B5A64] text-xs mt-1 max-w-[300px] truncate">{mood.description}</div> : null}
                  </td>
                  <td className="px-6 py-4 text-[#6B5A64]">/{mood.slug}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${mood.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      {mood.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {mood.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(mood)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(mood)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" disabled={saving}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#6B5A64]">
                    Loading moods...
                  </td>
                </tr>
              ) : sortedMoods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#6B5A64]">
                    <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No moods have been added yet.
                    <div className="text-xs mt-2 text-[#A7066A]">
                      If the API still returns an error, run the Prisma migration for the Mood table first.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
