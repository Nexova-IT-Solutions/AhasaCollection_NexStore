const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const code = "GIFT-TEST-123";
  const giftCard = await prisma.giftCard.upsert({
    where: { code },
    update: {
      balance: 0.0,
      initialValue: 0.0,
      isActive: false,
      isPhysical: true,
      status: "AVAILABLE",
      expiresAt: new Date("2030-12-31T23:59:59Z"),
      purchasedInOrderId: null,
    },
    create: {
      code,
      barcode: code,
      balance: 0.0,
      initialValue: 0.0,
      isActive: false,
      isPhysical: true,
      status: "AVAILABLE",
      expiresAt: new Date("2030-12-31T23:59:59Z"),
      purchasedInOrderId: null,
    }
  });
  console.log("TEST GIFTCARD IN DB:", JSON.stringify(giftCard, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
