"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Category } from "@/types";

interface CategoryCardProps {
  category: Category;
  variant?: "default" | "compact" | "wide";
}

export function CategoryCard({ category, variant = "default" }: CategoryCardProps) {
  if (variant === "wide") {
    return (
      <Link
        href={`/categories?categories=${category.id}`}
        className="relative overflow-hidden rounded-2xl aspect-[21/9] group"
      >
        <Image
          src={category.image || "/placeholder.jpg"}
          alt={category.name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="text-2xl font-bold text-white">{category.name}</h3>
          {category.description && (
            <p className="text-white/80 mt-1">{category.description}</p>
          )}
          <div className="flex items-center gap-1 text-[#FFD93D] mt-2 group-hover:translate-x-1 transition-transform">
            <span className="text-sm font-medium">Shop Now</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={`/categories?categories=${category.id}`}
        className="flex items-center gap-3 p-3 rounded-xl bg-white border border-brand-border hover:border-[#A7066A] hover:shadow-md transition-all group"
      >
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#FCEAF4] flex-shrink-0">
          <Image
            src={category.image || "/placeholder.jpg"}
            alt={category.name}
            fill
            sizes="48px"
            className="object-cover"
          />
        </div>
        <span className="font-medium text-[#1F1720] group-hover:text-[#A7066A] transition-colors">
          {category.name}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/categories?categories=${category.id}`}
      className="block relative overflow-hidden rounded-2xl aspect-square group"
    >
      <Image
        src={category.image || "/placeholder.jpg"}
        alt={category.name}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
        className="object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-lg font-bold text-white line-clamp-1">{category.name}</h3>
        <p className="text-sm text-white/80 mt-0.5 line-clamp-2 min-h-[2.5rem]">
          {category.description || "Explore this collection"}
        </p>
      </div>
    </Link>
  );
}
