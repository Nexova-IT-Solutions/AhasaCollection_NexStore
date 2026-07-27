"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  RefreshCw,
  MapPin,
  ChevronDown,
  ChevronRight,
  Pencil,
  X,
  Check,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

type City = {
  id: string;
  name: string;
  fee: number;
  isActive: boolean;
  provinceId: string;
};

type Province = {
  id: string;
  name: string;
  isActive: boolean;
  cities?: City[];
  _count?: { cities: number };
  expanded?: boolean;
};

// ─── Province Row ─────────────────────────────────────────────────────────────
function ProvinceRow({
  province,
  onToggle,
  onDelete,
  onRename,
  onAddCity,
  onToggleCity,
  onDeleteCity,
  onEditCity,
}: {
  province: Province;
  onToggle: (p: Province) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAddCity: (provinceId: string, name: string, fee: number) => void;
  onToggleCity: (city: City) => void;
  onDeleteCity: (cityId: string) => void;
  onEditCity: (city: City, name: string, fee: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(province.name);
  const [addingCity, setAddingCity] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [newCityFee, setNewCityFee] = useState("");
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [editCityName, setEditCityName] = useState("");
  const [editCityFee, setEditCityFee] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleRename = () => {
    if (editName.trim() && editName !== province.name) {
      onRename(province.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleAddCity = async () => {
    if (!newCityName.trim() || !newCityFee) return;
    setSaving(true);
    await onAddCity(province.id, newCityName.trim(), parseFloat(newCityFee));
    setNewCityName("");
    setNewCityFee("");
    setAddingCity(false);
    setSaving(false);
  };

  const startEditCity = (city: City) => {
    setEditingCityId(city.id);
    setEditCityName(city.name);
    setEditCityFee(String(city.fee));
  };

  const handleSaveCity = async (city: City) => {
    if (!editCityName.trim()) return;
    setSaving(true);
    await onEditCity(city, editCityName.trim(), parseFloat(editCityFee) || 0);
    setEditingCityId(null);
    setSaving(false);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {/* Province header */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-brand-border bg-white hover:bg-slate-50/60 transition-colors">
        <CollapsibleTrigger asChild>
          <button className="text-slate-400 hover:text-slate-600">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </CollapsibleTrigger>

        <MapPin className="w-4 h-4 text-[#A7066A] shrink-0" />

        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setIsEditing(false); }}
            />
            <button onClick={handleRename} className="text-green-600 hover:text-green-800"><Check className="w-4 h-4" /></button>
            <button onClick={() => setIsEditing(false)} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <span className="flex-1 font-semibold text-[#1F1720]">{province.name}</span>
        )}

        <Badge variant="outline" className="text-xs">
          {province._count?.cities ?? province.cities?.length ?? 0} cities
        </Badge>

        <div className="flex items-center gap-1">
          <Switch
            checked={province.isActive}
            onCheckedChange={() => onToggle(province)}
            className="data-[state=checked]:bg-green-500 scale-90"
          />
          <span className={`text-xs ${province.isActive ? "text-green-600" : "text-slate-400"}`}>
            {province.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-7 w-7 text-slate-500 hover:text-[#A7066A]">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(province.id)} className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Cities list */}
      <CollapsibleContent>
        <div className="ml-8 mt-2 mb-3 space-y-2">
          {province.cities && province.cities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">City</TableHead>
                  <TableHead className="text-xs">Delivery Fee (LKR)</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {province.cities.map((city) => (
                  <TableRow key={city.id} className="hover:bg-slate-50/50">
                    <TableCell className="py-2">
                      {editingCityId === city.id ? (
                        <Input
                          value={editCityName}
                          onChange={(e) => setEditCityName(e.target.value)}
                          className="h-7 text-sm w-36"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-sm text-[#1F1720]">{city.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {editingCityId === city.id ? (
                        <Input
                          type="number"
                          value={editCityFee}
                          onChange={(e) => setEditCityFee(e.target.value)}
                          className="h-7 text-sm w-24"
                        />
                      ) : (
                        <span className="text-sm">LKR {city.fee.toLocaleString()}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={city.isActive}
                          onCheckedChange={() => onToggleCity(city)}
                          className="data-[state=checked]:bg-green-500 scale-75"
                        />
                        <span className={`text-xs ${city.isActive ? "text-green-600" : "text-slate-400"}`}>
                          {city.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      {editingCityId === city.id ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleSaveCity(city)} className="text-green-600 hover:text-green-800" disabled={saving}>
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingCityId(null)} className="text-red-500 hover:text-red-700">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEditCity(city)} className="h-7 w-7 text-slate-500 hover:text-[#A7066A]">
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDeleteCity(city.id)} className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-xs text-slate-400 py-2 px-3 italic">No cities added yet.</p>
          )}

          {/* Add City */}
          {addingCity ? (
            <div className="flex items-end gap-3 p-3 border border-dashed border-brand-border rounded-lg bg-slate-50/50">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">City Name</Label>
                <Input
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="e.g. Galle"
                  className="h-8 text-sm bg-white w-44"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Fee (LKR)</Label>
                <Input
                  type="number"
                  value={newCityFee}
                  onChange={(e) => setNewCityFee(e.target.value)}
                  placeholder="0"
                  className="h-8 text-sm bg-white w-28"
                />
              </div>
              <Button
                onClick={handleAddCity}
                disabled={saving || !newCityName.trim()}
                size="sm"
                className="bg-[#A7066A] hover:bg-[#8A0558] text-white h-8"
              >
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Save"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAddingCity(false)} className="h-8 text-slate-500">
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingCity(true)}
              className="border-dashed border-brand-border text-xs h-8"
            >
              <Plus className="w-3 h-3 mr-1" /> Add City
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Main Manager ─────────────────────────────────────────────────────────────
export function ProvincesCitiesManager() {
  const { toast } = useToast();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProvince, setAddingProvince] = useState(false);
  const [newProvinceName, setNewProvinceName] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Fetch all provinces with their cities ──────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [provRes, cityRes] = await Promise.all([
        fetch("/api/admin/provinces"),
        fetch("/api/admin/cities"),
      ]);

      if (!provRes.ok || !cityRes.ok) throw new Error("Failed to load");

      const provs: Province[] = await provRes.json();
      const cities: (City & { province: { name: string } })[] = await cityRes.json();

      // Attach cities to their provinces
      const enriched = provs.map((p) => ({
        ...p,
        cities: cities.filter((c) => c.provinceId === p.id),
      }));

      setProvinces(enriched);
    } catch {
      toast({ title: "Error", description: "Could not load provinces/cities", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Province CRUD ──────────────────────────────────────────────────────────
  const handleAddProvince = async () => {
    if (!newProvinceName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/provinces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProvinceName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      const created: Province = await res.json();
      setProvinces((prev) => [...prev, { ...created, cities: [] }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewProvinceName("");
      setAddingProvince(false);
      toast({ title: "Province added", description: `${created.name} has been added.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleProvince = async (p: Province) => {
    try {
      await fetch("/api/admin/provinces", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
      });
      setProvinces((prev) => prev.map((x) => x.id === p.id ? { ...x, isActive: !p.isActive } : x));
    } catch {
      toast({ title: "Error", description: "Failed to update province", variant: "destructive" });
    }
  };

  const handleDeleteProvince = async (id: string) => {
    if (!confirm("Delete this province? All its cities will also be deleted.")) return;
    try {
      const res = await fetch("/api/admin/provinces", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setProvinces((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Province deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleRenameProvince = async (id: string, name: string) => {
    try {
      const res = await fetch("/api/admin/provinces", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setProvinces((prev) => prev.map((p) => p.id === id ? { ...p, name } : p));
      toast({ title: "Province renamed" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // ── City CRUD ──────────────────────────────────────────────────────────────
  const handleAddCity = async (provinceId: string, name: string, fee: number) => {
    try {
      const res = await fetch("/api/admin/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, provinceId, fee }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const created: City = await res.json();
      setProvinces((prev) =>
        prev.map((p) =>
          p.id === provinceId
            ? { ...p, cities: [...(p.cities ?? []), created].sort((a, b) => a.name.localeCompare(b.name)) }
            : p
        )
      );
      toast({ title: "City added", description: `${name} added successfully.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleCity = async (city: City) => {
    try {
      await fetch("/api/admin/cities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: city.id, isActive: !city.isActive }),
      });
      setProvinces((prev) =>
        prev.map((p) =>
          p.id === city.provinceId
            ? { ...p, cities: p.cities?.map((c) => c.id === city.id ? { ...c, isActive: !c.isActive } : c) }
            : p
        )
      );
    } catch {
      toast({ title: "Error", description: "Failed to update city", variant: "destructive" });
    }
  };

  const handleDeleteCity = async (cityId: string) => {
    if (!confirm("Delete this city?")) return;
    try {
      await fetch("/api/admin/cities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cityId }),
      });
      setProvinces((prev) =>
        prev.map((p) => ({ ...p, cities: p.cities?.filter((c) => c.id !== cityId) }))
      );
      toast({ title: "City deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete city", variant: "destructive" });
    }
  };

  const handleEditCity = async (city: City, name: string, fee: number) => {
    try {
      const res = await fetch("/api/admin/cities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: city.id, name, fee }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setProvinces((prev) =>
        prev.map((p) =>
          p.id === city.provinceId
            ? { ...p, cities: p.cities?.map((c) => c.id === city.id ? { ...c, name, fee } : c) }
            : p
        )
      );
      toast({ title: "City updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#6B5A64]">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#1F1720]">Province & City Management</h3>
          <p className="text-xs text-[#6B5A64] mt-0.5">Organise shipping destinations by province. Each city can have its own delivery fee.</p>
        </div>
        <Button
          onClick={() => setAddingProvince(!addingProvince)}
          variant={addingProvince ? "ghost" : "outline"}
          className={addingProvince ? "text-red-500" : "border-brand-border"}
        >
          {addingProvince ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {addingProvince ? "Cancel" : "Add Province"}
        </Button>
      </div>

      {/* Add Province form */}
      {addingProvince && (
        <div className="flex items-end gap-3 p-4 border border-brand-border rounded-xl bg-slate-50">
          <div className="space-y-1 flex-1">
            <Label htmlFor="newProvinceName" className="text-xs font-bold uppercase tracking-wider">Province Name</Label>
            <Input
              id="newProvinceName"
              value={newProvinceName}
              onChange={(e) => setNewProvinceName(e.target.value)}
              placeholder="e.g. Southern Province"
              className="bg-white"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleAddProvince(); }}
            />
          </div>
          <Button
            onClick={handleAddProvince}
            disabled={saving || !newProvinceName.trim()}
            className="bg-[#A7066A] hover:bg-[#8A0558] text-white"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Save Province"}
          </Button>
        </div>
      )}

      {/* Province list */}
      {provinces.length === 0 ? (
        <div className="text-center py-12 text-[#6B5A64] border border-dashed border-brand-border rounded-xl">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No provinces added yet.</p>
          <p className="text-xs mt-1">Add a province above to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {provinces.map((province) => (
            <ProvinceRow
              key={province.id}
              province={province}
              onToggle={handleToggleProvince}
              onDelete={handleDeleteProvince}
              onRename={handleRenameProvince}
              onAddCity={handleAddCity}
              onToggleCity={handleToggleCity}
              onDeleteCity={handleDeleteCity}
              onEditCity={handleEditCity}
            />
          ))}
        </div>
      )}

      {/* Info note */}
      <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex gap-2 text-sm text-amber-900">
        <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p>Only cities under <strong>active provinces</strong> and marked as <strong>Active</strong> appear in the customer checkout dropdown. Each city can override the default delivery fee.</p>
      </div>
    </div>
  );
}
