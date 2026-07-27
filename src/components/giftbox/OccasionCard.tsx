"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Occasion } from "@/types";

interface OccasionCardProps {
  occasion: Occasion;
  variant?: "default" | "compact" | "wide";
}

export function OccasionCard({ occasion, variant = "default" }: OccasionCardProps) {
  if (variant === "wide") {
    return (
      <Link
        href={`/categories?occasion=${occasion.slug}`}
        className="relative overflow-hidden rounded-2xl aspect-[21/9] group"
      >
        <Image
          src={occasion.image || "/placeholder.jpg"}
          alt={occasion.name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
          style={{ 
            background: `linear-gradient(to top, ${occasion.color}CC, ${occasion.color}40, transparent)` 
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="text-2xl font-bold text-white">{occasion.name}</h3>
          {occasion.description && (
            <p className="text-white/90 mt-1">{occasion.description}</p>
          )}
          <div className="flex items-center gap-1 text-white mt-2 group-hover:translate-x-1 transition-transform">
            <span className="text-sm font-medium">Shop Gifts</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={`/categories?occasion=${occasion.slug}`}
        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-brand-border hover:border-[#A7066A] hover:shadow-md transition-all group"
      >
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${occasion.color}20` }}
        >
          <div 
            className="w-10 h-10 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url(${occasion.image})` }}
          />
        </div>
        <span className="text-sm font-medium text-[#1F1720] group-hover:text-[#A7066A] transition-colors text-center">
          {occasion.name}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/categories?occasion=${occasion.slug}`}
      className="block relative overflow-hidden rounded-2xl aspect-[4/5] group"
    >
      <Image
        src={occasion.image || "/placeholder.jpg"}
        alt={occasion.name}
        fill
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
        className="object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div 
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
        style={{ 
          background: `linear-gradient(to top, ${occasion.color || '#A7066A'}CC, transparent)` 
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-lg font-bold text-white">{occasion.name}</h3>
        {occasion.description && (
          <p className="text-sm text-white/90 mt-1 line-clamp-2">{occasion.description}</p>
        )}
      </div>
    </Link>
  );
}
