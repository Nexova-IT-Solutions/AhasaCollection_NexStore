import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";

export const getUsersForAdmin = unstable_cache(
  async () => {
    return db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        privileges: true,
        isActive: true,
        createdAt: true,
        templateId: true,
        template: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
  ["admin-users"],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ["admin-users"],
  }
);

export const getPermissionTemplatesForAdmin = unstable_cache(
  async () => {
    return db.permissionTemplate.findMany({
      select: {
        id: true,
        name: true,
        permissions: true,
      },
      orderBy: { name: "asc" },
    });
  },
  ["admin-permission-templates"],
  {
    revalidate: 3600, // Templates change less frequently, cache for 1 hour
    tags: ["admin-permission-templates"],
  }
);
