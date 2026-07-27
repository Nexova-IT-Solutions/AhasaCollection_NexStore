import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncParentBoxStock } from "@/lib/gift-box-stock";
import { revalidatePath } from "next/cache";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only ADMIN or SUPER_ADMIN can update stock
    if (!session || !["ADMIN", "SUPER_ADMIN", "DEV_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await props.params;
    const body = await request.json();

    if (typeof body.stock !== "number" || body.stock < 0) {
      return NextResponse.json({ success: false, message: "Invalid stock value" }, { status: 400 });
    }

    // Update product stock directly
    const product = await db.product.update({
      where: { id },
      data: { stock: body.stock },
      select: { stock: true }
    });

    // Trigger background cross-calculation for parent boxes
    await syncParentBoxStock(id);

    // Force revalidation of homepage / product pages to immediately reflect stock
    revalidatePath("/");
    revalidatePath("/admin/products");

    return NextResponse.json({ success: true, updatedStock: product.stock }, { status: 200 });
  } catch (error) {
    console.error("[stock-update] Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
