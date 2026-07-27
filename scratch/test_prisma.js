const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function test() {
  try {
    const products = await prisma.product.findMany({
      where: {
        isAvailableInBuilder: true
      },
      take: 1
    });
    console.log("Success! Products found:", products.length);
  } catch (e) {
    console.error("Test failed:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
