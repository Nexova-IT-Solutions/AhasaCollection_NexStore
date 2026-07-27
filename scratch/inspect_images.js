const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function inspectImages() {
  try {
    const products = await prisma.product.findMany({
      take: 5,
      where: {
        isAvailableInBuilder: true
      }
    });

    products.forEach(p => {
      console.log(`Product: ${p.name}`);
      console.log(`Images Type: ${typeof p.productImages}`);
      console.log(`Images Content: ${JSON.stringify(p.productImages)}`);
      console.log('---');
    });
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectImages();
