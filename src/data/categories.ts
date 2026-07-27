import { Category, Subcategory } from "@/types";

export const subcategories: Subcategory[] = [
  // Gift Boxes subcategories
  { id: "sub-birthday-boxes", name: "Birthday Gift Boxes", slug: "birthday-boxes", categoryId: "cat-gift-boxes" },
  { id: "sub-anniversary-boxes", name: "Anniversary Gift Boxes", slug: "anniversary-boxes", categoryId: "cat-gift-boxes" },
  { id: "sub-luxury-boxes", name: "Luxury Boxes", slug: "luxury-boxes", categoryId: "cat-gift-boxes" },
  { id: "sub-romantic-boxes", name: "Romantic Gift Boxes", slug: "romantic-boxes", categoryId: "cat-gift-boxes" },
  { id: "sub-corporate-boxes", name: "Corporate Gift Boxes", slug: "corporate-boxes", categoryId: "cat-gift-boxes" },
  
  // Chocolates subcategories
  { id: "sub-chocolate-boxes", name: "Chocolate Boxes", slug: "chocolate-boxes", categoryId: "cat-chocolates" },
  { id: "sub-premium-chocolates", name: "Premium Chocolates", slug: "premium-chocolates", categoryId: "cat-chocolates" },
  { id: "sub-imported-chocolates", name: "Imported Chocolates", slug: "imported-chocolates", categoryId: "cat-chocolates" },
  
  // Flowers subcategories
  { id: "sub-flower-bouquets", name: "Flower Bouquets", slug: "flower-bouquets", categoryId: "cat-flowers" },
  { id: "sub-rose-bouquets", name: "Rose Bouquets", slug: "rose-bouquets", categoryId: "cat-flowers" },
  { id: "sub-flower-arrangements", name: "Flower Arrangements", slug: "flower-arrangements", categoryId: "cat-flowers" },
  
  // Teddy Bears subcategories
  { id: "sub-small-teddies", name: "Small Teddies", slug: "small-teddies", categoryId: "cat-teddies" },
  { id: "sub-large-teddies", name: "Large Teddies", slug: "large-teddies", categoryId: "cat-teddies" },
  { id: "sub-character-teddies", name: "Character Teddies", slug: "character-teddies", categoryId: "cat-teddies" },
  
  // Cakes subcategories
  { id: "sub-birthday-cakes", name: "Birthday Cakes", slug: "birthday-cakes", categoryId: "cat-cakes" },
  { id: "sub-celebration-cakes", name: "Celebration Cakes", slug: "celebration-cakes", categoryId: "cat-cakes" },
  { id: "sub-cupcakes", name: "Cupcakes", slug: "cupcakes", categoryId: "cat-cakes" },
  
  // Greeting Cards subcategories
  { id: "sub-birthday-cards", name: "Birthday Cards", slug: "birthday-cards", categoryId: "cat-cards" },
  { id: "sub-anniversary-cards", name: "Anniversary Cards", slug: "anniversary-cards", categoryId: "cat-cards" },
  { id: "sub-love-cards", name: "Love & Romance Cards", slug: "love-cards", categoryId: "cat-cards" },
  
  // Add-ons subcategories
  { id: "sub-balloons", name: "Balloons", slug: "balloons", categoryId: "cat-addons" },
  { id: "sub-candles", name: "Candles", slug: "candles", categoryId: "cat-addons" },
  { id: "sub-ribbons", name: "Ribbons & Bows", slug: "ribbons", categoryId: "cat-addons" },
];

export const categories: Category[] = [
  {
    id: "cat-gift-boxes",
    name: "Gift Boxes",
    slug: "gift-boxes",
    description: "Curated gift boxes for every occasion",
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop",
    subcategories: subcategories.filter(s => s.categoryId === "cat-gift-boxes"),
  },
  {
    id: "cat-chocolates",
    name: "Chocolates",
    slug: "chocolates",
    description: "Premium chocolates from around the world",
    image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&h=300&fit=crop",
    subcategories: subcategories.filter(s => s.categoryId === "cat-chocolates"),
  },
  {
    id: "cat-flowers",
    name: "Flowers",
    slug: "flowers",
    description: "Fresh flower bouquets and arrangements",
    image: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400&h=300&fit=crop",
    subcategories: subcategories.filter(s => s.categoryId === "cat-flowers"),
  },
  {
    id: "cat-teddies",
    name: "Teddy Bears",
    slug: "teddy-bears",
    description: "Adorable teddy bears for all ages",
    image: "https://images.unsplash.com/photo-1558679908-541bcf1249ff?w=400&h=300&fit=crop",
    subcategories: subcategories.filter(s => s.categoryId === "cat-teddies"),
  },
  {
    id: "cat-cakes",
    name: "Cakes",
    slug: "cakes",
    description: "Delicious cakes for celebrations",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop",
    subcategories: subcategories.filter(s => s.categoryId === "cat-cakes"),
  },
  {
    id: "cat-cards",
    name: "Greeting Cards",
    slug: "greeting-cards",
    description: "Beautiful cards for every sentiment",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop",
    subcategories: subcategories.filter(s => s.categoryId === "cat-cards"),
  },
  {
    id: "cat-addons",
    name: "Add-ons",
    slug: "addons",
    description: "Extra touches to make your gift special",
    image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&h=300&fit=crop",
    subcategories: subcategories.filter(s => s.categoryId === "cat-addons"),
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find(c => c.slug === slug);
}

export function getSubcategoryBySlug(slug: string): Subcategory | undefined {
  return subcategories.find(s => s.slug === slug);
}
