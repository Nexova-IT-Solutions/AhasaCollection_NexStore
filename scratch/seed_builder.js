const { PrismaClient } = require("@prisma/client");

// Use Direct URL for script if needed, or just standard client
const prisma = new PrismaClient();

async function seedBuilder() {
  try {
    // 1. Find some products to make available in builder
    // We'll take top 15 active products
    const products = await prisma.product.findMany({
      take: 20,
      where: {
        isActive: true
      }
    });

    console.log(`Found ${products.length} products to update...`);

    for (const product of products) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          isAvailableInBuilder: true,
          builderCapacityUnits: 1 // Default to 1 slot
        }
      });
      console.log(`Updated: ${product.name}`);
    }

    console.log("Successfully marked items for Box Builder.");
  } catch (error) {
    console.error("Error seeding builder items:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedBuilder();
