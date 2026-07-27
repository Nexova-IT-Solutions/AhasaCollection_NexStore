"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { addressSchema, AddressFormValues } from "@/lib/validations/address";

export async function addAddress(data: AddressFormValues, locale = "en") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const validatedFields = addressSchema.safeParse(data);
  if (!validatedFields.success) {
    throw new Error("Invalid address data");
  }

  const userId = session.user.id;

  const address = await db.$transaction(async (tx) => {
    // Check if it's the user's first address of this type
    const addressCount = await tx.address.count({
      where: {
        userId,
        type: data.type,
      },
    });

    // If first address, set as default
    const isDefault = addressCount === 0 ? true : data.isDefault;

    // If setting as default, unset others of the same type
    if (isDefault) {
      await tx.address.updateMany({
        where: {
          userId,
          type: data.type,
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

  revalidatePath(`/${locale}/profile/addresses`);
  revalidatePath(`/${locale}/profile/billing`);
  return address;
}

export async function updateAddress(id: string, data: AddressFormValues, locale = "en") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const validatedFields = addressSchema.safeParse(data);
  if (!validatedFields.success) {
    throw new Error("Invalid address data");
  }

  const userId = session.user.id;

  const address = await db.$transaction(async (tx) => {
    // If setting as default, unset others of the same type
    if (data.isDefault) {
      await tx.address.updateMany({
        where: {
          userId,
          type: data.type,
          isDefault: true,
          NOT: { id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    return tx.address.update({
      where: { id, userId },
      data,
    });
  });

  revalidatePath(`/${locale}/profile/addresses`);
  revalidatePath(`/${locale}/profile/billing`);
  return address;
}

export async function deleteAddress(id: string, locale = "en", force = false) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  const addressToDelete = await db.address.findUnique({
    where: { id, userId },
  });

  if (!addressToDelete) {
    throw new Error("Address not found");
  }

  const remainingCount = await db.address.count({
    where: {
      userId,
      type: addressToDelete.type,
    },
  });

  if (remainingCount === 1 && !force) {
    return {
      success: true,
      isLast: true,
      message: "This is your last saved address.",
    };
  }

  await db.$transaction(async (tx) => {
    await tx.address.delete({
      where: { id, userId },
    });

    // If the deleted address was default, set another as default if one exists
    if (addressToDelete.isDefault) {
      const nextAddress = await tx.address.findFirst({
        where: {
          userId,
          type: addressToDelete.type,
        },
        orderBy: { createdAt: "asc" },
      });

      if (nextAddress) {
        await tx.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }
  });

  revalidatePath(`/${locale}/profile/addresses`);
  revalidatePath(`/${locale}/profile/billing`);

  return {
    success: true,
    isLast: false,
    message: "Address deleted successfully.",
  };
}

export async function setDefaultAddress(id: string, type: "BILLING" | "DELIVERY", locale = "en") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  const address = await db.$transaction(async (tx) => {
    // Unset previous default of the same type
    await tx.address.updateMany({
      where: {
        userId,
        type,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set new default
    return tx.address.update({
      where: { id, userId },
      data: { isDefault: true },
    });
  });

  revalidatePath(`/${locale}/profile/addresses`);
  revalidatePath(`/${locale}/profile/billing`);
  return address;
}
