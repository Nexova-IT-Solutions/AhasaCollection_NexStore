import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const minPrice = parseFloat(searchParams.get("minPrice") || "0");
    const maxPrice = parseFloat(searchParams.get("maxPrice") || "999999");
    const occasions = searchParams.get("occasions")?.split(",").filter(Boolean) || [];

    const where: any = {
      isAvailableInBuilder: true,
      isActive: true,
      price: {
        gte: minPrice,
        lte: maxPrice,
      },
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    };

    // If occasions are provided, we need to filter by them
    // This assumes a many-to-many relationship or JSON field for occasions
    if (occasions.length > 0) {
      where.occasions = {
        some: {
          name: {
            in: occasions
          }
        }
      };
    }

    const products = await db.product.findMany({
      where,
      include: {
        category: true,
        occasions: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format for the specified Product interface
    const formattedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: (p.productImages as any[])?.[0]?.url || (p.productImages as any[])?.[0] || "",
      builderCapacityUnits: p.builderCapacityUnits || 1,
      occasions: p.occasions.map((o: any) => o.name),
      isActive: p.isActive,
    }));

    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    console.error("[BOX_BUILDER_PRODUCTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
