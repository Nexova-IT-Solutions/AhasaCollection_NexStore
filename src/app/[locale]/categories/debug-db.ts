import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.product.groupBy({
    by: ['categoryId'],
    _count: {
      _all: true
    }
  });
  console.log("Counts per category:", JSON.stringify(counts, null, 2));

  const totalActive = await prisma.product.count({
    where: { isActive: true }
  });
  console.log("Total Active Products:", totalActive);

  const activeWithImages = await prisma.product.count({
    where: {
      isActive: true,
      NOT: {
        productImages: {
          equals: []
        }
      }
    }
  });
  console.log("Active Products with Images:", activeWithImages);

  const activeNoImages = await prisma.product.count({
    where: {
      isActive: true,
      productImages: {
        equals: []
      }
    }
  });
  console.log("Active Products with EMPTY Images:", activeNoImages);
  
  const activeNullImages = await prisma.product.count({
    where: {
      isActive: true,
      productImages: {
        equals: Prisma.AnyNull
      }
    }
  });
  console.log("Active Products with NULL Images:", activeNullImages);
}

main().catch(console.error).finally(() => prisma.$disconnect());
