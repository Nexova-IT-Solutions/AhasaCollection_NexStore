"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, User, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { deleteAddress, setDefaultAddress } from "@/app/actions/address";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AddressCardProps {
  address: {
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
  };
  locale: string;
  isLastAddressOfType: boolean;
  onEdit: () => void;
}

export function AddressCard({ address, locale, isLastAddressOfType, onEdit }: AddressCardProps) {
  const t = useTranslations("Addresses");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [needsForceDelete, setNeedsForceDelete] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAddress(address.id, locale, isLastAddressOfType && needsForceDelete);

      if (result?.isLast && !needsForceDelete) {
        setNeedsForceDelete(true);
        return;
      }

      toast.success(result?.message || "Address deleted successfully");
      setIsDeleteOpen(false);
      setNeedsForceDelete(false);
    } catch (error) {
      toast.error("Failed to delete address");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async () => {
    setIsSettingDefault(true);
    try {
      await setDefaultAddress(address.id, address.type, locale);
      toast.success(`${address.type === "BILLING" ? t("billing") : t("shipping")} default address updated`);
    } catch (error) {
      toast.error("Failed to set default address");
    } finally {
      setIsSettingDefault(false);
    }
  };

  const typeColor = address.type === "BILLING" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800";

  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-md ${address.isDefault ? 'border-primary border-2' : ''}`}>
      {address.isDefault && (
        <div className="absolute top-0 right-0 p-2">
          <Badge className="bg-primary hover:bg-primary/90 text-white flex gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Default Address
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={`${typeColor} border-none font-medium capitalize`}>
            {address.type === "BILLING" ? t("billing") : t("shipping")}
          </Badge>
        </div>
        <CardTitle className="text-xl flex items-center gap-2 mt-2">
          <User className="w-5 h-5 text-gray-500" />
          {address.contactName}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3 pb-4">
        <div className="flex gap-2 items-start text-gray-600">
          <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-400" />
          <div className="text-sm">
            <p>{address.addressLine1}</p>
            {address.addressLine2 && <p>{address.addressLine2}</p>}
            <p>{address.city}{address.province ? `, ${address.province}` : ""}, {address.postalCode}</p>
          </div>
        </div>
        
        <div className="flex gap-2 items-center text-gray-600">
          <Phone className="w-5 h-5 flex-shrink-0 text-gray-400" />
          <p className="text-sm">{address.phoneNumber}</p>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t bg-gray-50/50 pt-4">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
            <Edit className="w-4 h-4 mr-1" />
            {t("editAddress")}
          </Button>

          <AlertDialog open={isDeleteOpen} onOpenChange={(open) => {
            setIsDeleteOpen(open);
            if (!open) {
              setNeedsForceDelete(false);
            }
          }}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-1" />
                {t("deleteAddress")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>This action cannot be undone. This will permanently delete your address from our database.</p>
                  {isLastAddressOfType ? (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 font-medium">
                      Warning: This is your last saved address. If you delete this, you will need to re-enter your details at checkout.
                    </p>
                  ) : null}
                  {needsForceDelete ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 font-medium">
                      This will permanently delete your last saved address. Click delete again to confirm.
                    </p>
                  ) : null}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={(event) => {
                  event.preventDefault();
                  void handleDelete();
                }} className="bg-red-600 hover:bg-red-700">
                  {needsForceDelete ? "Delete Anyway" : t("deleteAddress")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {!address.isDefault && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSetDefault} 
            disabled={isSettingDefault}
            className="border-primary/20 text-primary hover:bg-primary/5"
          >
            {t("setDefault")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
