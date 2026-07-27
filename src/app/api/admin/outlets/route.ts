import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN", "PRODUCT_MANAGER"].includes(session.user.role as string)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const where = q
      ? {
          name: { contains: q, mode: "insensitive" as const },
        }
      : {};

    const outlets = await db.outlet.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(outlets);
  } catch (error) {
    console.error("GET_OUTLETS_ERROR:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DEV_ADMIN") {
      return NextResponse.json({ message: "Unauthorized: DEV_ADMIN only" }, { status: 403 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ message: "Outlet name is required" }, { status: 400 });
    }

    const newOutlet = await db.outlet.create({
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(newOutlet, { status: 201 });
  } catch (error: any) {
    console.error("POST_OUTLET_ERROR:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DEV_ADMIN") {
      return NextResponse.json({ message: "Unauthorized: DEV_ADMIN only" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name } = body;

    if (!id || !name || name.trim() === "") {
      return NextResponse.json({ message: "Missing id or name" }, { status: 400 });
    }

    const updated = await db.outlet.update({
      where: { id },
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH_OUTLET_ERROR:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "DEV_ADMIN") {
      return NextResponse.json({ message: "Unauthorized: DEV_ADMIN only" }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ message: "Missing outlet ID" }, { status: 400 });

    await db.outlet.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE_OUTLET_ERROR:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
