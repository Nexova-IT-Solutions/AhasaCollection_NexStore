"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type DiscountRecord = {
  id: string;
  name: string;
  description: string | null;
  value: number;
  type: "PERCENTAGE" | "FIXED";
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  _count: { products: number };
};

type FormState = {
  id?: string;
  name: string;
  description: string;
  value: number | "";
  type: "PERCENTAGE" | "FIXED";
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const emptyForm: FormState = {
  name: "",
  description: "",
  value: "",
  type: "PERCENTAGE",
  isActive: true,
  startsAt: "",
  endsAt: "",
};

export function DiscountsClient({ initialDiscounts }: { initialDiscounts: DiscountRecord[] }) {
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState<DiscountRecord[]>(initialDiscounts);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(form.id);

  const sortedDiscounts = useMemo(() => {
    return [...discounts].sort((a, b) => Number(b.isActive) - Number(a.isActive));
  }, [discounts]);

  const resetForm = () => {
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Validation Error", description: "Discount name is required.", variant: "destructive" });
      return;
    }
    if (form.value === "") {
      toast({ title: "Validation Error", description: "Discount value is required.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...(isEditing ? { id: form.id } : {}),
        name: form.name,
        description: form.description || null,
        value: Number(form.value),
        type: form.type,
        isActive: form.isActive,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };

      const response = await fetch("/api/admin/discounts", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to save discount");
      }

      if (isEditing) {
        setDiscounts((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      } else {
        setDiscounts((prev) => [data, ...prev]);
      }

      toast({
        title: isEditing ? "Discount Updated" : "Discount Created",
        description: isEditing ? "Discount changes were saved." : "New discount campaign created.",
      });
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Request failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (discount: DiscountRecord) => {
    setForm({
      id: discount.id,
      name: discount.name,
      description: discount.description ?? "",
      value: discount.value,
      type: discount.type,
      isActive: discount.isActive,
      startsAt: toDatetimeLocal(discount.startsAt),
      endsAt: toDatetimeLocal(discount.endsAt),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this discount?")) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/discounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete discount");
      }

      setDiscounts((prev) => prev.filter((item) => item.id !== id));
      toast({ title: "Discount Deleted", description: "Discount removed successfully." });
      if (form.id === id) resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Request failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#1F1720]">Discount Management</h1>
        <p className="text-[#6B5A64] mt-2">Create reusable campaigns and apply them to products.</p>
      </div>

      <Card className="border border-gray-150 rounded-2xl shadow-sm overflow-hidden bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-100 pb-3">{isEditing ? "Edit Discount" : "Create Discount"}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="md:col-span-2 space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Name *</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Valentine 20% Off" />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</Label>
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional campaign notes" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Value *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.value}
              onChange={(e) => setForm((p) => ({ ...p, value: e.target.value ? Number(e.target.value) : "" }))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type *</Label>
            <select
              className="mt-2 flex h-10 w-full rounded-xl border border-gray-150 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A]/20"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as FormState["type"] }))}
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed Amount</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Starts At</Label>
            <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ends At</Label>
            <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))} />
          </div>

          <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-gray-150 bg-white p-4 w-full">
            <div>
              <p className="text-sm font-semibold text-gray-900">Active Campaign</p>
              <p className="text-xs text-slate-500 font-medium">Inactive discounts will not apply to product pricing.</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: Boolean(checked) }))} />
          </div>

          <div className="md:col-span-2 flex gap-3 pt-3">
            <Button disabled={loading} type="submit" className="bg-[#A7066A] hover:bg-[#8A0558] text-white h-11 px-6 rounded-xl">
              {loading ? "Saving..." : isEditing ? "Update Discount" : "Create Discount"}
            </Button>
            {isEditing ? (
              <Button type="button" variant="outline" onClick={resetForm} disabled={loading} className="border-gray-205 h-11 px-6 rounded-xl">
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="border border-gray-150 rounded-2xl shadow-sm bg-white overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-gray-150 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900">All Discounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-slate-500 border-b border-gray-150">
              <tr>
                <th className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Name</th>
                <th className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Type</th>
                <th className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Value</th>
                <th className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Linked Products</th>
                <th className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date Range</th>
                <th className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedDiscounts.map((discount) => (
                <tr key={discount.id} className="even:bg-gray-50/40 hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                  <td className="py-4 px-6">
                    <p className="font-semibold text-gray-900 text-sm">{discount.name}</p>
                    {discount.description ? <p className="text-xs text-slate-500 font-medium mt-0.5">{discount.description}</p> : null}
                  </td>
                  <td className="py-4 px-6 text-slate-500 font-medium">{discount.type === "PERCENTAGE" ? "Percentage" : "Fixed"}</td>
                  <td className="py-4 px-6 font-semibold text-gray-900 text-sm">{discount.type === "PERCENTAGE" ? `${discount.value}%` : `LKR ${discount.value.toLocaleString()}`}</td>
                  <td className="py-4 px-6">
                    <span className={cn(
                      "text-xs font-semibold px-2.5 py-0.5 rounded-md border inline-block",
                      discount.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-700 border-slate-200"
                    )}>
                      {discount.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {discount._count.products} products
                    </span>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-500 font-medium whitespace-normal">
                    {discount.startsAt ? new Date(discount.startsAt).toLocaleString() : "Any"} - {discount.endsAt ? new Date(discount.endsAt).toLocaleString() : "No End"}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="inline-flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(discount)} disabled={loading}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(discount.id)} disabled={loading}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedDiscounts.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-center text-[#6B5A64]" colSpan={7}>
                    No discounts created yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
