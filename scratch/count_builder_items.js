const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function countItems() {
  try {
    const totalCount = await prisma.product.count();
    console.log("=== TOTAL PRODUCTS IN DB ===");
    console.log("Total products in database:", totalCount);

    const activeCount = await prisma.product.count({
      where: { isActive: true }
    });
    console.log("Total active products in database:", activeCount);

  } catch (error) {
    console.error("Error counting:", error);
  } finally {
    await prisma.$disconnect();
  }
}

countItems();
