"use client";

import { useEffect, useState } from "react";
import { OccasionCard, SectionHeading, OccasionGridSkeleton } from "@/components/giftbox";

export function PopularOccasionsSection() {
  const [occasions, setOccasions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOccasions = async () => {
      try {
        const response = await fetch("/api/occasions/popular");
        const data = await response.json();
        setOccasions(data);
      } catch (error) {
        console.error("Failed to fetch popular occasions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOccasions();
  }, []);

  if (isLoading) {
    return (
      <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto">
        <OccasionGridSkeleton />
      </section>
    );
  }

  if (occasions.length === 0) return null;

  return (
    <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto">
      <SectionHeading
        title="Trending Occasions"
        subtitle="Gifts for every trending occasion"
      />
      <div className="grid grid-cols-2 gap-4 p-4 sm:p-0 sm:gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 justify-start">
        {occasions.map((occasion) => (
          <OccasionCard key={occasion.id} occasion={occasion} />
        ))}
      </div>
    </section>
  );
}
