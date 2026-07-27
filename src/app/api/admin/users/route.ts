import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AddressType } from "@prisma/client";
import bcrypt from "bcrypt";
import { z } from "zod";

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
  contactName: z.string().trim().min(1, "It is mandatory to enter the employee's permanent address."),
  addressLine1: z.string().trim().min(1, "It is mandatory to enter the employee's permanent address."),
  city: z.string().trim().min(1, "It is mandatory to enter the employee's permanent address."),
  phoneNumber: z
    .string()
    .trim()
    .min(1, "It is mandatory to enter the employee's permanent address.")
    .regex(TEN_DIGIT_PHONE_REGEX, PHONE_NUMBER_ERROR),
  postalCode: z.string().trim().min(1, "It is mandatory to enter the employee's permanent address."),
});

const CUSTOMER_ROLE = "USER";
const CUSTOM_ROLE = "CUSTOM_ROLE";

function hasEnabledPermission(
  permissions: Record<string, Record<string, boolean>> | null | undefined
) {
  if (!permissions) return false;

  return Object.values(permissions).some((sectionPermissions) => {
    return Object.values(sectionPermissions).some((enabled) => enabled === true);
  });
}

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

  return Array.from(
    new Set([...templatePrivileges, ...(customPrivileges ?? [])].filter(Boolean))
  );
}

const createUserSchema = z
  .object({
    name: z.string().trim().optional(),
    email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
    password: z.string().trim().min(1, "Password is required").min(6, "Password must be at least 6 characters"),
    image: z.string().url().optional().nullable(),
    role: z.string().trim().min(1, "User type is required"),
    privileges: z.array(z.string()).optional(),
    templateId: z.string().optional().nullable(),
    customPermissions: z.record(z.string(), z.record(z.string(), z.boolean())).optional().nullable(),
    phoneNumber: z.string().trim().regex(TEN_DIGIT_PHONE_REGEX, PHONE_NUMBER_ERROR),
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
    language: z.string().trim().optional(),
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

    if (isStaff) {
      if (!data.name || data.name.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["name"],
          message: "Need enter full name",
        });
      }
    }

    if (data.hireDate && new Date(data.hireDate) > new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hireDate"],
        message: "Hire date cannot be in the future",
      });
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

