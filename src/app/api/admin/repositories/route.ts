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

    const repositories = await db.repository.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(repositories);
  } catch (error) {
    console.error("GET_REPOSITORIES_ERROR:", error);
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
      return NextResponse.json({ message: "Repository name is required" }, { status: 400 });
    }

    const newRepository = await db.repository.create({
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(newRepository, { status: 201 });
  } catch (error: any) {
    console.error("POST_REPOSITORY_ERROR:", error);
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

    const updated = await db.repository.update({
      where: { id },
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH_REPOSITORY_ERROR:", error);
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
    if (!id) return NextResponse.json({ message: "Missing repository ID" }, { status: 400 });

    await db.repository.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE_REPOSITORY_ERROR:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
