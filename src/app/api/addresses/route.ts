import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addressSchema, CITY_NAME_REGEX } from "@/lib/validations/address";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const city = typeof body.city === "string" ? body.city.trim() : "";

  if (!CITY_NAME_REGEX.test(city)) {
    return NextResponse.json(
      { message: "City name should only contain letters." },
      { status: 400 }
    );
  }

  const validatedFields = addressSchema.safeParse({
    ...body,
    city,
  });

  if (!validatedFields.success) {
    return NextResponse.json(
      {
        message: "Invalid address data",
        errors: validatedFields.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  const data = validatedFields.data;

  const address = await db.$transaction(async (tx) => {
    const addressCount = await tx.address.count({
      where: {
        userId,
      },
    });

    const isDefault = addressCount === 0 ? true : data.isDefault;

    if (isDefault) {
      await tx.address.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return tx.address.create({
      data: {
        ...data,
        userId,
        isDefault,
      },
    });
  });

  return NextResponse.json(address, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const addresses = await db.address.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      isDefault: "desc",
    },
  });

  return NextResponse.json(addresses);
}