async function createAddressByType({
  userId,
  type,
  address,
}: {
  userId: string;
  type: "BILLING" | "DELIVERY";
  address: AddressPayload;
}) {
  await db.address.create({
    data: {
      userId,
      type: type as AddressType,
      contactName: address.contactName.trim(),
      phoneNumber: address.phoneNumber.trim(),
      addressLine1: address.addressLine1.trim(),
      addressLine2: address.addressLine2?.trim() || null,
      city: address.city.trim(),
      postalCode: address.postalCode.trim(),
      isDefault: true,
    },
  });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Number.parseInt(searchParams.get("page") || "", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "", 10);
    const hasPagination = Number.isFinite(page) && Number.isFinite(pageSize) && page > 0 && pageSize > 0;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { employeeNumber: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const take = hasPagination ? Math.min(pageSize, 100) : undefined;
    const skip = hasPagination ? (page - 1) * take! : undefined;

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          privileges: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          templateId: true,
          customPermissions: true,
          phoneNumber: true,
          employeeNumber: true,
          hireDate: true,
          template: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        ...(hasPagination ? { skip, take } : {}),
      }),
      db.user.count({ where }),
    ]);

    if (!hasPagination) {
      return NextResponse.json(users);
    }

    return NextResponse.json({
      data: users,
      total,
      page,
      pageSize: take,
      totalPages: Math.max(1, Math.ceil(total / take!)),
    });
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;
    const { 
      name, email, password, image, role, privileges, templateId, customPermissions,
      phoneNumber, comments,
      billingAddress, isDeliveryAddressDifferent, deliveryAddress, staffPermanentAddress,
      loginStartTime, loginEndTime, hireDate, birthday, employeeNumber, language,
      canOverridePrices, maxDiscount, commissionRate, commissionMethod
    } = data;

    const hasCustomTemplatePrivileges = hasEnabledPermission(customPermissions);

    const isCustomer = role === CUSTOMER_ROLE;

    if (!isCustomer && !templateId && !hasCustomTemplatePrivileges) {
      return NextResponse.json({ message: "At least one privilege is required." }, { status: 400 });
    }

    if (!isCustomer && role === CUSTOM_ROLE && (!privileges || privileges.length === 0) && !hasCustomTemplatePrivileges) {
      return NextResponse.json({ message: "At least one privilege is required." }, { status: 400 });
    }

    const normalizedEmployeeNumber =
      role === CUSTOMER_ROLE ? null : (employeeNumber?.trim() || null);

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "User already exists with this email" }, { status: 409 });
    }

    if (normalizedEmployeeNumber) {
      const existingEmployeeNumber = await db.user.findUnique({ where: { employeeNumber: normalizedEmployeeNumber } });
      if (existingEmployeeNumber) {
        return NextResponse.json({ message: "Employee number already exists" }, { status: 409 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Resolve privileges from template + explicit custom privileges, deduped
    const resolvedPrivileges = isCustomer
      ? (privileges ?? [])
      : await resolvePrivileges({ templateId, customPrivileges: privileges });

    const newUser = await db.user.create({
      data: {
        name,
        email,
        image,
        password: hashedPassword,
        role: (role || (isCustomer ? "USER" : "ADMIN")) as any,
        privileges: resolvedPrivileges,
        templateId: templateId || null,
        customPermissions: customPermissions ? (JSON.parse(JSON.stringify(customPermissions)) as any) : null,
        phoneNumber,
        comments,
        loginStartTime,
        loginEndTime,
        hireDate: hireDate ? new Date(hireDate) : null,
        birthday: birthday ? new Date(birthday) : null,
        employeeNumber: normalizedEmployeeNumber,
        language: language || "en",
        canOverridePrices: !!canOverridePrices,
        maxDiscount: maxDiscount ?? 0,
        commissionRate: commissionRate ?? 0,
        commissionMethod,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        privileges: true,
        isActive: true,
        createdAt: true,
        templateId: true,
        customPermissions: true,
        phoneNumber: true,
        employeeNumber: true,
        hireDate: true,
        template: {
          select: {
            name: true,
          },
        },
      }
    });

    if (role === CUSTOMER_ROLE && billingAddress) {
      const normalizedBillingAddress: AddressPayload = {
        contactName: billingAddress.contactName,
        phoneNumber: billingAddress.phoneNumber,
        addressLine1: billingAddress.addressLine1,
        addressLine2: billingAddress.addressLine2 || "",
        city: billingAddress.city,
        postalCode: billingAddress.postalCode,
      };

      const normalizedDeliveryAddress: AddressPayload =
        isDeliveryAddressDifferent && deliveryAddress
          ? {
              contactName: deliveryAddress.contactName,
              phoneNumber: deliveryAddress.phoneNumber,
              addressLine1: deliveryAddress.addressLine1,
              addressLine2: deliveryAddress.addressLine2 || "",
              city: deliveryAddress.city,
              postalCode: deliveryAddress.postalCode,
            }
          : normalizedBillingAddress;

      await Promise.all([
        createAddressByType({ userId: newUser.id, type: "BILLING", address: normalizedBillingAddress }),
        createAddressByType({ userId: newUser.id, type: "DELIVERY", address: normalizedDeliveryAddress }),
      ]);
    }

    if (role !== CUSTOMER_ROLE && staffPermanentAddress) {
      await db.address.create({
        data: {
          userId: newUser.id,
          type: "STAFF_PERMANENT" as AddressType,
          contactName: staffPermanentAddress.contactName.trim(),
          phoneNumber: staffPermanentAddress.phoneNumber.trim(),
          addressLine1: staffPermanentAddress.addressLine1.trim(),
          city: staffPermanentAddress.city.trim(),
          postalCode: staffPermanentAddress.postalCode.trim(),
          isDefault: true,
        },
      });
    }

    // @ts-ignore
    revalidateTag("admin-users");
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
