import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const template = await db.permissionTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { users: true },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ message: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, permissions } = body;

    const template = await db.permissionTemplate.update({
      where: { id },
      data: {
        name,
        permissions,
      },
    });

    revalidateTag("admin-permission-templates");
    return NextResponse.json(template);
  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    // Check if any users are using this template
    const userCount = await db.user.count({
      where: { templateId: id }
    });

    if (userCount > 0) {
      return NextResponse.json({ message: "Cannot delete template that is assigned to users" }, { status: 400 });
    }

    await db.permissionTemplate.delete({
      where: { id },
    });

    revalidateTag("admin-permission-templates");
    return NextResponse.json({ message: "Template deleted" });
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
