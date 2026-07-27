"use client";

import { useEffect, useState } from "react";
import { CategoryCard, SectionHeading, CategoryGridSkeleton } from "@/components/giftbox";

export function PopularCategoriesSection() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories/popular");
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch popular categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (isLoading) {
    return (
      <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto">
        <CategoryGridSkeleton />
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="py-12 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto">
      <SectionHeading
        title="Trending Categories"
        subtitle="Shop by trending categories"
        showViewAll
        viewAllLink="/categories"
      />
      <div className="grid grid-cols-2 gap-4 p-4 sm:p-0 sm:gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 justify-start">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
