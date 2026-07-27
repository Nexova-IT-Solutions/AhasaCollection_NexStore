"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { addressSchema, AddressFormValues } from "@/lib/validations/address";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { addAddress, updateAddress } from "@/app/actions/address";
import { toast } from "sonner";

interface AddressFormProps {
  initialData?: AddressFormValues & { id?: string };
  defaultType?: AddressFormValues["type"];
  locale: string;
  isFirstAddress?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddressForm({ initialData, defaultType = "DELIVERY", locale, isFirstAddress = false, onSuccess, onCancel }: AddressFormProps) {
  const t = useTranslations("Addresses");
  const [isLoading, setIsLoading] = useState(false);
  const [shippingCities, setShippingCities] = useState<{ id: string; name: string; provinceName: string }[]>([]);

  useEffect(() => {
    fetch("/api/shipping-cities")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setShippingCities(data.data);
        }
      })
      .catch((err) => console.error("Error fetching cities:", err));
  }, []);

  const RequiredMark = () => <span className="text-red-600"> *</span>;

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: initialData
      ? {
          type: initialData.type,
          contactName: initialData.contactName,
          phoneNumber: initialData.phoneNumber,
          addressLine1: initialData.addressLine1,
          addressLine2: initialData.addressLine2 || "",
          city: initialData.city,
          province: initialData.province || "",
          postalCode: initialData.postalCode,
          isDefault: initialData.isDefault,
        }
      : {
          type: defaultType,
          contactName: "",
          phoneNumber: "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          province: "",
          postalCode: "",
          isDefault: isFirstAddress,
        },
  });


  async function onSubmit(values: AddressFormValues) {
    setIsLoading(true);
    try {
      if (initialData?.id) {
        await updateAddress(initialData.id, values, locale);
        toast.success(t("editAddress") + " " + t("save"));
      } else {
        await addAddress(values, locale);
        toast.success(t("addAddress") + " " + t("save"));
      }
      onSuccess?.();
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("billing")} / {t("shipping")}
                <RequiredMark />
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("validation.typeRequired")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="DELIVERY">{t("shipping")}</SelectItem>
                  <SelectItem value="BILLING">{t("billing")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("contactName")}
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input placeholder="contact name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("phoneNumber")}
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input placeholder="0771234567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="addressLine1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("addressLine1")}
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input placeholder="No 123, Galle Road" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="addressLine2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("addressLine2")}</FormLabel>
              <FormControl>
                <Input placeholder="Apartment 4B (Optional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("city")}
                  <RequiredMark />
                </FormLabel>
                {shippingCities.length > 0 ? (
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      const found = shippingCities.find((c) => c.name === val);
                      if (found) {
                        form.setValue("province", found.provinceName || "");
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {shippingCities.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl>
                    <Input placeholder="Colombo" {...field} />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="province"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Province</FormLabel>
                <FormControl>
                  <Input placeholder="Auto-filled" {...field} disabled className="bg-slate-100 cursor-not-allowed text-slate-500" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("postalCode")}
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input placeholder="00100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={isFirstAddress || field.value}
                  onCheckedChange={field.onChange}
                  disabled={isFirstAddress}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  {isFirstAddress ? "Default Address" : "Make this my default address"}
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              {t("cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : t("save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
