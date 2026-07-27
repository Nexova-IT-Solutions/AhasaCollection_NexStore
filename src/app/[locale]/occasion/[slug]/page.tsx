"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OccasionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  useEffect(() => {
    if (slug) {
      router.replace(`/categories?occasion=${slug}`);
    }
  }, [slug, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#A7066A] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#6B5A64] animate-pulse">Loading {slug?.replace(/-/g, ' ')} gifts...</p>
      </div>
    </div>
  );
}
