"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Apple, ArrowLeft, Chrome, Facebook, Github, Globe, Loader2, Mail, Music2, Save } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
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

export type EmployeeFormData = {
  id?: string;
  name: string;
  email: string;
  image: string;
  role: string;
  phoneNumber: string;
  comments: string;
  billingContactName: string;
  billingPhoneNumber: string;
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingCity: string;
  billingPostalCode: string;
  useSameAddressForBilling: boolean;
  deliveryContactName: string;
  deliveryPhoneNumber: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  isDeliveryAddressDifferent: boolean;
  staffPermanentAddressLine1: string;
  staffPermanentCity: string;
  staffPermanentPhoneNumber: string;
  staffPermanentPostalCode: string;
  birthday: string;
  hireDate: string;
  employeeNumber: string;
  language: string;
  templateId: string;
  customPermissions: Record<string, Record<string, boolean>> | null;
  privileges: string[];
  accounts?: { type: string; provider: string; providerAccountId: string }[];
};

type FormValues = EmployeeFormData & { password?: string; confirmPassword?: string };

type EmployeeFormProps = {
  locale: string;
  mode: "create" | "edit";
  user?: EmployeeFormData;
  templates: TemplateData[];
  initialUserType?: "CUSTOMER" | "STAFF";
};

const CUSTOMER_ROLE = "USER";
const CUSTOM_ROLE = "CUSTOM_ROLE";
const CUSTOM_TEMPLATE_OPTION = "CUSTOM";
const STAFF_PERMANENT_ADDRESS_ERROR = "It is mandatory to enter the employee's permanent address.";
const TEN_DIGIT_PHONE_REGEX = /^\d{10}$/;
const PHONE_NUMBER_ERROR = "Phone number must be exactly 10 digits.";
const CITY_NAME_REGEX = /^[A-Za-z\s\-]+$/;
const CITY_NAME_ERROR = "City name should only contain letters.";

function sanitizeSriLankanPhoneInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function buildPrivilegeList(permissions: Record<string, Record<string, boolean>> | null | undefined) {
  if (!permissions) return [] as string[];

  return Object.entries(permissions).flatMap(([sectionKey, actions]) =>
    Object.entries(actions)
      .filter(([, enabled]) => enabled)
      .map(([actionKey]) => `${sectionKey}.${actionKey}`)
  );
}

function hasAnyEnabledPermission(permissions: Record<string, Record<string, boolean>> | null | undefined) {
  return buildPrivilegeList(permissions).length > 0;
}

function createEmptyPermissionTree() {
  return Object.entries(PERMISSION_TREE_STRUCTURE).reduce<Record<string, Record<string, boolean>>>((acc, [sectionKey, section]) => {
    acc[sectionKey] = Object.keys(section.permissions).reduce<Record<string, boolean>>((sectionAcc, permissionKey) => {
      sectionAcc[permissionKey] = false;
      return sectionAcc;
    }, {});
    return acc;
  }, {});
}

const birthdayValidationSchema = z.union([
  z.literal(""),
  z
    .string()
    .refine((date) => new Date(date) <= new Date(), {
      message: "Birthday cannot be in the future",
    }),
]);

const hireDateValidationSchema = z.union([
  z.literal(""),
  z
    .string()
    .refine((date) => new Date(date) <= new Date(), {
      message: "Hire date cannot be in the future",
    }),
]);

