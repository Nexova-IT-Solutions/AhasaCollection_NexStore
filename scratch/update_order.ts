import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    orderBy: { createdAt: "desc" },
  });
  if (!order) {
    console.log("No orders found in the database.");
    return;
  }
  
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { orderType: "CUSTOM_GIFT_BOX" },
  });
  console.log("Updated order ID:", updated.id, "Number:", updated.orderNumber, "to CUSTOM_GIFT_BOX");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
