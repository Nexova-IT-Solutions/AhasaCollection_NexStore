import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const items = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'OrderItem'`;
    console.log(items);
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
