import { Occasion } from "@/types";

export const occasions: Occasion[] = [
  {
    id: "occ-birthday",
    name: "Birthday",
    slug: "birthday",
    description: "Make their special day unforgettable with the perfect birthday gift",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=300&fit=crop",
    color: "#FF6B9D",
  },
  {
    id: "occ-anniversary",
    name: "Anniversary",
    slug: "anniversary",
    description: "Celebrate years of love and togetherness",
    image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=300&fit=crop",
    color: "#E91E8C",
  },
  {
    id: "occ-love-romance",
    name: "Love & Romance",
    slug: "love-romance",
    description: "Express your love with romantic gifts",
    image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=300&fit=crop",
    color: "#FF4757",
  },
  {
    id: "occ-congratulations",
    name: "Congratulations",
    slug: "congratulations",
    description: "Celebrate achievements and milestones",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=300&fit=crop",
    color: "#FFD93D",
  },
  {
    id: "occ-thank-you",
    name: "Thank You",
    slug: "thank-you",
    description: "Show your appreciation with a thoughtful gift",
    image: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&h=300&fit=crop",
    color: "#A7066A",
  },
  {
    id: "occ-new-baby",
    name: "New Baby",
    slug: "new-baby",
    description: "Welcome the little one with love",
    image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&h=300&fit=crop",
    color: "#74B9FF",
  },
  {
    id: "occ-corporate",
    name: "Corporate",
    slug: "corporate",
    description: "Professional gifts for business relationships",
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop",
    color: "#636E72",
  },
  {
    id: "occ-seasonal",
    name: "Seasonal Specials",
    slug: "seasonal",
    description: "Special gifts for seasonal celebrations",
    image: "https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=400&h=300&fit=crop",
    color: "#FF9F43",
  },
];

export function getOccasionBySlug(slug: string): Occasion | undefined {
  return occasions.find(o => o.slug === slug);
}
