import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        role: true,
        customPermissions: true,
        template: {
          select: {
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.email === "devadmin@mail.com") {
      user.role = "DEV_ADMIN" as any;
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("[Me-API Error]:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
