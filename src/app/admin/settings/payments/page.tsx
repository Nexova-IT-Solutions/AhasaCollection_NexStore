"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  ShieldCheck, 
  ShieldAlert, 
  CreditCard, 
  Wallet, 
  Truck,
  Settings2,
  Lock,
  Plus,
  Trash2,
  Landmark,
  Building2,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

type Gateway = {
  type: "DIRECTPAY" | "MINTPAY" | "COD" | "BANK_TRANSFER";
  mode: "SANDBOX" | "LIVE";
  enabled: boolean;
  feeType: "NONE" | "FIXED" | "PERCENTAGE";
  feeValue: number;
  config: Record<string, any>;
  bankAccounts?: BankAccount[];
};

type BankAccount = {
  id?: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string;
  isActive: boolean;
};

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [gateways, setGateways] = useState<Gateway[]>([]);

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      const res = await fetch("/api/admin/settings/payments");
      const data = await res.json();
      
      const methods: ("DIRECTPAY" | "MINTPAY" | "COD" | "BANK_TRANSFER")[] = ["DIRECTPAY", "MINTPAY", "COD", "BANK_TRANSFER"];
      const initial = methods.map(name => {
        const found = data.gateways?.find((g: any) => g.name === name) || data.find?.((g: any) => g.name === name);
        return { 
          type: name, 
          mode: found?.mode || "SANDBOX", 
          enabled: found?.isActive || false, 
          feeType: found?.feeType || "NONE",
          feeValue: found?.feeValue || 0,
          config: found?.config || ((name === "COD" || name === "BANK_TRANSFER") ? { instructions: "" } : {}),
          bankAccounts: name === "BANK_TRANSFER" ? (data.bankAccounts || []) : undefined
        };
      });
      
      setGateways(initial);
    } catch (error) {
      toast.error("Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (name: string) => {
    setSaving(name);
    try {
      const gateway = gateways.find(g => g.type === name)!;
      
      const res = await fetch("/api/admin/settings/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway: gateway.type,
          mode: gateway.mode,
          isActive: gateway.enabled,
          feeType: gateway.feeType,
          feeValue: Number(gateway.feeValue),
          config: gateway.config,
          bankAccounts: gateway.type === "BANK_TRANSFER" ? gateway.bankAccounts : undefined
        }),
      });

      if (res.ok) {
        toast.success(`${name.replace("_", " ")} settings saved securely`);
      } else {
        throw new Error();
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(null);
    }
  };

  const updateLocalState = (name: string, updates: Partial<Gateway> | { config: Record<string, any> } | { bankAccounts: BankAccount[] }) => {
    setGateways(prev => prev.map(g => {
      if (g.type !== name) return g;
      
      if ("config" in updates) {
        return { ...g, config: { ...g.config, ...updates.config } };
      }
      
      if ("bankAccounts" in updates) {
        return { ...g, bankAccounts: updates.bankAccounts };
      }

      return { ...g, ...updates };
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#A7066A]" />
          <p className="text-sm font-medium text-[#6B5A64] animate-pulse">Loading secure configurations...</p>
        </div>
      </div>
    );
  }

    const directPay = gateways.find(g => g.type === "DIRECTPAY");
    const mintpay = gateways.find(g => g.type === "MINTPAY");
    const cod = gateways.find(g => g.type === "COD");
    const bankTransfer = gateways.find(g => g.type === "BANK_TRANSFER") || { type: "BANK_TRANSFER", enabled: false, bankAccounts: [] };

    if (!directPay || !mintpay || !cod) {
      return (
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#A7066A]" />
        </div>
      );
    }

    const addBankAccount = () => {
      const currentAccounts = bankTransfer.bankAccounts || [];
      updateLocalState("BANK_TRANSFER", {
        bankAccounts: [...currentAccounts, {
          bankName: "",
          accountName: "",
          accountNumber: "",
          branchName: "",
          isActive: true
        }]
      });
    };

    const updateBankAccount = (index: number, accountUpdates: Partial<BankAccount>) => {
      const currentAccounts = [...(bankTransfer.bankAccounts || [])];
      currentAccounts[index] = { ...currentAccounts[index], ...accountUpdates };
      updateLocalState("BANK_TRANSFER", { bankAccounts: currentAccounts });
    };

    const removeBankAccount = (index: number) => {
      const currentAccounts = (bankTransfer.bankAccounts || []).filter((_, i) => i !== index);
      updateLocalState("BANK_TRANSFER", { bankAccounts: currentAccounts });
    };

    return (
      <div className="max-w-7xl mx-auto space-y-8 p-6 lg:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border pb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1F1720] tracking-tight">Payment Gateway Manager</h1>
            <p className="text-[#6B5A64] mt-1 text-lg">Configure and secure your storefront payment providers.</p>
          </div>
          <div className="flex items-center gap-2 bg-[#FCEAF4] px-4 py-2 rounded-2xl border border-[#A7066A]/20">
            <Lock className="w-4 h-4 text-[#A7066A]" />
            <span className="text-xs font-bold text-[#A7066A] uppercase tracking-wider">AES-256 Encrypted</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Direct Pay Card */}
          <GatewayCard 
            title="Direct Pay" 
            icon={<CreditCard className="w-6 h-6" />}
            gateway={directPay}
            onUpdate={updateLocalState}
            onSave={() => handleUpdate("DIRECTPAY")}
            isSaving={saving === "DIRECTPAY"}
          >
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] uppercase font-bold text-[#6B5A64] tracking-wider">Merchant ID</Label>
                <Input 
                  placeholder="Enter Merchant ID"
                  value={directPay.config.merchantId || ""}
                  onChange={(e) => updateLocalState("DIRECTPAY", { config: { merchantId: e.target.value } })}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] uppercase font-bold text-[#6B5A64] tracking-wider">API Key</Label>
                <Input 
                  placeholder="Enter API Key"
                  value={directPay.config.apiKey || ""}
                  onChange={(e) => updateLocalState("DIRECTPAY", { config: { apiKey: e.target.value } })}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] uppercase font-bold text-[#6B5A64] tracking-wider">Secret Key</Label>
                <Input 
                  type="password"
                  placeholder="••••••••••••••••"
                  value={directPay.config.secretKey || ""}
                  onChange={(e) => updateLocalState("DIRECTPAY", { config: { secretKey: e.target.value } })}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
          </GatewayCard>

          {/* Mintpay Card */}
          <GatewayCard 
            title="Mintpay" 
            icon={<Wallet className="w-6 h-6" />}
            gateway={mintpay}
            onUpdate={updateLocalState}
            onSave={() => handleUpdate("MINTPAY")}
            isSaving={saving === "MINTPAY"}
          >
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] uppercase font-bold text-[#6B5A64] tracking-wider">Public Key</Label>
                <Input 
                  placeholder="Enter Public Key"
                  value={mintpay.config.publicKey || ""}
                  onChange={(e) => updateLocalState("MINTPAY", { config: { publicKey: e.target.value } })}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] uppercase font-bold text-[#6B5A64] tracking-wider">Secret Key</Label>
                <Input 
                  type="password"
                  placeholder="••••••••••••••••"
                  value={mintpay.config.secretKey || ""}
                  onChange={(e) => updateLocalState("MINTPAY", { config: { secretKey: e.target.value } })}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
          </GatewayCard>

          {/* Cash on Delivery Card */}
          <GatewayCard 
            title="Cash on Delivery" 
            icon={<Truck className="w-6 h-6" />}
            gateway={cod}
            onUpdate={updateLocalState}
            onSave={() => handleUpdate("COD")}
            isSaving={saving === "COD"}
            hideMode
          >
            <div className="space-y-2">
              <Label className="text-[11px] uppercase font-bold text-[#6B5A64] tracking-wider">Customer Instructions</Label>
              <Textarea 
                placeholder="e.g., Please have the exact amount ready for the delivery partner."
                value={cod.config.instructions || ""}
                onChange={(e) => updateLocalState("COD", { config: { instructions: e.target.value } })}
                className="min-h-[120px] rounded-xl resize-none"
              />
              <p className="text-[10px] text-[#6B5A64] font-medium italic">This text will be displayed to customers during checkout.</p>
            </div>
          </GatewayCard>

          {/* Bank Transfer Card */}
          <GatewayCard 
            title="Bank Transfer" 
            icon={<Landmark className="w-6 h-6" />}
            gateway={bankTransfer}
            onUpdate={updateLocalState}
            onSave={() => handleUpdate("BANK_TRANSFER")}
            isSaving={saving === "BANK_TRANSFER"}
            hideMode
          >
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] uppercase font-bold text-[#6B5A64] tracking-wider flex items-center gap-2">
                    <Building2 className="w-3 h-3" /> Bank Accounts
                  </Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addBankAccount}
                    className="h-8 rounded-lg border-[#A7066A] text-[#A7066A] hover:bg-[#FCEAF4] text-[10px] font-bold uppercase tracking-wider"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Account
                  </Button>
                </div>

                <div className="space-y-3">
                  {(!bankTransfer.bankAccounts || bankTransfer.bankAccounts.length === 0) ? (
                    <div className="text-center py-8 bg-[#FAFAFA] rounded-2xl border border-dashed border-brand-border">
                      <Landmark className="w-8 h-8 text-[#6B5A64]/30 mx-auto mb-2" />
                      <p className="text-xs text-[#6B5A64] font-medium">No bank accounts added yet.</p>
                    </div>
                  ) : (
                    bankTransfer.bankAccounts.map((account, index) => (
                      <div key={index} className="p-4 bg-white rounded-2xl border border-brand-border shadow-sm space-y-4 relative group">
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                          <Switch 
                            checked={account.isActive} 
                            onCheckedChange={(checked) => updateBankAccount(index, { isActive: checked })}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeBankAccount(index)}
                            className="h-8 w-8 text-[#6B5A64] hover:text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-[#6B5A64] uppercase tracking-wider">Bank Name</Label>
                            <Input 
                              placeholder="e.g. Commercial Bank"
                              value={account.bankName}
                              onChange={(e) => updateBankAccount(index, { bankName: e.target.value })}
                              className="h-9 text-sm rounded-lg"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-[#6B5A64] uppercase tracking-wider">Account Name</Label>
                            <Input 
                              placeholder="e.g. GiftBox Lanka (PVT) LTD"
                              value={account.accountName}
                              onChange={(e) => updateBankAccount(index, { accountName: e.target.value })}
                              className="h-9 text-sm rounded-lg"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-[#6B5A64] uppercase tracking-wider">Account Number</Label>
                            <Input 
                              placeholder="0000 0000 0000"
                              value={account.accountNumber}
                              onChange={(e) => updateBankAccount(index, { accountNumber: e.target.value })}
                              className="h-9 text-sm rounded-lg font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-[#6B5A64] uppercase tracking-wider">Branch (Optional)</Label>
                            <Input 
                              placeholder="e.g. Colombo 07"
                              value={account.branchName}
                              onChange={(e) => updateBankAccount(index, { branchName: e.target.value })}
                              className="h-9 text-sm rounded-lg"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-[#6B5A64] uppercase tracking-wider flex items-center gap-1">
                            <Info className="w-3 h-3" /> Account Instructions (Optional)
                          </Label>
                          <Input 
                            placeholder="e.g. Please mention order ID in reference"
                            value={account.instructions || ""}
                            onChange={(e) => updateBankAccount(index, { instructions: e.target.value })}
                            className="h-9 text-sm rounded-lg"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t border-brand-border pt-6">
                <Label className="text-[11px] uppercase font-bold text-[#6B5A64] tracking-wider">Global Instructions</Label>
                <Textarea 
                  placeholder="Instructions shown to customers at checkout..."
                  value={bankTransfer.config?.instructions || ""}
                  onChange={(e) => updateLocalState("BANK_TRANSFER", { config: { instructions: e.target.value } })}
                  className="min-h-[100px] rounded-xl resize-none"
                />
                <p className="text-[10px] text-[#6B5A64] font-medium italic">Display bank details and verification steps clearly.</p>
              </div>
            </div>
          </GatewayCard>
        </div>
      </div>
    );
}

function GatewayCard({ 
  title, 
  icon, 
  gateway, 
  onUpdate, 
  onSave, 
  isSaving, 
  children,
  hideMode = false
}: { 
  title: string;
  icon: React.ReactNode;
  gateway: Gateway;
  onUpdate: (name: string, updates: any) => void;
  onSave: () => void;
  isSaving: boolean;
  children: React.ReactNode;
  hideMode?: boolean;
}) {
  return (
    <Card className="overflow-hidden border-brand-border shadow-md hover:shadow-lg transition-shadow duration-300 rounded-3xl">
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FCEAF4] flex items-center justify-center text-[#A7066A]">
              {icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1F1720]">{title}</h3>
              {!hideMode && (
                <div className="mt-1 flex items-center gap-2">
                  {gateway.mode === "LIVE" ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] font-bold uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Live
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                      <ShieldAlert className="w-3 h-3 mr-1" /> Sandbox
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Switch 
              checked={gateway.enabled} 
              onCheckedChange={(checked) => onUpdate(gateway.type, { enabled: checked })}
            />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              gateway.enabled ? "text-[#A7066A]" : "text-[#6B5A64]"
            )}>
              {gateway.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        <div className="pt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] uppercase font-bold text-[#6B5A64] tracking-wider">Convenience Fee Type</Label>
              <Select 
                value={gateway.feeType} 
                onValueChange={(val: any) => onUpdate(gateway.type, { feeType: val })}
              >
                <SelectTrigger className="h-11 rounded-xl text-left">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="FIXED">Fixed Amount (LKR)</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] uppercase font-bold text-[#6B5A64] tracking-wider">Fee Value</Label>
              <Input 
                type="number"
                disabled={gateway.feeType === "NONE"}
                placeholder="0"
                value={gateway.feeValue}
                onChange={(e) => onUpdate(gateway.type, { feeValue: Number(e.target.value) })}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {!hideMode && (
            <div className="space-y-2">
              <Label className="text-[11px] uppercase font-bold text-[#6B5A64] tracking-wider flex items-center gap-1">
                <Settings2 className="w-3 h-3" /> Operational Mode
              </Label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAFAFA] rounded-xl border border-brand-border">
                <button
                  onClick={() => onUpdate(gateway.type, { mode: "SANDBOX" })}
                  className={cn(
                    "py-2 text-xs font-bold rounded-lg transition-all",
                    gateway.mode === "SANDBOX" 
                      ? "bg-white text-amber-600 shadow-sm border border-amber-200" 
                      : "text-[#6B5A64] hover:text-[#1F1720]"
                  )}
                >
                  SANDBOX
                </button>
                <button
                  onClick={() => onUpdate(gateway.type, { mode: "LIVE" })}
                  className={cn(
                    "py-2 text-xs font-bold rounded-lg transition-all",
                    gateway.mode === "LIVE" 
                      ? "bg-white text-green-600 shadow-sm border border-green-200" 
                      : "text-[#6B5A64] hover:text-[#1F1720]"
                  )}
                >
                  LIVE
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {children}
          </div>

          <div className="pt-4">
            <Button 
              disabled={isSaving}
              onClick={onSave}
              className="w-full bg-[#1F1720] hover:bg-[#1F1720]/90 text-white h-12 rounded-2xl font-bold tracking-wide shadow-lg hover:shadow-xl transition-all"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              {isSaving ? "Saving Config..." : "Save Gateway Changes"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
