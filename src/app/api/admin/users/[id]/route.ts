import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcrypt";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const TEN_DIGIT_PHONE_REGEX = /^\d{10}$/;
const PHONE_NUMBER_ERROR = "Phone number must be exactly 10 digits.";
const CITY_NAME_REGEX = /^[A-Za-z\s\-]+$/;
const CITY_NAME_ERROR = "City name should only contain letters.";

const addressPayloadSchema = z.object({
  contactName: z.string().trim().min(1, "This field is required."),
  phoneNumber: z.string().trim().min(1, "This field is required."),
  addressLine1: z.string().trim().min(1, "This field is required."),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1, "This field is required."),
  postalCode: z.string().trim().min(1, "This field is required."),
});

const staffPermanentAddressPayloadSchema = z.object({
  addressLine1: z.string().trim().min(1, "It is mandatory to enter the employee's permanent address."),
  city: z.string().trim().min(1, "It is mandatory to enter the employee's permanent address."),
  phoneNumber: z
    .string()
    .trim()
    .min(1, "It is mandatory to enter the employee's permanent address.")
    .regex(TEN_DIGIT_PHONE_REGEX, PHONE_NUMBER_ERROR),
  postalCode: z.string().trim().optional(),
});

const CUSTOMER_ROLE = "USER";

/**
 * Resolves the final privileges array for a user by:
 * 1. Looking up the PermissionTemplate if a templateId is given.
 * 2. Extracting all keys from template.permissions whose value === true.
 * 3. Merging those with any explicitly supplied customPrivileges, deduped.
 */
async function resolvePrivileges({
  templateId,
  customPrivileges,
}: {
  templateId?: string | null;
  customPrivileges?: string[];
}): Promise<string[]> {
  let templatePrivileges: string[] = [];

  if (templateId) {
    try {
      const template = await db.permissionTemplate.findUnique({
        where: { id: templateId },
        select: { permissions: true },
      });

      if (template?.permissions && typeof template.permissions === "object") {
        // permissions is a flat Record<string, boolean> — extract keys that are enabled
        templatePrivileges = Object.entries(
          template.permissions as Record<string, boolean>
        )
          .filter(([, enabled]) => enabled === true)
          .map(([key]) => key);
      }
    } catch (err) {
      console.error("[resolvePrivileges] Failed to fetch permission template:", err);
    }
  }

  const merged = Array.from(
    new Set([...templatePrivileges, ...(customPrivileges ?? [])].filter(Boolean))
  );

  return merged;
}

function hasEnabledPermission(
  permissions: Record<string, Record<string, boolean>> | null | undefined
) {
  if (!permissions) return false;

  return Object.values(permissions).some((sectionPermissions) => {
    return Object.values(sectionPermissions).some((enabled) => enabled === true);
  });
}

const updateUserSchema = z
  .object({
    name: z.string().trim().optional(),
    email: z.union([z.literal(""), z.string().trim().email("Please enter a valid email address")]).optional().nullable(),
    image: z.string().url().optional().nullable(),
    role: z.string().trim().min(1, "User type is required"),
    privileges: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(6).optional(),
    templateId: z.string().optional().nullable(),
    customPermissions: z.record(z.string(), z.record(z.string(), z.boolean())).optional().nullable(),
    phoneNumber: z
      .union([z.literal(""), z.string().trim().regex(TEN_DIGIT_PHONE_REGEX, PHONE_NUMBER_ERROR)])
      .optional()
      .nullable(),
    comments: z.string().trim().optional().nullable(),
    billingAddress: addressPayloadSchema.optional().nullable(),
    isDeliveryAddressDifferent: z.boolean().optional().default(false),
    deliveryAddress: addressPayloadSchema.optional().nullable(),
    staffPermanentAddress: staffPermanentAddressPayloadSchema.optional().nullable(),
    loginStartTime: z.string().trim().optional().nullable(),
    loginEndTime: z.string().trim().optional().nullable(),
    hireDate: z.string().optional().nullable(),
    birthday: z.string().optional().nullable(),
    employeeNumber: z.string().trim().optional().nullable(),
    language: z.string().trim().optional().nullable(),
    canOverridePrices: z.boolean().optional(),
    maxDiscount: z.coerce.number().min(0).max(100).optional(),
    commissionRate: z.coerce.number().min(0).max(100).optional(),
    commissionMethod: z.string().trim().optional().nullable(),
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
      const hasCustomTemplateData = data.customPermissions !== null && data.customPermissions !== undefined;
      const hasCustomTemplatePrivileges = hasEnabledPermission(data.customPermissions);

      if (!data.staffPermanentAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["staffPermanentAddress"],
          message: "It is mandatory to enter the employee's permanent address.",
        });
      }

      if (!data.templateId && !hasCustomTemplateData) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["templateId"],
          message: "Template is required for staff users.",
        });
      }

      if (!data.templateId && hasCustomTemplateData && !hasCustomTemplatePrivileges) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customPermissions"],
          message: "Please select at least one privilege for the Custom template.",
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

      const staffCity = data.staffPermanentAddress?.city?.trim() || "";
      if (staffCity && !CITY_NAME_REGEX.test(staffCity)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["staffPermanentAddress", "city"],
          message: CITY_NAME_ERROR,
        });
      }
    }

      if (isCustomer && !data.billingAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["billingAddress"],
          message: "Billing address is required.",
        });
      }

      if (isCustomer && data.isDeliveryAddressDifferent && !data.deliveryAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["deliveryAddress"],
          message: "Delivery address is required.",
        });
      }

    if (data.billingAddress?.city && !CITY_NAME_REGEX.test(data.billingAddress.city.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["billingAddress", "city"],
        message: CITY_NAME_ERROR,
      });
    }

    if (data.deliveryAddress?.city && !CITY_NAME_REGEX.test(data.deliveryAddress.city.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryAddress", "city"],
        message: CITY_NAME_ERROR,
      });
    }
  });

