import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const csvPath = 'C:\\Users\\PC\\Downloads\\New Stock.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Skip header
  const dataLines = lines.slice(1);
  
  console.log(`Found ${dataLines.length} rows to process.`);
  
  let updatedCount = 0;
  let notFoundCount = 0;

  for (const line of dataLines) {
    const parts = line.split(',');
    if (parts.length >= 2) {
      const sku = parts[0].trim();
      const qtyStr = parts[1].trim();
      const stock = Math.round(parseFloat(qtyStr));
      
      if (!sku) continue;

      try {
        const product = await prisma.product.findUnique({
          where: { sku: sku }
        });

        if (product) {
          await prisma.product.update({
            where: { id: product.id },
            data: { stock: stock }
          });
          updatedCount++;
          if (updatedCount % 50 === 0) {
            console.log(`Updated ${updatedCount} products...`);
          }
        } else {
          notFoundCount++;
        }
      } catch (err) {
        console.error(`Error updating SKU ${sku}:`, err);
      }
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Successfully updated stock for ${updatedCount} products.`);
  console.log(`Could not find ${notFoundCount} SKUs in the database.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
