import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import { hasPermission } from "@/lib/permissions";
import { getUsersForAdmin, getPermissionTemplatesForAdmin } from "@/lib/queries/admin-users";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  const canAccess =
    session &&
    (["SUPER_ADMIN", "DEV_ADMIN", "ADMIN"].includes(session.user.role) ||
      hasPermission(session, "system.manage_users"));

  if (!canAccess) {
    redirect("/"); // unauthorized
  }

  const [users, templates] = await Promise.all([
    getUsersForAdmin(),
    getPermissionTemplatesForAdmin(),
  ]);

  return (
    <div className="w-full bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10">
        <UsersClient initialUsers={users} templates={templates} />
      </div>
    </div>
  );
}