function buildEmployeeFormSchema(isCreateMode: boolean, isSocialUser: boolean, hidePasswordFields: boolean) {
  return z
    .object({
      name: z.string().trim().optional(),
      email: isCreateMode
        ? z.string().trim().min(1, "Email is required").email("Please enter a valid email address")
        : z.union([z.literal(""), z.string().trim().email("Please enter a valid email address")]),
      image: z.string().optional(),
      role: z.string(),
      phoneNumber: isCreateMode
        ? z.string().trim().regex(TEN_DIGIT_PHONE_REGEX, PHONE_NUMBER_ERROR)
        : z
            .union([z.literal(""), z.string().trim().regex(TEN_DIGIT_PHONE_REGEX, PHONE_NUMBER_ERROR)])
            .optional(),
      comments: z.string().optional(),
      billingContactName: z.string().trim().optional(),
      billingPhoneNumber: z
        .union([z.literal(""), z.string().trim().regex(TEN_DIGIT_PHONE_REGEX, PHONE_NUMBER_ERROR)])
        .optional(),
      billingAddressLine1: z.string().trim().optional(),
      billingAddressLine2: z.string().trim().optional(),
      billingCity: z.string().trim().optional(),
      billingPostalCode: z.string().trim().optional(),
      useSameAddressForBilling: z.boolean().default(false),
      isDeliveryAddressDifferent: z.boolean().default(false),
      deliveryContactName: z.string().trim().optional(),
      deliveryPhoneNumber: z
        .union([z.literal(""), z.string().trim().regex(TEN_DIGIT_PHONE_REGEX, PHONE_NUMBER_ERROR)])
        .optional(),
      deliveryAddressLine1: z.string().trim().optional(),
      deliveryAddressLine2: z.string().trim().optional(),
      deliveryCity: z.string().trim().optional(),
      deliveryPostalCode: z.string().trim().optional(),
      staffPermanentAddressLine1: z.string().trim().optional(),
      staffPermanentCity: z.string().trim().optional(),
      staffPermanentPhoneNumber: z
        .union([z.literal(""), z.string().trim().regex(TEN_DIGIT_PHONE_REGEX, PHONE_NUMBER_ERROR)])
        .optional(),
      staffPermanentPostalCode: z.string().trim().optional(),
      birthday: birthdayValidationSchema,
      hireDate: hireDateValidationSchema,
      employeeNumber: z.string().trim().optional().nullable(),
      language: z.string().optional(),
      templateId: z.string().optional().nullable(),
      customPermissions: z.record(z.string(), z.record(z.string(), z.boolean())).nullable().optional(),
      privileges: z.array(z.string()).optional(),
      password: isCreateMode
        ? z.string().trim().min(1, "Password is required").min(6, "Password must be at least 6 characters")
        : (isSocialUser || hidePasswordFields)
          ? z.string().optional()
          : z.string().optional().refine((value) => !value || value.length >= 6, "Password must be at least 6 characters"),
      confirmPassword: isCreateMode
        ? z.string().trim().min(1, "Confirm Password is required")
        : z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const isStaff = data.role !== CUSTOMER_ROLE;
      const isCustomer = data.role === CUSTOMER_ROLE;

      if (data.birthday && new Date(data.birthday) > new Date()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["birthday"],
          message: "Birthday cannot be in the future",
        });
      }

      if (data.hireDate && new Date(data.hireDate) > new Date()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hireDate"],
          message: "Hire date cannot be in the future",
        });
      }

      if (isStaff) {
        if (!data.name || data.name.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["name"],
            message: "Need enter full name",
          });
        }
      }

      if (isStaff) {
        const staffPermanentAddressFieldSchema = z
          .string()
          .trim()
          .min(1, STAFF_PERMANENT_ADDRESS_ERROR);

        const staffPermanentRequiredFields: Array<keyof FormValues> = [
          "staffPermanentAddressLine1",
          "staffPermanentCity",
          "staffPermanentPhoneNumber",
        ];

        staffPermanentRequiredFields.forEach((field) => {
          const value = data[field];
          const validation = staffPermanentAddressFieldSchema.safeParse(value ?? "");
          if (!validation.success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [field],
              message: STAFF_PERMANENT_ADDRESS_ERROR,
            });
          }
        });

        const hasCustomTemplatePrivileges =
          !data.templateId && hasAnyEnabledPermission(data.customPermissions);

        if (!data.templateId && !hasCustomTemplatePrivileges) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["templateId"],
            message: "Template is required for staff users.",
          });
        }

        if (!data.hireDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["hireDate"],
            message: "Hire date is required for staff users.",
          });
        }

        if (!data.employeeNumber?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["employeeNumber"],
            message: "Employee number is required for staff users.",
          });
        }

        if (!data.templateId) {
          const selectedPrivileges = buildPrivilegeList(data.customPermissions);
          if (selectedPrivileges.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["customPermissions"],
              message: "Please select at least one privilege for the Custom template.",
            });
          }
        }
      }

      if (isCustomer) {
        const billingRequiredFields: Array<
          [keyof FormValues, string]
        > = [
          ["billingContactName", "This field is required."],
          ["billingPhoneNumber", "This field is required."],
          ["billingAddressLine1", "This field is required."],
          ["billingCity", "This field is required."],
          ["billingPostalCode", "This field is required."],
        ];

        billingRequiredFields.forEach(([field, message]) => {
          const value = data[field];
          if (typeof value !== "string" || value.trim().length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [field],
              message,
            });
          }
        });

        const billingCity = data.billingCity?.trim() || "";
        if (billingCity && !CITY_NAME_REGEX.test(billingCity)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["billingCity"],
            message: CITY_NAME_ERROR,
          });
        }
      }

      if (isCustomer && data.isDeliveryAddressDifferent) {
        const deliveryRequiredFields: Array<
          [keyof FormValues, string]
        > = [
          ["deliveryContactName", "This field is required."],
          ["deliveryPhoneNumber", "This field is required."],
          ["deliveryAddressLine1", "This field is required."],
          ["deliveryCity", "This field is required."],
          ["deliveryPostalCode", "This field is required."],
        ];

        deliveryRequiredFields.forEach(([field, message]) => {
          const value = data[field];
          if (typeof value !== "string" || value.trim().length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [field],
              message,
            });
          }
        });

        const deliveryCity = data.deliveryCity?.trim() || "";
        if (deliveryCity && !CITY_NAME_REGEX.test(deliveryCity)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["deliveryCity"],
            message: CITY_NAME_ERROR,
          });
        }
      }

      if (isStaff) {
        const staffCity = data.staffPermanentCity?.trim() || "";
        if (staffCity && !CITY_NAME_REGEX.test(staffCity)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["staffPermanentCity"],
            message: CITY_NAME_ERROR,
          });
        }
      }

      if (isCreateMode) {
        if (!data.confirmPassword?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["confirmPassword"],
            message: "Confirm Password is required",
          });
        } else if ((data.password || "") !== data.confirmPassword) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["confirmPassword"],
            message: "Passwords do not match",
          });
        }
        return;
      }

      if (hidePasswordFields) {
        return;
      }

      if (!isSocialUser && (data.password || data.confirmPassword)) {
        if (!data.confirmPassword?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["confirmPassword"],
            message: "Confirm Password is required",
          });
        } else if ((data.password || "") !== data.confirmPassword) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["confirmPassword"],
            message: "Passwords do not match",
          });
        }
      }
    });
}

