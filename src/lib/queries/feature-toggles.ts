import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function isFeatureEnabled(key: string): Promise<boolean> {
  try {
    const toggle = await db.featureToggle.findUnique({
      where: { key },
    });
    return toggle ? toggle.isActive : true;
  } catch (error) {
    console.error(`Failed to fetch feature toggle for ${key}:`, error);
    return true; // Default to true on error/missing to ensure availability
  }
}

export async function getFeatureToggles(): Promise<Record<string, boolean>> {
  try {
    const toggles = await db.featureToggle.findMany();
    return toggles.reduce((acc, toggle) => {
      acc[toggle.key] = toggle.isActive;
      return acc;
    }, {} as Record<string, boolean>);
  } catch (error) {
    console.error("Failed to fetch feature toggles:", error);
    return {};
  }
}

export async function getInitialFeatureToggles(): Promise<Record<string, boolean>> {
  try {
    const cookieStore = await cookies();
    const storefrontWebsiteEnabled = cookieStore.get("storefront_website_enabled")?.value;
    const giftboxesAvailable = cookieStore.get("giftboxes_available")?.value;
    const storefrontGiftcards = cookieStore.get("storefront_giftcards")?.value;
    
    if (storefrontWebsiteEnabled !== undefined && giftboxesAvailable !== undefined && storefrontGiftcards !== undefined) {
      return {
        storefront_website_enabled: storefrontWebsiteEnabled !== "false",
        giftboxes_available: giftboxesAvailable !== "false",
        storefront_giftcards: storefrontGiftcards !== "false",
      };
    }
  } catch (err) {
    // cookies() might fail if not in dynamic context
  }
  
  return getFeatureToggles();
}
