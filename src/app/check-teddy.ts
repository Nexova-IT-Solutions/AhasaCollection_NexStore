import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: { name: { contains: "Teddy" } },
    select: { name: true, price: true, costPrice: true }
  });
  console.log("Teddy Bear Product Data:", JSON.stringify(product, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
