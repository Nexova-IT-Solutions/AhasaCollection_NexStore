const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.emailLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Email Logs:", logs);
  
  const schedule = await prisma.scheduledReport.findUnique({
    where: { reportType: 'SALES_SUMMARY' }
  });
  console.log("Schedule:", schedule);
}

main().finally(() => prisma.$disconnect());
