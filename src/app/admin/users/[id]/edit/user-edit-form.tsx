"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import { PERMISSION_TREE_STRUCTURE } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { uploadFile } from "@/utils/supabase";

type TemplateData = {
  id: string;
  name: string;
  permissions: Record<string, Record<string, boolean>>;
};

type EditableUser = {
  id: string;
  name: string;
  email: string;
  image: string;
  role: string;
  phoneNumber: string;
  comments: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  birthday: string;
  hireDate: string;
  employeeNumber: string;
  language: string;
  loginStartTime: string;
  loginEndTime: string;
  canOverridePrices: boolean;
  maxDiscount: number;
  commissionRate: number;
  commissionMethod: string;
  templateId: string;
  customPermissions: Record<string, Record<string, boolean>> | null;
  privileges: string[];
};

type FormValues = EditableUser & { password?: string };

type UserEditFormProps = {
  locale: string;
  user: EditableUser;
  templates: TemplateData[];
};

export function UserEditForm({ locale, user, templates }: UserEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<(string | File)[]>(user.image ? [user.image] : []);

  const { register, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: user,
  });

  useEffect(() => {
    reset(user);
    setProfileImage(user.image ? [user.image] : []);
  }, [user, reset]);

  const watchedRole = watch("role");
  const watchedTemplateId = watch("templateId");
  const watchedCustomPermissions = watch("customPermissions");
  const isStandardUser = watchedRole === "USER";

  const templateMap = useMemo(() => {
    return new Map(templates.map((t) => [t.id, t]));
  }, [templates]);

  const onTemplateChange = (templateId: string) => {
    setValue("templateId", templateId);
    if (!templateId) {
      setValue("customPermissions", null);
      return;
    }

    const template = templateMap.get(templateId);
    if (template) {
      setValue("customPermissions", JSON.parse(JSON.stringify(template.permissions)));
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);

    let imageValue: string | null | undefined =
      profileImage.length === 0
        ? null
        : typeof profileImage[0] === "string"
          ? profileImage[0]
          : undefined;

    if (profileImage.length > 0 && profileImage[0] instanceof File) {
      try {
        imageValue = await uploadFile(profileImage[0], "avatars");
      } catch (error) {
        toast({
          title: "Image upload failed",
          description: "Could not upload profile image to Supabase.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      ...values,
      image: imageValue,
      templateId: values.templateId || null,
      customPermissions: values.customPermissions || null,
      hireDate: values.hireDate || null,
      birthday: values.birthday || null,
      ...(values.role === "USER"
        ? {
            templateId: null,
            customPermissions: null,
            privileges: [],
            hireDate: null,
            employeeNumber: "",
            loginStartTime: null,
            loginEndTime: null,
            canOverridePrices: false,
            maxDiscount: 0,
            commissionRate: 0,
            commissionMethod: null,
          }
        : {}),
    };

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to update user");
      }

      toast({
        title: "User updated",
        description: "Changes were saved successfully.",
      });

      router.push(`/admin/users/${user.id}`);
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Could not save this user.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-6 px-4 md:px-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" className="rounded-full">
            <Link href={`/admin/users/${user.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Link>
          </Button>
          <Badge variant="outline" className="rounded-full uppercase">Editing {watch("name") || user.name}</Badge>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-brand-border">
            <CardHeader>
              <CardTitle>Personal and Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">Profile Photo</label>
                <ImageUpload value={profileImage} onChange={setProfileImage} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Full Name</label>
                <Input {...register("name")} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Email</label>
                <Input type="email" {...register("email")} placeholder="Email" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Phone Number</label>
                <Input {...register("phoneNumber")} placeholder="Phone" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Birthday</label>
                <Input type="date" {...register("birthday")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Role</label>
                <select
                  className="w-full flex h-10 items-center rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register("role")}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="DEV_ADMIN">DEV_ADMIN</option>
                  <option value="POS_ADMIN">POS_ADMIN</option>
                  <option value="STOREFRONT_ADMIN">STOREFRONT_ADMIN</option>
                  <option value="CUSTOM_ROLE">CUSTOM_ROLE</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-brand-border">
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Address Line 1</label>
                <Input {...register("addressLine1")} placeholder="Address line 1" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Address Line 2</label>
                <Input {...register("addressLine2")} placeholder="Address line 2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">City</label>
                <Input {...register("city")} placeholder="City" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">State</label>
                <Input {...register("state")} placeholder="State" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Zip Code</label>
                <Input {...register("zipCode")} placeholder="Zip code" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Country</label>
                <Input {...register("country")} placeholder="Country" />
              </div>
            </CardContent>
          </Card>

          {!isStandardUser ? (
            <>
              <Card className="border-brand-border">
                <CardHeader>
                  <CardTitle>Professional / HR</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Hire Date</label>
                    <Input type="date" {...register("hireDate")} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Employee Number</label>
                    <Input {...register("employeeNumber")} placeholder="EMP-001" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Login Start Time</label>
                    <Input type="time" {...register("loginStartTime")} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Login End Time</label>
                    <Input type="time" {...register("loginEndTime")} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-brand-border">
                <CardHeader>
                  <CardTitle>Financials</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Commission Rate</label>
                    <Input type="number" step="0.01" {...register("commissionRate", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Max Discount</label>
                    <Input type="number" step="0.01" {...register("maxDiscount", { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Commission Method</label>
                    <Input {...register("commissionMethod")} placeholder="PERCENT_OF_SALE" />
                  </div>
                  <div className="space-y-2 flex items-center justify-between rounded-xl border p-3 mt-7">
                    <label className="text-sm font-semibold">Can Override Prices</label>
                    <input type="checkbox" {...register("canOverridePrices")} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-brand-border">
                <CardHeader>
                  <CardTitle>Permission Template</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Template</label>
                    <select
                      className="w-full flex h-10 items-center rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={watchedTemplateId || ""}
                      onChange={(e) => onTemplateChange(e.target.value)}
                    >
                      <option value="">No Template Assigned</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {Object.entries(PERMISSION_TREE_STRUCTURE).map(([sectionKey, section]) => {
                      const sectionPerms = watchedCustomPermissions?.[sectionKey] || {};

                      return (
                        <div key={sectionKey} className="rounded-xl border p-4">
                          <h3 className="mb-2 text-sm font-bold text-[#A7066A]">{section.label}</h3>
                          <div className="space-y-2">
                            {Object.entries(section.permissions).map(([actionKey, actionLabel]) => {
                              const checked = sectionPerms[actionKey] === true;

                              return (
                                <label key={actionKey} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const current = (watch("customPermissions") || {}) as Record<string, Record<string, boolean>>;
                                      const next = { ...current };
                                      if (!next[sectionKey]) next[sectionKey] = {};
                                      next[sectionKey][actionKey] = e.target.checked;
                                      setValue("customPermissions", next);
                                    }}
                                  />
                                  <span className={cn("font-medium", checked ? "text-foreground" : "text-muted-foreground")}>{actionLabel}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting} className="rounded-full bg-[#A7066A] hover:bg-[#8A0558]">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
