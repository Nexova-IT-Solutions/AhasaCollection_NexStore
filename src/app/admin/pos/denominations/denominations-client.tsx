"use client";

import { useState } from "react";
import {
  Plus,
  Coins,
  Banknote,
  ToggleLeft,
  ToggleRight,
  Loader2,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface DenominationRecord {
  id: string;
  value: number;
  isActive: boolean;
  type: "NOTE" | "COIN";
  createdAt: Date | string;
}

interface DenominationsClientProps {
  initialData: DenominationRecord[];
  currency?: string;
}

export function DenominationsClient({ initialData, currency = "LKR" }: DenominationsClientProps) {
  const [denominations, setDenominations] = useState<DenominationRecord[]>(initialData);
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState<"NOTE" | "COIN">("NOTE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Common LKR currency structures for one-click insertion
  const standardLKR = [5000, 2000, 1000, 500, 100, 50, 20, 10, 5, 2, 1];
  const standardOMR = [50, 20, 10, 5, 1, 0.5, 0.1, 0.05, 0.025, 0.01, 0.005];
  const quickAddSuggestions = currency === "OMR" ? standardOMR : standardLKR;

  const handleCreate = async (valueToAdd?: number) => {
    const valString = valueToAdd !== undefined ? String(valueToAdd) : newValue;
    const intValue = parseFloat(valString);

    if (isNaN(intValue) || intValue <= 0) {
      toast.error("Denomination must be a positive number");
      return;
    }

    const existing = denominations.find((d) => d.value === intValue);
    if (existing && existing.isActive) {
      toast.error(`Denomination ${currency === "LKR" ? "Rs." : currency} ${intValue.toLocaleString("en-LK")} already exists.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const reqType = valueToAdd !== undefined 
        ? (currency === "OMR" ? (intValue >= 0.1 ? "NOTE" : "COIN") : (intValue >= 20 ? "NOTE" : "COIN")) 
        : newType;
      const res = await fetch("/api/admin/denominations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: intValue, isActive: true, type: reqType }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to create denomination");
        return;
      }

      toast.success(data.message || "Denomination created successfully", {
        position: "top-center",
        className: "bg-emerald-50 border border-emerald-200 text-emerald-800",
      });

      if (valueToAdd === undefined) {
        setNewValue("");
      }

      // Re-fetch current list to keep it authoritative
      const listRes = await fetch("/api/admin/denominations");
      const listData = await listRes.json();
      if (listData.success) {
        setDenominations(listData.denominations);
      }
    } catch (error) {
      console.error("Create denomination error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      const res = await fetch("/api/admin/denominations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to toggle status");
        return;
      }

      toast.success("Denomination status updated successfully", {
        position: "top-center",
      });

      // Update state local list
      setDenominations((prev) =>
        prev.map((d) => (d.id === id ? { ...d, isActive: !currentStatus } : d))
      );
    } catch (error) {
      console.error("Toggle denomination error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  const formatPrice = (price: number) => {
    return `${currency === 'LKR' ? 'Rs.' : currency} ${price.toLocaleString("en-LK")}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ─── LEFT: ADD & CONFIGURATION CARD ─── */}
      <div className="space-y-6 lg:col-span-1">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50/50 overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#A7066A]" /> New Denomination
            </CardTitle>
            <CardDescription className="text-xs">
              Inject a new currency note or coin structure into the terminal registers.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {/* Input Form */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Note/Coin Value ({currency})
              </label>
              <div className="flex gap-2">
                <Select value={newType} onValueChange={(v: "NOTE" | "COIN") => setNewType(v)} disabled={isSubmitting}>
                  <SelectTrigger className="w-[100px] h-10 text-xs font-bold">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOTE">Note</SelectItem>
                    <SelectItem value="COIN">Coin</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0.001}
                  step="0.001"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="h-10 text-xs font-bold"
                  placeholder={currency === "OMR" ? "e.g. 0.005" : "e.g. 5000"}
                  disabled={isSubmitting}
                />
                <Button
                  onClick={() => handleCreate()}
                  disabled={isSubmitting || !newValue}
                  className="bg-[#A7066A] hover:bg-[#8A0558] text-white h-10 px-4 rounded-xl text-xs font-bold gap-1 shadow-md"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Add
                </Button>
              </div>
            </div>

            {/* Quick-add recommendations */}
            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick-Add Suggestions
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickAddSuggestions.map((val) => {
                  const alreadyExists = denominations.some((d) => d.value === val);
                  return (
                    <Button
                      key={`quick-${val}`}
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreate(val)}
                      disabled={isSubmitting || alreadyExists}
                      className={`h-7 px-2.5 text-[10px] font-bold transition-all rounded-md ${
                        alreadyExists
                          ? "bg-slate-50 border-slate-100 text-slate-300"
                          : "border-slate-200 hover:border-[#A7066A] hover:bg-[#FCEAF4] hover:text-[#A7066A] text-slate-600"
                      }`}
                    >
                      +{val}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informational Guidance */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-[#FCEAF4]/30 to-white">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start gap-2.5 text-xs">
              <HelpCircle className="h-4 w-4 text-[#A7066A] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-800">Authoritative Baseline Registers</p>
                <p className="text-[#6B5A64] leading-relaxed text-[11px]">
                  Configured values populate the cashier starting-day counting grid. Changing active flags instantly updates the POS terminal interface drawer on reload.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── RIGHT: DATABASE GRID LIST ─── */}
      <Card className="border-0 shadow-lg lg:col-span-2 overflow-hidden bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
            <Banknote className="h-4 w-4 text-[#A7066A]" /> Active POS Currencies
          </CardTitle>
          <CardDescription className="text-xs">
            Review and adjust availability toggles for configured currencies.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {denominations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <AlertCircle className="h-10 w-10 mb-3 stroke-1 text-slate-300" />
              <p className="text-xs font-semibold">No Denominations Configured</p>
              <p className="text-[10px] mt-1 text-slate-400">Add a value on the left to start.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50 border-b border-gray-150">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Value ({currency})</TableHead>
                  <TableHead className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Classification</TableHead>
                  <TableHead className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="py-3.5 px-6 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Toggle Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {denominations.map((denom) => {
                  const isNote = denom.type === "NOTE";
                  return (
                    <TableRow key={denom.id} className="even:bg-gray-50/40 hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                      <TableCell className="py-4 px-6 font-semibold text-gray-900 text-sm">
                        {formatPrice(denom.value)}
                        {currency === "OMR" && denom.value < 1 && (
                          <span className="text-gray-400 text-xs ml-2 font-normal">
                            ({Math.round(denom.value * 1000)} Baisa)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        {isNote ? (
                          <Badge variant="outline" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-150 rounded-md py-0.5 px-2">
                            <Banknote className="h-3.5 w-3.5 mr-1 shrink-0" /> Banknote
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-medium bg-amber-50 text-amber-700 border-amber-150 rounded-md py-0.5 px-2">
                            <Coins className="h-3.5 w-3.5 mr-1 shrink-0" /> Coin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        {denom.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                            <CheckCircle className="h-4 w-4 fill-emerald-50 text-emerald-500" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <AlertCircle className="h-4 w-4 fill-slate-50 text-slate-400" /> Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={togglingId === denom.id}
                          onClick={() => handleToggleActive(denom.id, denom.isActive)}
                          className="h-8 w-16 p-0 hover:bg-transparent inline-flex justify-end"
                        >
                          {togglingId === denom.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-[#A7066A]" />
                          ) : denom.isActive ? (
                            <ToggleRight className="h-7 w-7 text-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer" />
                          ) : (
                            <ToggleLeft className="h-7 w-7 text-slate-300 hover:text-slate-400 transition-colors cursor-pointer" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
