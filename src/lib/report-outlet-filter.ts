import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface OutletFilterResult {
  userOutletId: string | null;
  effectiveOutletId: string | null;
  isTaggedToOutlet: boolean;
  dbUserRole: string;
}

/**
 * Checks session user's outlet scope.
 * - If user is tagged to an outlet (and not SUPER_ADMIN / DEV_ADMIN / STOCK_ADMIN),
 *   their reports are strictly locked to their tagged outletId.
 * - If user is untagged or SUPER_ADMIN / DEV_ADMIN / STOCK_ADMIN,
 *   they can optionally supply an `outletId` searchParam filter ("" or "all" = all outlets).
 */
export async function getReportOutletFilter(
  req: Request
): Promise<OutletFilterResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      userOutletId: null,
      effectiveOutletId: null,
      isTaggedToOutlet: false,
      dbUserRole: "",
    };
  }

  // Fetch fresh DB user to be 100% accurate on outletId & role
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      outletId: true,
      email: true,
      customPermissions: true,
      template: {
        select: { permissions: true },
      },
    },
  });

  if (!dbUser) {
    return {
      userOutletId: null,
      effectiveOutletId: null,
      isTaggedToOutlet: false,
      dbUserRole: "",
    };
  }

  let role = dbUser.role as string;
  if (dbUser.email === "devadmin@mail.com") {
    role = "DEV_ADMIN";
  }

  const customPerms = (dbUser.customPermissions as any) || {};
  const templatePerms = (dbUser.template?.permissions as any) || {};

  const hasStockAdminPerm =
    customPerms["catalog.stock_admin"] === true ||
    templatePerms?.catalog?.stock_admin === true ||
    templatePerms?.["catalog.stock_admin"] === true;

  const isGlobalAdmin =
    role === "SUPER_ADMIN" ||
    role === "DEV_ADMIN" ||
    hasStockAdminPerm;

  const userOutletId = dbUser.outletId || null;
  const isTaggedToOutlet = !!userOutletId && !isGlobalAdmin;

  const url = new URL(req.url);
  const paramOutletId = (url.searchParams.get("outletId") || "").trim();

  let effectiveOutletId: string | null = null;

  if (isTaggedToOutlet) {
    // Locked to tagged outlet
    effectiveOutletId = userOutletId;
  } else if (paramOutletId && paramOutletId !== "all") {
    // Explicit filter selected by untagged/admin user
    effectiveOutletId = paramOutletId;
  }

  return {
    userOutletId,
    effectiveOutletId,
    isTaggedToOutlet,
    dbUserRole: role,
  };
}
