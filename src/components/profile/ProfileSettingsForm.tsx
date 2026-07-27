"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { User, Mail, Phone, MapPin, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";

const getProfileSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(2, t("nameMin")),
  email: z.string().email(t("emailInvalid")),
  phoneNumber: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<ReturnType<typeof getProfileSchema>>;

export function ProfileSettingsForm() {
  const t = useTranslations("ProfileSettings");
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(getProfileSchema(t)),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/profile");
        const data = await response.json();
        if (response.ok) {
          form.reset({
            name: data.name || "",
            email: data.email || "",
            phoneNumber: data.phoneNumber || "",
            addressLine1: data.addressLine1 || "",
            addressLine2: data.addressLine2 || "",
            city: data.city || "",
            state: data.state || "",
            zipCode: data.zipCode || "",
            country: data.country || "",
          });
        } else {
          toast.error(t("loadFailed"));
        }
      } catch (error) {
        toast.error(t("fetchError"));
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [form, t]);

  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Update session to reflect changes in UI (header etc)
        await update();
        toast.success(t("updateSuccess"));
      } else {
        toast.error(result.error || t("updateFailed"));
      }
    } catch (error) {
      toast.error(t("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#A7066A]" />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-6">
        {/* Personal Details */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-[#1F1720] flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            {t("personalDetails")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">{t("fullName")}</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder={t("fullNamePlaceholder")}
                className="h-12 rounded-xl border-gray-200 focus:border-[#A7066A] focus:ring-[#A7066A]"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500 font-medium">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">{t("emailAddress")}</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder={t("emailPlaceholder")}
                className="h-12 rounded-xl border-gray-200 focus:border-[#A7066A] focus:ring-[#A7066A]"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500 font-medium">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">{t("phoneNumber")}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="phoneNumber"
                  {...form.register("phoneNumber")}
                  placeholder={t("phoneNumberPlaceholder")}
                  className="h-12 pl-10 rounded-xl border-gray-200 focus:border-[#A7066A] focus:ring-[#A7066A]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Shipping Address */}
        <section className="space-y-4 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold text-[#1F1720] flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-400" />
            {t("shippingAddress")}
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addressLine1" className="text-sm font-medium text-gray-700">{t("addressLine1")}</Label>
              <Input
                id="addressLine1"
                {...form.register("addressLine1")}
                placeholder={t("addressLine1Placeholder")}
                className="h-12 rounded-xl border-gray-200 focus:border-[#A7066A] focus:ring-[#A7066A]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2" className="text-sm font-medium text-gray-700">{t("addressLine2")}</Label>
              <Input
                id="addressLine2"
                {...form.register("addressLine2")}
                placeholder={t("addressLine2Placeholder")}
                className="h-12 rounded-xl border-gray-200 focus:border-[#A7066A] focus:ring-[#A7066A]"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium text-gray-700">{t("city")}</Label>
                <Input
                  id="city"
                  {...form.register("city")}
                  placeholder={t("cityPlaceholder")}
                  className="h-12 rounded-xl border-gray-200 focus:border-[#A7066A] focus:ring-[#A7066A]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium text-gray-700">{t("state")}</Label>
                <Input
                  id="state"
                  {...form.register("state")}
                  placeholder={t("statePlaceholder")}
                  className="h-12 rounded-xl border-gray-200 focus:border-[#A7066A] focus:ring-[#A7066A]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-sm font-medium text-gray-700">{t("zipCode")}</Label>
                <Input
                  id="zipCode"
                  {...form.register("zipCode")}
                  placeholder={t("zipCodePlaceholder")}
                  className="h-12 rounded-xl border-gray-200 focus:border-[#A7066A] focus:ring-[#A7066A]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium text-gray-700">{t("country")}</Label>
                <Input
                  id="country"
                  {...form.register("country")}
                  placeholder={t("countryPlaceholder")}
                  className="h-12 rounded-xl border-gray-200 focus:border-[#A7066A] focus:ring-[#A7066A]"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="pt-6">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-[#A7066A] hover:bg-[#8A0558] text-white px-10 h-14 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-purple-200"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t("updatingProfile")}
            </>
          ) : (
            t("saveChanges")
          )}
        </Button>
      </div>
    </form>
  );
}
