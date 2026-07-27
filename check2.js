const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const comp = await prisma.companyDetails.findUnique({
    where: { id: '1' }
  });
  console.log("Company:", comp);
}

main().finally(() => prisma.$disconnect());
