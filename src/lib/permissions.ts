import { Role } from "@prisma/client";

export type PermissionValue = boolean;

export interface PermissionSection {
  [key: string]: PermissionValue;
}

export interface PermissionTree {
  [section: string]: PermissionSection;
}

export const PERMISSION_TREE_STRUCTURE = {
  pos: {
    label: "POS Operations",
    permissions: {
      terminal_access: "Access POS Terminal & Checkout",
      shift_manage: "Open/Close POS Shifts",
      giftcard_manage: "Manage & Scan Physical Gift Cards",
      manage_orders: "Manage Orders (View & Process Orders)",
      manage_returns: "Manage Returns (View & Process Product Returns)",
    },
  },
  reports: {
    label: "Analytics & Reports",
    permissions: {
      sales_summary: "View Sales Summary & Profits",
      cash_close: "View Cash Close (EOD Variance) Reports",
      out_of_stock: "View Out of Stock Items",
      item_movement: "View Fast/Non-Moving Item Reports",
      stock_audit: "View Stock Audit Sheets",
      customer_insights: "View Customer LTV Insights",
      supplier_products: "View Supplier-wise Products",
      category_sales: "View Category Sales & Drill-down",
      accounts_receivable: "View Accounts Receivable",
      returns: "View Returned Items Report",
    },
  },
  catalog: {
    label: "Catalog & Inventory",
    permissions: {
      manage_products: "Add/Edit/Delete Products",
      manage_categories: "Manage Categories",
      manage_inventory: "Count & Adjust Inventory",
    },
  },
  customers: {
    label: "Customer Management",
    permissions: {
      manage: "Add/Edit/Search Customers",
    },
  },
  system: {
    label: "System Settings",
    permissions: {
      manage_users: "Manage Users & Operators",
      manage_templates: "Manage Permission Templates",
    },
  },
};

export type PermissionKey = keyof typeof PERMISSION_TREE_STRUCTURE;

/**
 * Reusable utility to check if a user session or user object has a required permission.
 *
 * Rules:
 * 1. SUPER_ADMIN has unconditional access to everything (returns true).
 * 2. If no requiredPermission is specified, access is granted (returns true).
 * 3. Access is determined strictly by the customPermissions block or template permissions.
 */
export function hasPermission(session: any, requiredPermission?: string): boolean {
  if (!session) return false;

  // Support passing both session object (has a user subobject) or user object directly
  const user = session.user || session;
  if (!user) return false;

  // 1. System Dev Only special flag (Overrides unconditional access)
  if (requiredPermission === "SYSTEM_DEV_ONLY") {
    return user.role === "DEV_ADMIN";
  }

  // 2. SUPER_ADMIN and DEV_ADMIN unconditional access
  if (user.role === "SUPER_ADMIN" || user.role === "DEV_ADMIN") return true;

  // 3. If no permission is required, default to true
  if (!requiredPermission) return true;

  // 3. Check customPermissions map directly (supporting flat string keys & dot notation)
  if (user.customPermissions && typeof user.customPermissions === "object") {
    // Direct flat string match (e.g. "view_sales_summary")
    if (user.customPermissions[requiredPermission] !== undefined) {
      return user.customPermissions[requiredPermission] === true;
    }

    // Nested dot notation match (e.g. "customers.add" or "pos.terminal_access")
    if (requiredPermission.includes(".")) {
      const [section, action] = requiredPermission.split(".");
      const sectionObj = user.customPermissions[section];
      if (sectionObj && typeof sectionObj === "object") {
        return (sectionObj as any)[action] === true;
      }
    }
  }

  // 4. Fallback: Check template-level permissions
  const templatePermissions = user.template?.permissions;
  if (templatePermissions && typeof templatePermissions === "object") {
    // Direct match inside template permissions
    if ((templatePermissions as any)[requiredPermission] !== undefined) {
      return (templatePermissions as any)[requiredPermission] === true;
    }

    // Dot notation inside template permissions
    if (requiredPermission.includes(".")) {
      const [section, action] = requiredPermission.split(".");
      const sectionObj = (templatePermissions as any)[section];
      if (sectionObj && typeof sectionObj === "object") {
        return (sectionObj as any)[action] === true;
      }
    }
  }

  // 5. Fallback: Check legacy privileges array
  if (user.privileges && Array.isArray(user.privileges)) {
    if (user.privileges.includes(requiredPermission)) {
      return true;
    }
  }

  return false;
}

export const DEFAULT_PERMISSIONS: PermissionTree = Object.keys(PERMISSION_TREE_STRUCTURE).reduce((acc, section) => {
  acc[section] = Object.keys((PERMISSION_TREE_STRUCTURE as any)[section].permissions).reduce((sAcc, perm) => {
    sAcc[perm] = false;
    return sAcc;
  }, {} as PermissionSection);
  return acc;
}, {} as PermissionTree);
