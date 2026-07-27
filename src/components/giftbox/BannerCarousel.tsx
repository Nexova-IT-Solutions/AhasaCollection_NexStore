"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

interface BannerCarouselProps {
  images: string[];
  slideInterval: number;
  bannerKey: string;
}

export function BannerCarousel({ images, slideInterval, bannerKey }: BannerCarouselProps) {
  const autoplayRef = useRef(
    Autoplay({ delay: slideInterval, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplayRef.current]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  if (images.length === 0) return null;

  // Single image — no carousel overhead
  if (images.length === 1) {
    return (
      <div className="relative overflow-hidden rounded-3xl h-48 md:h-64 lg:h-72">
        <Image src={images[0]} alt={bannerKey} fill className="object-cover" priority={false} />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl h-48 md:h-64 lg:h-72 group">
      <div ref={emblaRef} className="overflow-hidden h-full">
        <div className="flex h-full">
          {images.map((src, i) => (
            <div key={i} className="relative flex-[0_0_100%] h-full">
              <Image src={src} alt={`${bannerKey} slide ${i + 1}`} fill className="object-cover" priority={i === 0} />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === selectedIndex
                ? "w-6 h-2.5 bg-white shadow-md"
                : "w-2.5 h-2.5 bg-white/55 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
