import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminDashboardStats } from "@/lib/queries/admin-dashboard";
import AdminDashboardClient from "@/components/admin/dashboard-client";
import { hasPermission } from "@/lib/permissions";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role === "USER") {
    redirect("/"); 
  }

  if (session.user.role === "POS_ADMIN") {
    redirect("/admin/pos");
  }

  // Fetch initial dashboard stats on the server
  const initialData = await getAdminDashboardStats();
  
  const hasSalesSummaryPermission = hasPermission(session, "reports.sales_summary");

  return (
    <AdminDashboardClient
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      initialData={initialData}
      hasSalesSummaryPermission={hasSalesSummaryPermission}
    />
  );
}
