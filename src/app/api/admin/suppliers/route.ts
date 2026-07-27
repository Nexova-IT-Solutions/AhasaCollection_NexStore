import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { supplierSchema } from "@/lib/validations/supplier";

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

export async function GET() {
  if (!(await authorize())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const suppliers = await db.supplier.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error("Supplier list error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const supplier = await db.supplier.create({
      data: {
        name: name.trim(),
        contactName: contactName?.trim() || name.trim(),
        email: email?.trim() || null,
        phoneNumber: phoneNumber?.trim() || null,
        address: address?.trim() || null,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({ success: true, supplier }, { status: 201 });
  } catch (error) {
    console.error("Supplier create error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
