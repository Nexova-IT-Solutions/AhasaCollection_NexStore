"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  X,
  User,
  Phone,
  UserPlus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { usePosCart } from "@/store/use-pos-cart";
import { toast } from "sonner";
import { SettleDebtModal } from "./SettleDebtModal";

interface SearchResult {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export function CustomerSearch() {
  const customer = usePosCart((s) => s.customer);
  const setCustomer = usePosCart((s) => s.setCustomer);
  const clearCustomer = usePosCart((s) => s.clearCustomer);

  const [phoneQuery, setPhoneQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Create-new-customer inline form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Settlement modal state
  const [showSettleModal, setShowSettleModal] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setShowCreateForm(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setHasSearched(false);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/admin/pos/customers/search?phone=${encodeURIComponent(query)}`
      );
      const data = await res.json();

      if (data.success && Array.isArray(data.customers)) {
        setResults(data.customers);
      } else {
        setResults([]);
      }
      setHasSearched(true);
      setShowDropdown(true);
    } catch (error) {
      console.error("[CustomerSearch] Error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (phoneQuery.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      setShowDropdown(false);
      setShowCreateForm(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      searchCustomers(phoneQuery.trim());
    }, 350);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [phoneQuery, searchCustomers]);

  // Select existing customer
  const handleSelectCustomer = (c: SearchResult) => {
    setCustomer({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
    });
    setShowDropdown(false);
    setShowCreateForm(false);
    setPhoneQuery("");
    toast.success(`Customer: ${c.name || "Unknown Customer"}`, { duration: 1500 });
  };

  // Create new customer
  const handleCreateCustomer = async () => {
    const trimmedName = newName.trim();
    const trimmedPhone = phoneQuery.trim();

    if (trimmedPhone.length < 3) {
      toast.error("Phone number is too short");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/pos/customers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, phone: trimmedPhone }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to create customer");
        return;
      }

      const c = data.customer;
      setCustomer({
        id: c.id,
        name: c.name,
        email: c.email || null,
        phone: c.phone || trimmedPhone,
        outstandingBalance: c.outstandingBalance,
      });

      setShowDropdown(false);
      setShowCreateForm(false);
      setPhoneQuery("");
      setNewName("");
      toast.success(
        data.isExisting
          ? `Found existing: ${c.name || "Unknown Customer"}`
          : `Created: ${c.name || "Unknown Customer"}`
      );
    } catch (error) {
      console.error("[CustomerCreate] Error:", error);
      toast.error("Failed to create customer");
    } finally {
      setIsCreating(false);
    }
  };

  // ─── SELECTED STATE: Show customer badge ──────────────────
  if (customer) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 transition-all">
        <div className="flex items-center justify-center w-7 h-7 bg-emerald-100 rounded-full shrink-0">
          <User className="h-3.5 w-3.5 text-emerald-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-emerald-900 truncate leading-tight flex items-center gap-2">
            {customer.name || "Unknown Customer"}
            {(customer.outstandingBalance || 0) > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                Owes OMR {customer.outstandingBalance?.toFixed(3)}
              </span>
            )}
          </p>
          <p className="text-[10px] text-emerald-600 truncate leading-tight">
            {customer.phone || customer.email || "No contact info"}
          </p>
        </div>
        {(customer.outstandingBalance || 0) > 0 && (
          <button
            onClick={() => setShowSettleModal(true)}
            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-semibold rounded-sm transition-colors shadow-sm whitespace-nowrap mr-1"
          >
            Settle Debt
          </button>
        )}
        <button
          onClick={() => clearCustomer()}
          className="p-1 rounded-md hover:bg-emerald-200/60 text-emerald-500 hover:text-emerald-800 transition-colors shrink-0"
          title="Remove customer"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {showSettleModal && (
          <SettleDebtModal
            isOpen={showSettleModal}
            onClose={() => setShowSettleModal(false)}
            customer={customer}
            onSettled={(newBalance) => {
              setCustomer({ ...customer, outstandingBalance: newBalance });
            }}
          />
        )}
      </div>
    );
  }

  // ─── SEARCH STATE ─────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          ref={inputRef}
          type="tel"
          placeholder="Search by phone..."
          value={phoneQuery}
          onChange={(e) => setPhoneQuery(e.target.value)}
          onFocus={() => {
            if (hasSearched && phoneQuery.trim().length >= 2) {
              setShowDropdown(true);
            }
          }}
          className="h-9 pl-8 pr-8 text-xs bg-white border-slate-200 focus:border-[#A7066A] focus:ring-[#A7066A]/20 transition-colors"
          id="pos-customer-search"
        />
        {isSearching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 animate-spin" />
        )}
        {!isSearching && phoneQuery && (
          <button
            onClick={() => {
              setPhoneQuery("");
              setResults([]);
              setHasSearched(false);
              setShowDropdown(false);
              setShowCreateForm(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl shadow-black/10 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Results List */}
          {results.length > 0 && (
            <div className="max-h-48 overflow-y-auto">
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-b-0"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate flex items-center gap-2">
                      {c.name || "Unknown Customer"}
                      {(c as any).outstandingBalance > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-sm">
                          Owes OMR {(c as any).outstandingBalance.toFixed(3)}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-2.5 w-2.5 text-slate-400" />
                      <span className="text-[10px] text-slate-500 truncate">
                        {c.phone}
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* No Results — Show Create Option */}
          {hasSearched && results.length === 0 && !showCreateForm && (
            <div className="p-3 space-y-2">
              <p className="text-[10px] text-slate-400 text-center">
                No customer found for &ldquo;{phoneQuery}&rdquo;
              </p>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(true)}
                className="w-full h-9 text-xs border-dashed border-slate-300 hover:border-[#A7066A] hover:text-[#A7066A] hover:bg-[#A7066A]/5 transition-all"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Add &ldquo;{phoneQuery}&rdquo; as New Customer
              </Button>
            </div>
          )}

          {/* Inline Create Form */}
          {showCreateForm && (
            <div className="p-3 space-y-2 bg-slate-50/50 border-t border-slate-100">
              <div className="flex items-center gap-1.5 mb-1">
                <UserPlus className="h-3.5 w-3.5 text-[#A7066A]" />
                <span className="text-xs font-semibold text-slate-700">
                  New Customer
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-white rounded-md px-2.5 py-1.5 border border-slate-200">
                <Phone className="h-3 w-3 text-slate-400" />
                {phoneQuery}
              </div>

              <Input
                placeholder="Customer name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateCustomer();
                }}
                className="h-9 text-xs"
                autoFocus
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewName("");
                  }}
                  className="flex-1 h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCustomer}
                  disabled={isCreating}
                  className="flex-1 h-8 text-xs bg-[#A7066A] hover:bg-[#8A0558] text-white"
                >
                  {isCreating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                  )}
                  Create
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