const EMPTY_DEFAULTS: EmployeeFormData = {
  name: "",
  email: "",
  image: "",
  role: "USER",
  phoneNumber: "",
  comments: "",
  billingContactName: "",
  billingPhoneNumber: "",
  billingAddressLine1: "",
  billingAddressLine2: "",
  billingCity: "",
  billingPostalCode: "",
  useSameAddressForBilling: false,
  deliveryContactName: "",
  deliveryPhoneNumber: "",
  deliveryAddressLine1: "",
  deliveryAddressLine2: "",
  deliveryCity: "",
  deliveryPostalCode: "",
  isDeliveryAddressDifferent: false,
  staffPermanentAddressLine1: "",
  staffPermanentCity: "",
  staffPermanentPhoneNumber: "",
  staffPermanentPostalCode: "",
  birthday: "",
  hireDate: "",
  employeeNumber: "",
  language: "en",
  templateId: "",
  customPermissions: null,
  privileges: [],
};

type PermissionTreeProps = {
  permissions: Record<string, Record<string, boolean>> | null;
  onToggle: (sectionKey: string, actionKey: string, checked: boolean) => void;
  isReadOnly: boolean;
};

const PermissionTree = memo(function PermissionTree({ permissions, onToggle, isReadOnly }: PermissionTreeProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Object.entries(PERMISSION_TREE_STRUCTURE).map(([sectionKey, section]) => {
        const sectionPerms = permissions?.[sectionKey] || {};
        const isSectionEditable = !isReadOnly;

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
                      disabled={!isSectionEditable}
                      onChange={(e) => onToggle(sectionKey, actionKey, e.target.checked)}
                    />
                    <span
                      className={cn(
                        "font-medium",
                        checked ? "text-foreground" : "text-muted-foreground",
                        !isSectionEditable && "opacity-70"
                      )}
                    >
                      {actionLabel}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});

function providerLabel(provider: string) {
  if (!provider) return "Unknown";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function ProviderIcon({ provider }: { provider: string }) {
  const normalized = provider.toLowerCase();

  if (normalized.includes("google")) {
    return <Chrome className="h-3.5 w-3.5 text-[#DB4437]" />;
  }

  if (normalized.includes("facebook")) {
    return <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />;
  }

  if (normalized.includes("tiktok")) {
    return <Music2 className="h-3.5 w-3.5 text-[#111827]" />;
  }

  if (normalized.includes("github")) {
    return <Github className="h-3.5 w-3.5 text-[#181717]" />;
  }

  if (normalized.includes("apple")) {
    return <Apple className="h-3.5 w-3.5 text-[#111827]" />;
  }

  if (normalized.includes("credential") || normalized.includes("email")) {
    return <Mail className="h-3.5 w-3.5 text-[#6B7280]" />;
  }

  return <Globe className="h-3.5 w-3.5 text-[#6B7280]" />;
}

export function EmployeeForm({ locale, mode, user, templates, initialUserType = "CUSTOMER" }: EmployeeFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const socialAccountCount = user?.accounts?.length ?? 0;
  const isSocialUser = mode === "edit" && socialAccountCount > 0;
  const isEditMode = mode === "edit";
  const isCustomerEditMode = isEditMode && (user?.role === CUSTOMER_ROLE || initialUserType === "CUSTOMER");
  const hidePasswordFields = isEditMode && (isSocialUser || isCustomerEditMode);
  const formSchema = useMemo(() => buildEmployeeFormSchema(mode === "create", isSocialUser, hidePasswordFields), [mode, isSocialUser, hidePasswordFields]);
  const createRole = initialUserType === "CUSTOMER" ? CUSTOMER_ROLE : "ADMIN";

  const initialValues = mode === "create"
    ? {
        ...EMPTY_DEFAULTS,
        role: createRole,
        templateId: createRole === CUSTOMER_ROLE ? "" : CUSTOM_TEMPLATE_OPTION,
        customPermissions: createRole === CUSTOMER_ROLE ? null : createEmptyPermissionTree(),
      }
    : {
        ...(user ?? EMPTY_DEFAULTS),
        templateId:
          user && user.role !== CUSTOMER_ROLE
            ? user.templateId || CUSTOM_TEMPLATE_OPTION
            : "",
        customPermissions:
          user && user.role !== CUSTOMER_ROLE
            ? user.customPermissions || createEmptyPermissionTree()
            : null,
      };

  const [profileImage, setProfileImage] = useState<(string | File)[]>(
    initialValues.image ? [initialValues.image] : []
  );

  const { register, handleSubmit, reset, watch, setValue, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: initialValues,
  });

  const phoneNumberField = register("phoneNumber");

  const maxBirthdayDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    const values = mode === "create"
      ? initialValues
      : {
          ...(user ?? EMPTY_DEFAULTS),
          templateId:
            user && user.role !== CUSTOMER_ROLE
              ? user.templateId || CUSTOM_TEMPLATE_OPTION
              : "",
          customPermissions:
            user && user.role !== CUSTOMER_ROLE
              ? user.customPermissions || createEmptyPermissionTree()
              : null,
        };
    reset(values);
    setProfileImage(values.image ? [values.image] : []);
    if (mode === "create") {
      setValue("role", values.role || createRole);
    }
  }, [user, reset, mode, createRole, setValue]);

  const watchedRole = watch("role");
  const selectedRole = watchedRole || createRole;
  const watchedTemplateId = watch("templateId");
  const watchedCustomPermissions = watch("customPermissions");
  const isCustomTemplateSelected = watchedTemplateId === CUSTOM_TEMPLATE_OPTION;
  const selectedPrivilegeCount = useMemo(() => buildPrivilegeList(watchedCustomPermissions).length, [watchedCustomPermissions]);
  const customPermissionsErrorText =
    typeof errors.customPermissions?.message === "string"
      ? errors.customPermissions.message
      : null;
  const useSameAddressForBilling = watch("useSameAddressForBilling");
  const isDeliveryAddressDifferent = watch("isDeliveryAddressDifferent");
  const isStandardUser = selectedRole === CUSTOMER_ROLE;
  const selectedTypeLabel = isStandardUser ? "Customer" : "Employee";
  const createHeadingLabel = isStandardUser ? "Customer" : "Employee";
  const identityUserName = (watch("name") || user?.name || "-") || "-";
  const authorizedProviders = user?.accounts ?? [];
  const providerNames = authorizedProviders.map((account) => providerLabel(account.provider)).join(", ");

  const templateMap = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);

  const onTemplateChange = (templateId: string) => {
    setValue("templateId", templateId);
    if (templateId === CUSTOM_TEMPLATE_OPTION) {
      setValue("customPermissions", user?.customPermissions || createEmptyPermissionTree());
      return;
    }

    const template = templateMap.get(templateId);
    if (template) {
      setValue("customPermissions", JSON.parse(JSON.stringify(template.permissions)));
    }
  };

  const handlePermissionToggle = useCallback((sectionKey: string, actionKey: string, checked: boolean) => {
    if (!isCustomTemplateSelected) {
      return;
    }

    const current = (watch("customPermissions") || {}) as Record<string, Record<string, boolean>>;
    const next = { ...current };
    if (!next[sectionKey]) next[sectionKey] = {};
    next[sectionKey][actionKey] = checked;
    setValue("customPermissions", next, { shouldDirty: true });
  }, [isCustomTemplateSelected, setValue, watch]);

  useEffect(() => {
    if (!watchedTemplateId || watchedTemplateId === CUSTOM_TEMPLATE_OPTION) {
      return;
    }

    if (watchedCustomPermissions) {
      return;
    }

    const template = templateMap.get(watchedTemplateId);
    if (template) {
      setValue("customPermissions", JSON.parse(JSON.stringify(template.permissions)));
    }
  }, [setValue, templateMap, watchedCustomPermissions, watchedTemplateId]);

  const deliveryContactName = watch("deliveryContactName");
  const deliveryPhoneNumber = watch("deliveryPhoneNumber");
  const deliveryAddressLine1 = watch("deliveryAddressLine1");
  const deliveryAddressLine2 = watch("deliveryAddressLine2");
  const deliveryCity = watch("deliveryCity");
  const deliveryPostalCode = watch("deliveryPostalCode");
  const billingContactName = watch("billingContactName");
  const billingPhoneNumber = watch("billingPhoneNumber");
  const billingAddressLine1 = watch("billingAddressLine1");
  const billingAddressLine2 = watch("billingAddressLine2");
  const billingCity = watch("billingCity");
  const billingPostalCode = watch("billingPostalCode");

  useEffect(() => {
    if (!useSameAddressForBilling) {
      return;
    }

    if (billingContactName !== deliveryContactName) setValue("billingContactName", deliveryContactName, { shouldDirty: true });
    if (billingPhoneNumber !== deliveryPhoneNumber) setValue("billingPhoneNumber", deliveryPhoneNumber, { shouldDirty: true });
    if (billingAddressLine1 !== deliveryAddressLine1) setValue("billingAddressLine1", deliveryAddressLine1, { shouldDirty: true });
    if ((billingAddressLine2 || "") !== (deliveryAddressLine2 || "")) setValue("billingAddressLine2", deliveryAddressLine2, { shouldDirty: true });
    if (billingCity !== deliveryCity) setValue("billingCity", deliveryCity, { shouldDirty: true });
    if (billingPostalCode !== deliveryPostalCode) setValue("billingPostalCode", deliveryPostalCode, { shouldDirty: true });
  }, [
    useSameAddressForBilling,
    billingContactName,
    billingPhoneNumber,
    billingAddressLine1,
    billingAddressLine2,
    billingCity,
    billingPostalCode,
    deliveryContactName,
    deliveryPhoneNumber,
    deliveryAddressLine1,
    deliveryAddressLine2,
    deliveryCity,
    deliveryPostalCode,
    setValue,
  ]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    const { confirmPassword: _confirmPassword, useSameAddressForBilling: _useSameAddressForBilling, password: _password, ...valuesWithoutSensitive } = values;
    const valuesWithoutConfirm = hidePasswordFields
      ? valuesWithoutSensitive
      : { ...valuesWithoutSensitive, ...(values.password ? { password: values.password } : {}) };

    let imageValue: string | null | undefined =
      profileImage.length === 0
        ? null
        : typeof profileImage[0] === "string"
          ? profileImage[0]
          : undefined;

    if (profileImage.length > 0 && profileImage[0] instanceof File) {
      try {
        const replacePublicUrl = mode === "edit" && user?.image ? user.image : undefined;
        imageValue = await uploadFile(profileImage[0], "avatars", { replacePublicUrl });
      } catch {
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
      ...valuesWithoutConfirm,
      name: values.name,
      image: imageValue,
      billingAddress: values.role === CUSTOMER_ROLE
        ? {
            contactName: values.billingContactName,
            phoneNumber: values.billingPhoneNumber,
            addressLine1: values.billingAddressLine1,
            addressLine2: values.billingAddressLine2,
            city: values.billingCity,
            postalCode: values.billingPostalCode,
          }
        : null,
      isDeliveryAddressDifferent: values.role === CUSTOMER_ROLE ? values.isDeliveryAddressDifferent : false,
      deliveryAddress: values.role === CUSTOMER_ROLE && values.isDeliveryAddressDifferent
        ? {
            contactName: values.deliveryContactName,
            phoneNumber: values.deliveryPhoneNumber,
            addressLine1: values.deliveryAddressLine1,
            addressLine2: values.deliveryAddressLine2,
            city: values.deliveryCity,
            postalCode: values.deliveryPostalCode,
          }
        : null,
      staffPermanentAddress: values.role !== CUSTOMER_ROLE
        ? {
            contactName: values.name,
            addressLine1: values.staffPermanentAddressLine1,
            city: values.staffPermanentCity,
            phoneNumber: values.staffPermanentPhoneNumber,
            postalCode: values.staffPermanentPostalCode,
          }
        : null,
      templateId: values.role === CUSTOMER_ROLE ? null : (values.templateId === CUSTOM_TEMPLATE_OPTION ? null : values.templateId || null),
      customPermissions: values.role === CUSTOMER_ROLE ? null : (values.templateId === CUSTOM_TEMPLATE_OPTION ? (values.customPermissions || null) : null),
      hireDate: values.role === CUSTOMER_ROLE ? null : (values.hireDate || null),
      birthday: values.birthday || null,
      loginStartTime: null,
      loginEndTime: null,
      canOverridePrices: false,
      maxDiscount: 0,
      commissionRate: 0,
      commissionMethod: null,
      ...(values.role === CUSTOMER_ROLE
        ? {
            privileges: [],
            employeeNumber: null,
          }
        : {
            privileges: values.templateId === CUSTOM_TEMPLATE_OPTION
              ? buildPrivilegeList(values.customPermissions)
              : values.role === CUSTOM_ROLE
                ? buildPrivilegeList(values.customPermissions)
                : (values.privileges || []),
          }),
    };

    try {
      const isEdit = mode === "edit" && user?.id;
      const endpoint = isEdit ? `/api/admin/users/${user.id}` : "/api/admin/users";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save user");
      }

      toast({
        title: isEdit ? "User updated" : "User created",
        description: isEdit
          ? "Changes were saved successfully."
          : values.role === CUSTOMER_ROLE
            ? "New customer created successfully."
            : "New employee created successfully.",
      });

      const userId = isEdit ? user.id : data.id;
      router.push(`/admin/users/${userId}`);
      router.refresh();
    } catch (error: any) {
      const errorMessage = error?.message || "Could not save this user.";

      if (errorMessage.toLowerCase().includes("email")) {
        setError("email", { type: "server", message: errorMessage });
      }

      toast({
        title: mode === "edit" ? "Update failed" : "Create failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-6 px-4 md:px-8 lg:px-10">
        <div className="rounded-3xl border border-brand-border bg-gradient-to-r from-white via-[#FFF7FB] to-[#FCEAF4] p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-[#1F1720] tracking-tight">
                {mode === "edit" ? `Edit ${watch("name") || user?.name || "User"}` : `Add New ${createHeadingLabel}`}
              </h1>
              <p className="text-sm text-[#6B5A64]">
                {mode === "edit"
                  ? "Update account details, profile data, and permissions."
                  : "Create a user and choose their role-specific details."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full uppercase bg-white/80">
                {mode === "edit" ? "Edit Mode" : "Create Mode"}
              </Badge>
              <Badge className="rounded-full bg-[#A7066A] text-white hover:bg-[#A7066A]">
                {selectedTypeLabel}
              </Badge>
            </div>
          </div>
          <div className="mt-4">
            <Button asChild variant="outline" className="rounded-full bg-white">
              <Link href={mode === "edit" && user?.id ? `/admin/users/${user.id}` : `/admin/users`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {mode === "edit" ? "Back to Profile" : "Back to Users"}
              </Link>
            </Button>
          </div>
        </div>

        <form 
          onSubmit={handleSubmit(onSubmit, (errors) => {
            console.error("Form validation errors:", errors);
            
            // Find the first error field and scroll to it
            const firstErrorField = Object.keys(errors)[0];
            if (firstErrorField) {
              const element = document.getElementsByName(firstErrorField)[0];
              if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
                element.focus();
              }
            }

            toast({
              title: "Validation Error",
              description: `Please check the form. ${Object.keys(errors).length} field(s) have issues.`,
              variant: "destructive",
            });
          })} 
          className="space-y-6"
        >
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
                <Label required className="text-sm font-semibold">Full Name</Label>
                <Input {...register("name")} placeholder="Full name" />
                {errors.name ? <p className="text-sm text-red-600">{errors.name.message}</p> : null}
              </div>
              {mode === "create" ? (
                <div className="space-y-2">
                  <Label required className="text-sm font-semibold">Role</Label>
                  {initialUserType === "CUSTOMER" ? (
                    <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm font-medium text-[#1F1720]">
                      Role: Customer
                    </div>
                  ) : (
                    <select
                      className="w-full flex h-10 items-center rounded-md border border-input bg-background px-3 py-2 text-sm"
                      {...register("role")}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="STOREFRONT_ADMIN">STORE_FRONT_ADMIN</option>
                      <option value="POS_ADMIN">POS_OPERATOR</option>
                      <option value="CUSTOM_ROLE">CUSTOM</option>
                    </select>
                  )}
                  {errors.role ? <p className="text-sm text-red-600">{errors.role.message}</p> : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label required className="text-sm font-semibold">Role</Label>
                  <select
                    className="w-full flex h-10 items-center rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...register("role")}
                  >
                    <option value="USER">CUSTOMER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="STOREFRONT_ADMIN">STORE_FRONT_ADMIN</option>
                    <option value="POS_ADMIN">POS_OPERATOR</option>
                    <option value="CUSTOM_ROLE">CUSTOM</option>
                  </select>
                  {errors.role ? <p className="text-sm text-red-600">{errors.role.message}</p> : null}
                </div>
              )}
              <div className="space-y-2">
                <Label required={mode === "create"} className="text-sm font-semibold">Email</Label>
                <Input type="email" {...register("email")} placeholder="Email" />
                {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label required={mode === "create"} className="text-sm font-semibold">Phone Number</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  onInput={(event) => {
                    const target = event.currentTarget;
                    target.value = sanitizeSriLankanPhoneInput(target.value);
                  }}
                  {...phoneNumberField}
                  placeholder="0712345678"
                />
                {errors.phoneNumber ? <p className="text-sm text-red-600">{errors.phoneNumber.message}</p> : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">Birthday</label>
                <Input
                  type="date"
                  max={maxBirthdayDate}
                  {...register("birthday")}
                />
                {errors.birthday ? (
                  <p className="text-sm text-red-600">{errors.birthday.message as string}</p>
                ) : null}
              </div>
              {mode === "edit" ? (
                <div className="space-y-2 md:col-span-2 rounded-xl border border-brand-border bg-muted/20 p-4">
                  <p className="text-sm font-semibold text-[#1F1720]">Account Identity</p>
                  <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#6B5A64]">Username</p>
                      <p className="font-semibold text-sm">{identityUserName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B5A64]">Authorized Providers</p>
                      {authorizedProviders.length > 0 ? (
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {authorizedProviders.map((account) => (
                            <div
                              key={`${account.provider}-${account.providerAccountId}`}
                              className="rounded-lg border border-brand-border bg-white px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <ProviderIcon provider={account.provider} />
                                <p className="text-sm font-semibold">{providerLabel(account.provider)}</p>
                              </div>
                              <p className="mt-1 text-xs text-[#6B5A64]">
                                Auth Type: <span className="font-medium text-[#1F1720]">{account.type || "unknown"}</span>
                              </p>
                              <p className="text-xs text-[#6B5A64] break-all">
                                Provider Account ID: <span className="font-medium text-[#1F1720]">{account.providerAccountId}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="font-semibold text-sm">Email/Password</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
              {isSocialUser ? (
                <div className="space-y-2 md:col-span-2 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <div className="flex items-center gap-2">
                    <ProviderIcon provider={authorizedProviders[0]?.provider || ""} />
                    <p className="text-sm font-semibold text-[#1F1720]">Social Provider Info</p>
                  </div>
                  <p className="text-sm text-[#374151] mt-1">
                    This user is registered through {providerNames}. Password cannot be changed.
                  </p>
                </div>
              ) : isCustomerEditMode ? (
                <div className="space-y-2 md:col-span-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="text-sm font-semibold text-[#1F1720]">Password Management</p>
                  <p className="text-sm text-[#374151] mt-1">
                    For security reasons, customer passwords cannot be viewed or changed from this form.
                    The customer can reset their password via the storefront.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 md:col-span-2">
                    <Label required={mode === "create"} className="text-sm font-semibold">
                      Password
                      {mode === "edit" ? <span className="ml-2 text-xs font-normal text-[#6B5A64]">(Set new password)</span> : null}
                    </Label>
                    <PasswordInput {...register("password")} placeholder="Minimum 6 characters" />
                    {errors.password ? <p className="text-sm text-red-600">{errors.password.message}</p> : null}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label required={mode === "create"} className="text-sm font-semibold">Confirm Password</Label>
                    <PasswordInput {...register("confirmPassword")} placeholder="Re-enter password" />
                    {errors.confirmPassword ? <p className="text-sm text-red-600">{errors.confirmPassword.message}</p> : null}
                  </div>
                </>
              )}
              {mode === "create" ? (
                <div className="space-y-2 md:col-span-2">
                  <p className="text-xs text-[#6B5A64]">Password will be used for first-time login.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {isStandardUser ? (
          <Card className="border-brand-border">
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label required className="text-sm font-semibold">Contact Name</Label>
                <Input {...register("billingContactName")} placeholder="Billing contact name" />
                {errors.billingContactName ? <p className="text-sm text-red-600">{errors.billingContactName.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label required className="text-sm font-semibold">Phone Number</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  onInput={(event) => {
                    const target = event.currentTarget;
                    target.value = sanitizeSriLankanPhoneInput(target.value);
                  }}
                  {...register("billingPhoneNumber")}
                  placeholder="Billing phone number"
                />
                {errors.billingPhoneNumber ? <p className="text-sm text-red-600">{errors.billingPhoneNumber.message}</p> : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label required className="text-sm font-semibold">Address Line 1</Label>
                <Input {...register("billingAddressLine1")} placeholder="Billing address line 1" />
                {errors.billingAddressLine1 ? <p className="text-sm text-red-600">{errors.billingAddressLine1.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Address Line 2</Label>
                <Input {...register("billingAddressLine2")} placeholder="Billing address line 2" />
              </div>
              <div className="space-y-2">
                <Label required className="text-sm font-semibold">City</Label>
                <Input {...register("billingCity")} placeholder="Billing city" />
                {errors.billingCity ? <p className="text-sm text-red-600">{errors.billingCity.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label required className="text-sm font-semibold">Postal Code</Label>
                <Input {...register("billingPostalCode")} placeholder="Billing postal code" />
                {errors.billingPostalCode ? <p className="text-sm text-red-600">{errors.billingPostalCode.message}</p> : null}
              </div>
              <div className="md:col-span-2 rounded-xl border border-brand-border bg-muted/20 p-4">
                <label className="flex items-center gap-3 text-sm font-semibold text-[#1F1720]">
                  <input
                    type="checkbox"
                    {...register("isDeliveryAddressDifferent")}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Delivery address is different
                </label>
              </div>
            </CardContent>
          </Card>
          ) : null}

          <div
            className={cn(
              "space-y-6 transition-all duration-300",
              isStandardUser && isDeliveryAddressDifferent ? "opacity-100 max-h-[1200px]" : "opacity-0 max-h-0 overflow-hidden"
            )}
          >
            <Card className="border-brand-border">
              <CardHeader>
                <CardTitle>Delivery Address</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2 rounded-xl border border-brand-border bg-muted/20 p-4">
                  <label className="flex items-center gap-3 text-sm font-semibold text-[#1F1720]">
                    <input
                      type="checkbox"
                      {...register("useSameAddressForBilling")}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Use same address for billing
                  </label>
                </div>
                <div className="space-y-2">
                  <Label required className="text-sm font-semibold">Contact Name</Label>
                  <Input {...register("deliveryContactName")} placeholder="Delivery contact name" />
                  {errors.deliveryContactName ? <p className="text-sm text-red-600">{errors.deliveryContactName.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label required className="text-sm font-semibold">Phone Number</Label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    onInput={(event) => {
                      const target = event.currentTarget;
                      target.value = sanitizeSriLankanPhoneInput(target.value);
                    }}
                    {...register("deliveryPhoneNumber")}
                    placeholder="Delivery phone number"
                  />
                  {errors.deliveryPhoneNumber ? <p className="text-sm text-red-600">{errors.deliveryPhoneNumber.message}</p> : null}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label required className="text-sm font-semibold">Address Line 1</Label>
                  <Input {...register("deliveryAddressLine1")} placeholder="Delivery address line 1" />
                  {errors.deliveryAddressLine1 ? <p className="text-sm text-red-600">{errors.deliveryAddressLine1.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Address Line 2</Label>
                  <Input {...register("deliveryAddressLine2")} placeholder="Delivery address line 2" />
                </div>
                <div className="space-y-2">
                  <Label required className="text-sm font-semibold">City</Label>
                  <Input {...register("deliveryCity")} placeholder="Delivery city" />
                  {errors.deliveryCity ? <p className="text-sm text-red-600">{errors.deliveryCity.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label required className="text-sm font-semibold">Postal Code</Label>
                  <Input {...register("deliveryPostalCode")} placeholder="Delivery postal code" />
                  {errors.deliveryPostalCode ? <p className="text-sm text-red-600">{errors.deliveryPostalCode.message}</p> : null}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className={cn("space-y-6 transition-all duration-300", isStandardUser ? "opacity-0 max-h-0 overflow-hidden" : "opacity-100 max-h-[4000px]")}>
            {!isStandardUser ? (
            <>
              <Card className="border-brand-border">
                <CardHeader>
                  <CardTitle>Permanent Address</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label required className="text-sm font-semibold">Address Line 1</Label>
                    <Input {...register("staffPermanentAddressLine1")} placeholder="Employee permanent address line 1" />
                    {errors.staffPermanentAddressLine1 ? <p className="text-sm text-red-600">{errors.staffPermanentAddressLine1.message as string}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label required className="text-sm font-semibold">City</Label>
                    <Input {...register("staffPermanentCity")} placeholder="Employee permanent city" />
                    {errors.staffPermanentCity ? <p className="text-sm text-red-600">{errors.staffPermanentCity.message as string}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label required className="text-sm font-semibold">Phone Number</Label>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      onInput={(event) => {
                        const target = event.currentTarget;
                        target.value = sanitizeSriLankanPhoneInput(target.value);
                      }}
                      {...register("staffPermanentPhoneNumber")}
                      placeholder="Employee permanent address phone number"
                    />
                    {errors.staffPermanentPhoneNumber ? <p className="text-sm text-red-600">{errors.staffPermanentPhoneNumber.message as string}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Postal Code</Label>
                    <Input {...register("staffPermanentPostalCode")} placeholder="Employee permanent postal code" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-brand-border">
                <CardHeader>
                  <CardTitle>Professional / HR</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label required className="text-sm font-semibold">Hire Date</Label>
                    <Input type="date" max={maxBirthdayDate} {...register("hireDate")} />
                    {errors.hireDate ? <p className="text-sm text-red-600">{errors.hireDate.message as string}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label required className="text-sm font-semibold">Employee Number</Label>
                    <Input {...register("employeeNumber")} placeholder="EMP-001" />
                    {errors.employeeNumber ? <p className="text-sm text-red-600">{errors.employeeNumber.message as string}</p> : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-brand-border">
                <CardHeader>
                  <CardTitle>Permission Template</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label required className="text-sm font-semibold">Template</Label>
                    <select
                      className="w-full flex h-10 items-center rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={watchedTemplateId || ""}
                      onChange={(e) => onTemplateChange(e.target.value)}
                    >
                      <option value={CUSTOM_TEMPLATE_OPTION}>Custom (Dynamic Overrides)</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {errors.templateId ? <p className="text-sm text-red-600">{errors.templateId.message as string}</p> : null}
                  </div>

                  <div
                    className={cn(
                      "rounded-xl border p-2",
                      isCustomTemplateSelected && (selectedPrivilegeCount === 0 || Boolean(errors.customPermissions))
                        ? "border-red-300 bg-red-50/40"
                        : "border-transparent"
                    )}
                  >
                    <PermissionTree
                      permissions={watchedCustomPermissions}
                      onToggle={handlePermissionToggle}
                      isReadOnly={!isCustomTemplateSelected}
                    />
                  </div>
                  {isCustomTemplateSelected && selectedPrivilegeCount === 0 ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      Please select at least one privilege for the Custom template.
                    </div>
                  ) : null}
                  {customPermissionsErrorText ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {customPermissionsErrorText}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting || (isCustomTemplateSelected && selectedPrivilegeCount === 0)}
              className="rounded-full bg-[#A7066A] hover:bg-[#8A0558]"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {mode === "edit" ? "Save Changes" : `Create ${createHeadingLabel}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
