import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function run() {
  const order = await db.order.findUnique({
    where: { id: "cmq44zv0c00087cja9ge6eg8a" },
    include: { items: true }
  });
  console.log(JSON.stringify(order, null, 2));
}
run();