type AddressPayload = z.infer<typeof addressPayloadSchema>;

async function upsertAddressByType({
  userId,
  type,
  address,
}: {
  userId: string;
  type: "BILLING" | "DELIVERY";
  address: AddressPayload;
}) {
  const existingAddress = await db.address.findFirst({
    where: { userId, type },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const addressData = {
    contactName: address.contactName.trim(),
    phoneNumber: address.phoneNumber.trim(),
    addressLine1: address.addressLine1.trim(),
    addressLine2: address.addressLine2?.trim() || null,
    city: address.city.trim(),
    postalCode: address.postalCode.trim(),
    isDefault: true,
  };

  if (existingAddress) {
    await db.address.update({
      where: { id: existingAddress.id },
      data: addressData,
    });
    return;
  }

  await db.address.create({
    data: {
      userId,
      type,
      ...addressData,
    },
  });
}

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        privileges: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          where: {
            type: {
              in: ["BILLING", "DELIVERY"],
            },
          },
          select: {
            id: true,
            type: true,
            contactName: true,
            phoneNumber: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            postalCode: true,
            isDefault: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
        },
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
          }
        },
        templateId: true,
        customPermissions: true,
        phoneNumber: true,
        comments: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        loginStartTime: true,
        loginEndTime: true,
        hireDate: true,
        birthday: true,
        employeeNumber: true,
        language: true,
        canOverridePrices: true,
        maxDiscount: true,
        commissionRate: true,
        commissionMethod: true,
        template: {
          select: {
            name: true
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const bodyData = parsed.data;
    const { 
      name, email, image, role, privileges, isActive, password, templateId, customPermissions,
      phoneNumber, comments,
      billingAddress, isDeliveryAddressDifferent, deliveryAddress, staffPermanentAddress,
      loginStartTime, loginEndTime, hireDate, birthday, employeeNumber, language,
      canOverridePrices, maxDiscount, commissionRate, commissionMethod
    } = bodyData;
    const normalizedEmployeeNumber =
      role === CUSTOMER_ROLE ? null : (employeeNumber?.trim() || null);

    const normalizedEmail = email && email.trim() !== "" ? email.trim() : null;
    const normalizedPhoneNumber = phoneNumber && phoneNumber.trim() !== "" ? phoneNumber.trim() : null;

    if (normalizedEmail) {
      const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser && existingUser.id !== id) {
        return NextResponse.json({ message: "User already exists with this email" }, { status: 409 });
      }
    }

    const isCustomer = role === CUSTOMER_ROLE;

    // Resolve privileges: merge template keys + explicit list, deduped
    const resolvedPrivileges = isCustomer
      ? (privileges ?? [])
      : await resolvePrivileges({ templateId, customPrivileges: privileges });

    const data: any = {
      name,
      email: normalizedEmail,
      image: image !== undefined ? image : undefined,
      role,
      privileges: resolvedPrivileges,
      isActive,
      templateId: templateId !== undefined ? templateId : undefined,
      customPermissions: customPermissions !== undefined ? customPermissions : undefined,
      phoneNumber: normalizedPhoneNumber,
      comments,
      loginStartTime,
      loginEndTime,
      hireDate: hireDate ? new Date(hireDate) : undefined,
      birthday: birthday ? new Date(birthday) : undefined,
      employeeNumber: normalizedEmployeeNumber,
      language,
      canOverridePrices,
      maxDiscount: maxDiscount,
      commissionRate: commissionRate,
      commissionMethod,
    };

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        privileges: true,
        isActive: true,
        templateId: true,
        customPermissions: true,
        createdAt: true,
        phoneNumber: true,
        employeeNumber: true,
        hireDate: true,
        template: {
          select: {
            name: true,
          },
        },
      },
    });

    if (role === CUSTOMER_ROLE && billingAddress) {
      const normalizedBillingAddress: AddressPayload = {
        contactName: billingAddress.contactName.trim(),
        phoneNumber: billingAddress.phoneNumber.trim(),
        addressLine1: billingAddress.addressLine1.trim(),
        addressLine2: billingAddress.addressLine2?.trim() || "",
        city: billingAddress.city.trim(),
        postalCode: billingAddress.postalCode.trim(),
      };

      const normalizedDeliveryAddress: AddressPayload =
        isDeliveryAddressDifferent && deliveryAddress
          ? {
              contactName: deliveryAddress.contactName.trim(),
              phoneNumber: deliveryAddress.phoneNumber.trim(),
              addressLine1: deliveryAddress.addressLine1.trim(),
              addressLine2: deliveryAddress.addressLine2?.trim() || "",
              city: deliveryAddress.city.trim(),
              postalCode: deliveryAddress.postalCode.trim(),
            }
          : normalizedBillingAddress;

      await Promise.all([
        upsertAddressByType({ userId: id, type: "BILLING", address: normalizedBillingAddress }),
        upsertAddressByType({ userId: id, type: "DELIVERY", address: normalizedDeliveryAddress }),
      ]);
    }

    if (role !== CUSTOMER_ROLE && staffPermanentAddress) {
      const existingStaffPermanentAddress = await db.address.findFirst({
        where: { userId: id, type: "STAFF_PERMANENT" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      const staffAddressData = {
        contactName: name,
        phoneNumber: staffPermanentAddress.phoneNumber.trim(),
        addressLine1: staffPermanentAddress.addressLine1.trim(),
        addressLine2: null,
        city: staffPermanentAddress.city.trim(),
        postalCode: staffPermanentAddress.postalCode?.trim() || "",
        isDefault: true,
      };

      if (existingStaffPermanentAddress) {
        await db.address.update({
          where: { id: existingStaffPermanentAddress.id },
          data: staffAddressData,
        });
      } else {
        await db.address.create({
          data: {
            userId: id,
            type: "STAFF_PERMANENT",
            ...staffAddressData,
          },
        });
      }
    }

    // @ts-ignore
    revalidateTag("admin-users");
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Check if the user has orders, POS shifts, or return requests
      const orderCount = await tx.order.count({ where: { userId: id } });
      const posShiftCount = await tx.posShift.count({ where: { operatorId: id } });
      const returnRequestCount = await tx.returnRequest.count({ where: { userId: id } });

      const hasHistory = orderCount > 0 || posShiftCount > 0 || returnRequestCount > 0;

      // 2. Clear related records
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.account.deleteMany({ where: { userId: id } });
      await tx.address.deleteMany({ where: { userId: id } });
      
      // Delete cart if exists
      await tx.cart.delete({ where: { userId: id } }).catch(() => {});

      if (hasHistory) {
        // Disconnect or set null on optional relations before anonymizing
        await tx.giftCard.updateMany({
          where: { purchasedByUserId: id },
          data: { purchasedByUserId: null },
        });

        await tx.orderStatusHistory.updateMany({
          where: { changedByUserId: id },
          data: { changedByUserId: null },
        });

        // Anonymize the user record to preserve financial data integrity
        await tx.user.update({
          where: { id },
          data: {
            name: "Deleted User",
            email: `deleted-user-${id}@soharpets.com`,
            emailVerified: null,
            image: null,
            password: null,
            isActive: false,
            role: "USER",
            privileges: [],
            templateId: null,
            customPermissions: Prisma.DbNull,
            phoneNumber: null,
            comments: "User deleted and anonymized due to order/shift history.",
            addressLine1: null,
            addressLine2: null,
            city: null,
            state: null,
            zipCode: null,
            country: null,
            loginStartTime: null,
            loginEndTime: null,
            hireDate: null,
            birthday: null,
            employeeNumber: null,
            canOverridePrices: false,
            maxDiscount: 0,
            commissionRate: 0,
            commissionMethod: null,
          },
        });

        return { anonymized: true };
      } else {
        // No orders/shifts exist, we can safely delete the user entirely
        await tx.giftCard.updateMany({
          where: { purchasedByUserId: id },
          data: { purchasedByUserId: null },
        });

        await tx.orderStatusHistory.updateMany({
          where: { changedByUserId: id },
          data: { changedByUserId: null },
        });

        // Delete reviews
        await tx.review.deleteMany({ where: { userId: id } });

        // Delete the user
        await tx.user.delete({
          where: { id },
        });

        return { deleted: true };
      }
    });

    // @ts-ignore
    revalidateTag("admin-users");

    if (result.anonymized) {
      return NextResponse.json({
        message: "User was anonymized to preserve order/financial history.",
        anonymized: true,
      });
    }

    return NextResponse.json({ message: "User deleted successfully", deleted: true });
  } catch (error) {
    console.error("DELETE user error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
