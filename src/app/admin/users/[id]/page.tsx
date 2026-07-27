import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import { Apple, Chrome, Facebook, Github, Globe, Mail, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PERMISSION_TREE_STRUCTURE } from "@/lib/permissions";
import { ProfileActions } from "./profile-actions";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function formatLongDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  try {
    return format(new Date(value), "MMMM d, yyyy");
  } catch {
    return "-";
  }
}

function profileValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function getRoleLabel(role: string) {
  return role === "USER" ? "Customer" : "Employee";
}

function getRoleBadgeVariant(role: string) {
  return role === "USER" ? "secondary" : "default";
}

function providerLabel(provider: string) {
  if (!provider) return "Unknown";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function ProviderIcon({ provider }: { provider: string }) {
  const normalized = provider.toLowerCase();

  if (normalized.includes("google")) return <Chrome className="h-4 w-4 text-[#DB4437]" />;
  if (normalized.includes("facebook")) return <Facebook className="h-4 w-4 text-[#1877F2]" />;
  if (normalized.includes("tiktok")) return <Music2 className="h-4 w-4 text-[#111827]" />;
  if (normalized.includes("github")) return <Github className="h-4 w-4 text-[#181717]" />;
  if (normalized.includes("apple")) return <Apple className="h-4 w-4 text-[#111827]" />;
  if (normalized.includes("credential") || normalized.includes("email")) return <Mail className="h-4 w-4 text-[#6B7280]" />;
  return <Globe className="h-4 w-4 text-[#6B7280]" />;
}

export default async function AdminUserProfilePage({ params }: PageProps) {
  const { locale, id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    redirect("/");
  }

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
      templateId: true,
      customPermissions: true,
      accounts: {
        select: {
          type: true,
          provider: true,
          providerAccountId: true,
        },
      },
      template: {
        select: {
          name: true,
          permissions: true,
        },
      },
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
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!user) notFound();

  const usersListHref = `/admin/users`;
  const isStandardUser = String(user.role) === "USER";
  const fullName = user.name || "Unnamed User";
  const authorizedProviders = user.accounts ?? [];
  const billingAddress = user.addresses.find((address) => address.type === "BILLING");
  const deliveryAddress = user.addresses.find((address) => address.type === "DELIVERY");
  const templatePermissions = (user.template?.permissions ?? {}) as Record<string, Record<string, boolean>>;
  const customPermissions = (user.customPermissions ?? {}) as Record<string, Record<string, boolean>>;

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 md:px-8 lg:px-10">
        <ProfileActions userId={user.id} userName={fullName} usersListHref={usersListHref} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <Card className="overflow-hidden border-brand-border">
              <div className="h-16 bg-gradient-to-r from-[#A7066A] to-[#6E2D74]" />
              <CardContent className="-mt-8 pb-6">
                <div className="mb-4 flex items-end justify-between">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={fullName}
                      className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-pink-100 text-3xl font-black text-[#A7066A] shadow">
                      {fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <Badge className={cn("rounded-full", user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <h1 className="text-2xl font-bold text-[#1F1720]">{fullName}</h1>
                <p className="mt-1 text-sm text-[#6B5A64]">{profileValue(user.email)}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Badge
                    variant={getRoleBadgeVariant(user.role)}
                    className="rounded-full text-xs uppercase tracking-wide"
                  >
                    {getRoleLabel(user.role)}
                  </Badge>
                  {!isStandardUser && user.template?.name ? (
                    <Badge className="rounded-full bg-[#FCEAF4] text-[#A7066A]">{user.template.name}</Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="border-brand-border">
              <CardHeader>
                <CardTitle>Account Meta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registered</span>
                  <span className="font-medium">{formatLongDate(user.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">{formatLongDate(user.updatedAt)}</span>
                </div>
                {!isStandardUser ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template</span>
                    <span className="font-medium">{profileValue(user.template?.name)}</span>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-brand-border">
              <CardHeader>
                <CardTitle>Social Auth</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {authorizedProviders.length > 0 ? (
                  <div className="space-y-2">
                    {authorizedProviders.map((account) => (
                      <div key={`${account.provider}-${account.providerAccountId}`} className="rounded-lg border border-brand-border bg-muted/20 px-3 py-2">
                        <div className="flex items-center gap-2 font-semibold text-[#1F1720]">
                          <ProviderIcon provider={account.provider} />
                          {providerLabel(account.provider)}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Auth Type: <span className="font-medium text-foreground">{profileValue(account.type)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground break-all">
                          Provider Account ID: <span className="font-medium text-foreground">{profileValue(account.providerAccountId)}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-muted-foreground">
                    This user has no linked OAuth providers. Uses Email/Password authentication.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <Card className="border-brand-border">
              <CardHeader>
                <CardTitle>Personal Info</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div><p className="text-muted-foreground">Full Name</p><p className="font-medium">{profileValue(user.name)}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{profileValue(user.phoneNumber)}</p></div>
                <div><p className="text-muted-foreground">Birthday</p><p className="font-medium">{formatLongDate(user.birthday)}</p></div>
                <div className="md:col-span-2"><p className="text-muted-foreground">Comments</p><p className="font-medium">{profileValue(user.comments)}</p></div>
              </CardContent>
            </Card>

            {isStandardUser ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-brand-border">
                <CardHeader>
                  <CardTitle>Billing Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {billingAddress ? (
                    <>
                      <div><p className="text-muted-foreground">Billing</p><p className="font-semibold">{profileValue(billingAddress.contactName)}</p></div>
                      <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{profileValue(billingAddress.phoneNumber)}</p></div>
                      <div><p className="text-muted-foreground">Address Line 1</p><p className="font-medium">{profileValue(billingAddress.addressLine1)}</p></div>
                      <div><p className="text-muted-foreground">Address Line 2</p><p className="font-medium">{profileValue(billingAddress.addressLine2)}</p></div>
                      <div><p className="text-muted-foreground">City</p><p className="font-medium">{profileValue(billingAddress.city)}</p></div>
                      <div><p className="text-muted-foreground">Postal Code</p><p className="font-medium">{profileValue(billingAddress.postalCode)}</p></div>
                    </>
                  ) : (
                    <p className="rounded-lg border border-dashed p-3 text-muted-foreground">No billing address available.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-brand-border">
                <CardHeader>
                  <CardTitle>Delivery Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {deliveryAddress ? (
                    <>
                      <div><p className="text-muted-foreground">Delivery</p><p className="font-semibold">{profileValue(deliveryAddress.contactName)}</p></div>
                      <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{profileValue(deliveryAddress.phoneNumber)}</p></div>
                      <div><p className="text-muted-foreground">Address Line 1</p><p className="font-medium">{profileValue(deliveryAddress.addressLine1)}</p></div>
                      <div><p className="text-muted-foreground">Address Line 2</p><p className="font-medium">{profileValue(deliveryAddress.addressLine2)}</p></div>
                      <div><p className="text-muted-foreground">City</p><p className="font-medium">{profileValue(deliveryAddress.city)}</p></div>
                      <div><p className="text-muted-foreground">Postal Code</p><p className="font-medium">{profileValue(deliveryAddress.postalCode)}</p></div>
                    </>
                  ) : (
                    <p className="rounded-lg border border-dashed p-3 text-muted-foreground">No delivery address available.</p>
                  )}
                </CardContent>
              </Card>
            </div>
            ) : null}

            {!isStandardUser ? (
              <Card className="border-brand-border">
                <CardHeader>
                  <CardTitle>Permission Inventory</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(PERMISSION_TREE_STRUCTURE).map(([sectionKey, section]) => (
                    <div key={sectionKey} className="rounded-xl border border-brand-border p-4">
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#A7066A]">{section.label}</h3>
                      <div className="space-y-2">
                        {Object.entries(section.permissions).map(([actionKey, actionLabel]) => {
                          const templateValue = templatePermissions?.[sectionKey]?.[actionKey] === true;
                          const hasCustom = customPermissions?.[sectionKey]?.[actionKey] !== undefined;
                          const customValue = customPermissions?.[sectionKey]?.[actionKey] === true;
                          const enabled = hasCustom ? customValue : templateValue;

                          return (
                            <div key={`${sectionKey}.${actionKey}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/20 px-3 py-2 text-sm">
                              <p className={cn("font-medium", enabled ? "text-foreground" : "text-muted-foreground")}>{actionLabel}</p>
                              <div className="flex items-center gap-2">
                                <Badge className={cn("rounded-full", enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600")}>
                                  {enabled ? "Allowed" : "Not Allowed"}
                                </Badge>
                                <Badge className={cn("rounded-full", hasCustom ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
                                  {hasCustom ? "Custom Override" : "Template"}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {!user.template && !user.customPermissions ? (
                    <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                      No template or custom permission settings found for this user.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
