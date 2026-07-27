import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { supplierSchema } from "@/lib/validations/supplier";

type RouteProps = {
  params: Promise<{ id: string }>;
};

async function authorize() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN"].includes(session.user.role as string)
  ) {
    return false;
  }
  return true;
}
export async function GET(_req: Request, props: RouteProps) {
  const { id } = await props.params;

  if (!(await authorize())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            stock: true,
            costPrice: true,
            lastSuppliedAt: true,
            productImages: true,
          },
        },
        supplyHistory: {
          include: { product: { select: { id: true, name: true } } },
          orderBy: { suppliedAt: "desc" },
          take: 50,
        },
        _count: { select: { products: true } },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { message: "Supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error("Supplier detail error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: RouteProps) {
  const { id } = await props.params;

  if (!(await authorize())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = supplierSchema.safeParse(body);

    if (!result.success) {
      const error = result.error.issues?.[0]?.message || result.error.errors?.[0]?.message || "Invalid input data";
      return NextResponse.json({ message: error }, { status: 400 });
    }

    const { name, contactName, email, phoneNumber, address } = result.data;

    const supplier = await db.supplier.update({
      where: { id },
      data: {
        name,
        contactName: contactName || name,
        email,
        phoneNumber,
        address,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError?.code === "P2025") {
      return NextResponse.json(
        { message: "Supplier not found" },
        { status: 404 }
      );
    }
    console.error("Supplier update error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, props: RouteProps) {
  const { id } = await props.params;

  if (!(await authorize())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    // Check for linked products
    const linkedCount = await db.product.count({
      where: { supplierId: id },
    });

    if (linkedCount > 0) {
      return NextResponse.json(
        {
          message:
            "Cannot delete supplier with linked products. Reassign products first.",
        },
        { status: 400 }
      );
    }

    await db.supplier.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError?.code === "P2025") {
      return NextResponse.json(
        { message: "Supplier not found" },
        { status: 404 }
      );
    }
    console.error("Supplier delete error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
