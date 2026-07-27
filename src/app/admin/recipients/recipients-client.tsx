"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { Heart, Plus, RefreshCw, Trash2, UserRound, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const REQUIRED_FIELD_MESSAGE = "This field is required.";

const recipientFormSchema = z.object({
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

type RecipientData = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string | Date;
};

type RecipientFormState = {
  name: string;
  slug: string;
  isActive: boolean;
};

const defaultForm: RecipientFormState = {
  name: "",
  slug: "",
  isActive: true,
};

export function RecipientsClient({ initialRecipients }: { initialRecipients: RecipientData[] }) {
  const { toast } = useToast();

  const [recipients, setRecipients] = useState<RecipientData[]>(initialRecipients);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecipientFormState>(defaultForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "slug", string>>>({});

  const isEditing = Boolean(editingId);

  const sortedRecipients = useMemo(
    () => [...recipients].sort((a, b) => a.name.localeCompare(b.name)),
    [recipients]
  );

  const resetForm = () => {
    setEditingId(null);
    setDialogOpen(false);
    setForm(defaultForm);
    setFieldErrors({});
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(defaultForm);
    setFieldErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (recipient: RecipientData) => {
    setEditingId(recipient.id);
    setForm({
      name: recipient.name,
      slug: recipient.slug,
      isActive: recipient.isActive,
    });
    setFieldErrors({});
    setDialogOpen(true);
  };

  const loadRecipients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/recipients", { cache: "no-store" });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || "Failed to load recipients");
      }

      const data = await res.json();
      setRecipients(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Request failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    const parsed = recipientFormSchema.safeParse({
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
      const endpoint = editingId ? `/api/admin/recipients/${editingId}` : "/api/admin/recipients";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          isActive: form.isActive,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || "Failed to save recipient");
      }

      const savedRecipient = await res.json();

      setRecipients((prev) => {
        if (editingId) {
          return prev.map((item) => (item.id === editingId ? savedRecipient : item));
        }

        return [savedRecipient, ...prev];
      });

      toast({
        title: editingId ? "Recipient updated" : "Recipient created",
        description: editingId ? "Recipient changes saved successfully." : "Recipient added to catalog.",
      });

      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Request failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (recipient: RecipientData) => {
    try {
      const res = await fetch(`/api/admin/recipients/${recipient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !recipient.isActive }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || "Failed to update recipient");
      }

      const updated = await res.json();
      setRecipients((prev) => prev.map((item) => (item.id === recipient.id ? updated : item)));

      toast({
        title: "Recipient updated",
        description: `${updated.name} is now ${updated.isActive ? "active" : "inactive"}.`,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Request failed", variant: "destructive" });
    }
  };

  const handleDelete = async (recipient: RecipientData) => {
    if (!confirm(`Delete recipient "${recipient.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/recipients/${recipient.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || "Failed to delete recipient");
      }

      setRecipients((prev) => prev.filter((item) => item.id !== recipient.id));
      toast({ title: "Recipient deleted", description: "Recipient removed successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Request failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1F1720]">Recipients Setup</h1>
          <p className="text-[#6B5A64] mt-2">Manage recipient groups such as For Him, For Her, and Kids.</p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => void loadRecipients()} className="border-brand-border">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button type="button" onClick={openCreateDialog} className="bg-[#A7066A] hover:bg-[#8A0558] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add New Recipient
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-150 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-150 text-[#6B5A64]">
              <tr>
                <th className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Name</th>
                <th className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Slug</th>
                <th className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Active</th>
                <th className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedRecipients.map((recipient) => (
                <tr key={recipient.id} className="even:bg-gray-50/40 hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                      <Heart className="w-4 h-4 text-[#A7066A]" />
                      {recipient.name}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-500 font-medium">/{recipient.slug}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3 rounded-xl border border-gray-150 bg-white px-3 py-1.5 w-fit">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-md",
                        recipient.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-700"
                      )}>
                        {recipient.isActive ? "Active" : "Inactive"}
                      </span>
                      <Switch
                        checked={recipient.isActive}
                        onCheckedChange={() => void handleToggleActive(recipient)}
                        aria-label={`Toggle active status for ${recipient.name}`}
                      />
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(recipient)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(recipient)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedRecipients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#6B5A64]">
                    <UserRound className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No recipients configured yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : resetForm())}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Recipient" : "Add New Recipient"}</DialogTitle>
            <DialogDescription>
              Configure a recipient segment used in product targeting.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOrUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label required>Name</Label>
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
                placeholder="e.g. For Him"
              />
              {fieldErrors.name ? <p className="text-sm text-destructive">{fieldErrors.name}</p> : null}
            </div>

            <div className="space-y-2">
              <Label required>Slug</Label>
              <Input
                required
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
                placeholder="e.g. for-him"
              />
              <p className="text-xs text-[#6B5A64]">Used for clean URLs and filtering.</p>
              {fieldErrors.slug ? <p className="text-sm text-destructive">{fieldErrors.slug}</p> : null}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-brand-border px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-[#1F1720]">Active</p>
                <p className="text-xs text-[#6B5A64]">Inactive recipients are hidden from product assignment.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-[#A7066A] hover:bg-[#8A0558] text-white">
                {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Recipient"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
