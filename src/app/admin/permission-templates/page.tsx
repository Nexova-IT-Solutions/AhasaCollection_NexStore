import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TemplatesClient } from "./templates-client";

import { hasPermission } from "@/lib/permissions";

export default async function PermissionTemplatesPage() {
  const session = await getServerSession(authOptions);

  const canAccess =
    session &&
    (["SUPER_ADMIN", "DEV_ADMIN", "ADMIN"].includes(session.user.role) ||
      hasPermission(session, "system.manage_templates"));

  if (!canAccess) {
    redirect(`/admin`);
  }

  const templates = await db.permissionTemplate.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <TemplatesClient initialTemplates={templates} />
    </div>
  );
}
