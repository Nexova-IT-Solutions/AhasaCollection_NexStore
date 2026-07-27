import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";

const discountSchema = z.object({
  name: z.string().trim().min(1, "Discount name is required"),
  description: z.string().optional().nullable(),
  value: z.coerce.number().min(0, "Discount value must be 0 or greater"),
  type: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  isActive: z.boolean().optional().default(true),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

async function authorize() {
  const session = await getServerSession(authOptions);
  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN"].includes(session.user.role as string)) {
    return false;
  }
  return true;
}

function revalidateStorefront() {
  revalidatePath("/");
}

function getDiscountModel() {
  return (db as any).discount;
}

function discountModelUnavailableResponse() {
  return NextResponse.json(
    {
      message:
        "Discount model is not available in Prisma client. Run 'npx prisma db push' and 'npx prisma generate', then restart the server.",
    },
    { status: 503 }
  );
}

export async function GET(req: Request) {
  if (!(await authorize())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const discountModel = getDiscountModel();
    if (!discountModel) {
      return discountModelUnavailableResponse();
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Number.parseInt(searchParams.get("page") || "", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "", 10);
    const hasPagination = Number.isFinite(page) && Number.isFinite(pageSize) && page > 0 && pageSize > 0;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const take = hasPagination ? Math.min(pageSize, 100) : undefined;
    const skip = hasPagination ? (page - 1) * take! : undefined;

    const [discounts, total] = await Promise.all([
      discountModel.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          value: true,
          type: true,
          isActive: true,
          startsAt: true,
          endsAt: true,
          createdAt: true,
          _count: {
            select: { products: true },
          },
        },
        ...(hasPagination ? { skip, take } : {}),
      }),
      discountModel.count({ where }),
    ]);

    if (!hasPagination) {
      return NextResponse.json(discounts);
    }

    return NextResponse.json({
      data: discounts,
      total,
      page,
      pageSize: take,
      totalPages: Math.max(1, Math.ceil(total / take!)),
    });
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await authorize())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const discountModel = getDiscountModel();
    if (!discountModel) {
      return discountModelUnavailableResponse();
    }

    const parsed = discountSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const discount = await discountModel.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        value: parsed.data.value,
        type: parsed.data.type,
        isActive: parsed.data.isActive,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    revalidateStorefront();
    revalidateTag("discounts");
    return NextResponse.json(discount, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await authorize())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const discountModel = getDiscountModel();
    if (!discountModel) {
      return discountModelUnavailableResponse();
    }

    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ message: "Discount id is required" }, { status: 400 });
    }

    const parsed = discountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const discount = await discountModel.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        value: parsed.data.value,
        type: parsed.data.type,
        isActive: parsed.data.isActive,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    revalidateStorefront();
    revalidateTag("discounts");
    return NextResponse.json(discount);
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await authorize())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const discountModel = getDiscountModel();
    if (!discountModel) {
      return discountModelUnavailableResponse();
    }

    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ message: "Discount id is required" }, { status: 400 });
    }

    const linked = await discountModel.findUnique({
      where: { id },
      select: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (linked?._count?.products > 0) {
      return NextResponse.json(
        {
          message: "Cannot delete a discount linked to active products. Please deactivate it instead.",
        },
        { status: 400 }
      );
    }

    await discountModel.delete({ where: { id } });
    revalidateStorefront();
    revalidateTag("discounts");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
