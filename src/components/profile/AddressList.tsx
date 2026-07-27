"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddressCard } from "./AddressCard";
import { AddressForm } from "./AddressForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Address {
  id: string;
  type: "BILLING" | "DELIVERY" | "STAFF_PERMANENT";
  contactName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province?: string | null;
  postalCode: string;
  isDefault: boolean;
}

interface AddressListProps {
  initialAddresses: Address[];
  defaultType?: Address["type"];
  locale: string;
}

export function AddressList({ initialAddresses, defaultType = "DELIVERY", locale }: AddressListProps) {
  const t = useTranslations("Addresses");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setIsOpen(true);
  };

  const handleSuccess = () => {
    setIsOpen(false);
    setEditingAddress(null);
    router.refresh();
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditingAddress(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-4">
          <p className="text-sm font-medium text-gray-500">
            {initialAddresses.length} {initialAddresses.length === 1 ? "address" : "addresses"} found
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {t("addAddress")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingAddress ? t("editAddress") : t("addAddress")}</DialogTitle>
              <DialogDescription>
                {editingAddress 
                  ? "Update your existing address details below." 
                  : "Fill in the details to add a new address to your profile."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <AddressForm 
                initialData={editingAddress ? {
                ...editingAddress,
                addressLine2: editingAddress.addressLine2 ?? undefined
              } : undefined}
                defaultType={defaultType === "STAFF_PERMANENT" ? "DELIVERY" : defaultType}
                locale={locale}
                isFirstAddress={initialAddresses.length === 0}
                onSuccess={handleSuccess}
                onCancel={() => handleOpenChange(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {initialAddresses.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-3xl">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t("noAddresses")}</h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Add your billing and shipping addresses to make your checkout process smooth and fast.
          </p>
          <Button variant="outline" onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("addAddress")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {initialAddresses.map((address) => (
            <AddressCard 
              key={address.id} 
              address={address} 
              locale={locale}
              isLastAddressOfType={initialAddresses.filter((item) => item.type === address.type).length === 1}
              onEdit={() => handleEdit(address)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
