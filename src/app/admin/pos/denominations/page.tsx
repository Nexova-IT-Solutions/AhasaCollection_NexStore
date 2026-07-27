import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DenominationsClient } from "./denominations-client";
import { hasPermission } from "@/lib/permissions";
import { getCurrencyServer } from "@/lib/currency";

export default async function DenominationsPage() {
  const session = await getServerSession(authOptions);

  if (!hasPermission(session, "pos.shift_manage")) {
    redirect("/admin");
  }

  const denominations = await db.denomination.findMany({
    orderBy: {
      value: "desc",
    },
  });

  const currency = await getCurrencyServer();

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1000px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[#1F1720] tracking-tight">POS Cash Denominations</h1>
          <p className="text-[#6B5A64] mt-1">Configure active banknotes and coins used for daily drawer baselines and EOD cash counts.</p>
        </div>

        <DenominationsClient initialData={denominations} currency={currency} />
      </div>
    </div>
  );
}
