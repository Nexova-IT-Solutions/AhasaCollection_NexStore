import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TemplatesClient } from "./templates-client";

export default async function PermissionTemplatesPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
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
