import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

export async function GET(req: NextRequest, props: RouteProps) {
  const { id } = await props.params;

  if (!(await authorize())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      db.productSupply.findMany({
        where: { supplierId: id },
        include: { product: { select: { id: true, name: true } } },
        orderBy: { suppliedAt: "desc" },
        skip,
        take: limit,
      }),
      db.productSupply.count({ where: { supplierId: id } }),
    ]);

    return NextResponse.json({ history, total, page, limit });
  } catch (error) {
    console.error("Supply history error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
