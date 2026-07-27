const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.product.findFirst({
    where: { name: { contains: 'AQUA BASIC FLAKE' } }
  });
  console.log(p);
}
main().finally(() => prisma.$disconnect());
