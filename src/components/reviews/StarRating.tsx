import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  max?: number;
  className?: string;
  starClassName?: string;
  onRatingChange?: (rating: number) => void;
}

export function StarRating({
  rating,
  max = 5,
  className,
  starClassName,
  onRatingChange,
}: StarRatingProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {Array.from({ length: max }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= rating;

        return (
          <Star
            key={index}
            className={cn(
              "h-5 w-5 transition-colors cursor-default",
              isFilled ? "fill-yellow-400 text-yellow-400" : "text-gray-300",
              onRatingChange && "cursor-pointer hover:text-yellow-400",
              starClassName
            )}
            onClick={() => onRatingChange?.(starValue)}
          />
        );
      })}
    </div>
  );
}
