import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmployeeForm } from "../../employee-form";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function toDateInput(value: Date | null) {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function AdminUserEditPage({ params }: PageProps) {
  const { locale, id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    redirect("/");
  }

  const [user, templates] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        privileges: true,
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
            id: true,
            name: true,
            permissions: true,
          },
        },
        addresses: {
          where: {
            type: {
              in: ["BILLING", "DELIVERY", "STAFF_PERMANENT"],
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
          orderBy: { updatedAt: "desc" },
        },
        accounts: {
          select: {
            type: true,
            provider: true,
            providerAccountId: true,
          },
        },
      },
    }),
    db.permissionTemplate.findMany({
      select: {
        id: true,
        name: true,
        permissions: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!user) notFound();

  const billingAddress = user.addresses.find((address) => address.type === "BILLING");
  const deliveryAddress = user.addresses.find((address) => address.type === "DELIVERY");
  const staffPermanentAddress = user.addresses.find((address) => address.type === "STAFF_PERMANENT");

  const hasDifferentDeliveryAddress = Boolean(
    deliveryAddress &&
      (
        deliveryAddress.contactName !== (billingAddress?.contactName ?? "") ||
        deliveryAddress.phoneNumber !== (billingAddress?.phoneNumber ?? "") ||
        deliveryAddress.addressLine1 !== (billingAddress?.addressLine1 ?? "") ||
        (deliveryAddress.addressLine2 ?? "") !== (billingAddress?.addressLine2 ?? "") ||
        deliveryAddress.city !== (billingAddress?.city ?? "") ||
        deliveryAddress.postalCode !== (billingAddress?.postalCode ?? "")
      )
  );

  const sanitizePhone = (value: string | null | undefined) => {
    if (!value) return "";
    return value.replace(/\D/g, "").slice(0, 10);
  };

  const normalizedUser = {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
    image: user.image ?? "",
    role: user.role,
    phoneNumber: sanitizePhone(user.phoneNumber),
    comments: user.comments ?? "",
    billingContactName: billingAddress?.contactName ?? user.name ?? "",
    billingPhoneNumber: sanitizePhone(billingAddress?.phoneNumber ?? user.phoneNumber),
    billingAddressLine1: billingAddress?.addressLine1 ?? "",
    billingAddressLine2: billingAddress?.addressLine2 ?? "",
    billingCity: billingAddress?.city ?? "",
    billingPostalCode: billingAddress?.postalCode ?? "",
    deliveryContactName: deliveryAddress?.contactName ?? "",
    deliveryPhoneNumber: sanitizePhone(deliveryAddress?.phoneNumber),
    deliveryAddressLine1: deliveryAddress?.addressLine1 ?? "",
    deliveryAddressLine2: deliveryAddress?.addressLine2 ?? "",
    deliveryCity: deliveryAddress?.city ?? "",
    deliveryPostalCode: deliveryAddress?.postalCode ?? "",
    isDeliveryAddressDifferent: hasDifferentDeliveryAddress,
    staffPermanentAddressLine1: staffPermanentAddress?.addressLine1 ?? "",
    staffPermanentCity: staffPermanentAddress?.city ?? "",
    staffPermanentPhoneNumber: sanitizePhone(staffPermanentAddress?.phoneNumber),
    staffPermanentPostalCode: staffPermanentAddress?.postalCode ?? "",
    birthday: toDateInput(user.birthday),
    hireDate: toDateInput(user.hireDate),
    employeeNumber: user.employeeNumber ?? "",
    language: user.language ?? "en",
    loginStartTime: user.loginStartTime ?? "",
    loginEndTime: user.loginEndTime ?? "",
    canOverridePrices: user.canOverridePrices,
    maxDiscount: user.maxDiscount,
    commissionRate: user.commissionRate,
    commissionMethod: user.commissionMethod ?? "",
    templateId: user.templateId ?? "",
    customPermissions:
      (user.customPermissions as Record<string, Record<string, boolean>> | null) ??
      ((user.template?.permissions as Record<string, Record<string, boolean>> | undefined)
        ? JSON.parse(JSON.stringify(user.template?.permissions))
        : null),
    privileges: user.privileges ?? [],
    addresses: user.addresses,
    accounts: user.accounts,
    template: user.template,
  };

  const normalizedTemplates = templates.map((template) => ({
    id: template.id,
    name: template.name,
    permissions: template.permissions as Record<string, Record<string, boolean>>,
  }));

  return <EmployeeForm locale={locale} mode="edit" user={normalizedUser} templates={normalizedTemplates} />;
}
