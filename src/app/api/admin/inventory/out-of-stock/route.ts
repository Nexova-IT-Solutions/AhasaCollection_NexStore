import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

async function authorize() {
  const session = await getServerSession(authOptions);
  if (!session) return false;

  const role = session.user.role as string;
  if (["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(role)) {
    return true;
  }

  return hasPermission(session, "reports.out_of_stock");
}

export async function GET() {
  if (!(await authorize())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const products = await db.product.findMany({
      where: { stock: { lte: 0 } },
      select: {
        id: true,
        name: true,
        stock: true,
        costPrice: true,
        categoryId: true,
        category: {
          select: { name: true },
        },
        supplier: {
          select: { name: true },
        },
        productImages: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ products, total: products.length });
  } catch (error) {
    console.error("Out-of-stock query error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
