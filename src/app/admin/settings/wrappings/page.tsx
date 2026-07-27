import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

import { WrappingsClient } from "./wrappings-client";

export default async function AdminGiftWrappingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    redirect("/");
  }

  const wrappings = await db.giftWrap.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="w-full bg-[#FAFAFA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10">
        <WrappingsClient initialWrappings={wrappings} />
      </div>
    </div>
  );
}
