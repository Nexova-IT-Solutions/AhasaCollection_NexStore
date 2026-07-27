import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  showViewAll?: boolean;
  viewAllLink?: string;
  viewAllText?: string;
}

export function SectionHeading({
  title,
  subtitle,
  showViewAll,
  viewAllLink,
  viewAllText = "View All",
}: SectionHeadingProps) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#1F1720]">{title}</h2>
        {subtitle && <p className="mt-1 text-[#6B5A64]">{subtitle}</p>}
      </div>
      {showViewAll && viewAllLink && (
        <Link
          href={viewAllLink}
          className="flex items-center gap-1 text-[#A7066A] hover:text-[#8B0557] font-medium transition-colors"
        >
          <span>{viewAllText}</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
