import { db } from "@/lib/db";
import { BannerCarousel } from "./BannerCarousel";

interface PromoBannerProps {
  bannerKey: "promo_1" | "promo_2";
}

export async function PromoBanner({ bannerKey }: PromoBannerProps) {
  try {
    const banner = await db.promoBanner.findUnique({
      where: { key: bannerKey },
    });

    // If banner doesn't exist or is inactive, render nothing
    if (!banner || !banner.isActive) {
      return null;
    }

    // Backfill images if it is empty but imageUrl exists
    const images = Array.isArray(banner.images) && banner.images.length > 0 
      ? banner.images 
      : banner.imageUrl 
        ? [banner.imageUrl] 
        : [];

    if (images.length === 0) {
      return null;
    }

    return (
      <section className="py-8 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto">
        <BannerCarousel 
          images={images} 
          slideInterval={banner.slideInterval ?? 3000} 
          bannerKey={banner.key} 
        />
      </section>
    );
  } catch (error) {
    console.error(`Error fetching promotional banner ${bannerKey}:`, error);
    return null;
  }
}
