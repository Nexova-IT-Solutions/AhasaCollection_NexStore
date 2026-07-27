import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFeatureToggles } from "@/lib/queries/feature-toggles";
import FeatureTogglesClient from "./feature-toggles-client";

export default async function FeatureTogglesPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "DEV_ADMIN") {
    redirect("/admin");
  }

  const initialToggles = await getFeatureToggles();

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 lg:px-10">
        <FeatureTogglesClient initialToggles={initialToggles} />
      </div>
    </div>
  );
}
