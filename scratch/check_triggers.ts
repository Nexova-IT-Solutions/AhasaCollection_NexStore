import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const triggers = await prisma.$queryRaw`
    SELECT event_object_table, trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'Product';
  `;
  console.log(JSON.stringify(triggers, null, 2));
}

main().catch(console.error);
