import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmployeeForm } from "../employee-form";

import { hasPermission } from "@/lib/permissions";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
};

export default async function AdminUserCreatePage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const session = await getServerSession(authOptions);

  const canAccess =
    session &&
    (["SUPER_ADMIN", "DEV_ADMIN", "ADMIN"].includes(session.user.role) ||
      hasPermission(session, "system.manage_users"));

  if (!canAccess) {
    redirect("/");
  }

  const templates = await db.permissionTemplate.findMany({
    select: {
      id: true,
      name: true,
      permissions: true,
    },
    orderBy: { name: "asc" },
  });

  const normalizedTemplates = templates.map((template) => ({
    id: template.id,
    name: template.name,
    permissions: template.permissions as Record<string, Record<string, boolean>>,
  }));

  const initialUserType = query.type?.toLowerCase() === "staff" ? "STAFF" : "CUSTOMER";

  return <EmployeeForm locale={locale} mode="create" templates={normalizedTemplates} initialUserType={initialUserType} />;
}
