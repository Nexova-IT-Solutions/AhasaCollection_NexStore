import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const filePath = 'C:\\Users\\PC\\Downloads\\Book1.xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  let createdCount = 0;
  let skippedCount = 0;

  console.log(`Starting import for ${worksheet.rowCount - 1} rows...`);

  // Pre-fetch all categories to save queries
  const allCategories = await prisma.category.findMany();
  const catMap = new Map(allCategories.map(c => [c.name, c.id]));

  // We iterate from row 2 since row 1 is headers
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const values = row.values as any[];

    if (!values || !values.length) continue;

    const cost = Number(values[1]) || 0;
    const name = String(values[2] || '').trim();
    const categoryName = String(values[3] || '').trim();
    const quantity = Number(values[4]) || 0;
    const price = Number(values[5]) || 0;
    const barcode = String(values[6] || '').trim();

    if (!name) {
      continue;
    }

    try {
      let categoryId = null;
      if (categoryName && categoryName !== 'null') {
        if (catMap.has(categoryName)) {
          categoryId = catMap.get(categoryName);
        } else {
          const cat = await prisma.category.create({
            data: {
              name: categoryName,
              slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(7),
            }
          });
          catMap.set(categoryName, cat.id);
          categoryId = cat.id;
        }
      }

      let product = null;
      if (barcode) {
        product = await prisma.product.findUnique({
          where: { sku: barcode }
        });
      }
      
      if (!product) {
        await prisma.product.create({
          data: {
            name,
            costPrice: cost,
            price,
            stock: quantity,
            sku: barcode || null,
            categoryId,
            productImages: [],
            productVariants: [],
          }
        });
        createdCount++;
      } else {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            name,
            costPrice: cost,
            price,
            stock: product.stock + quantity,
            categoryId,
          }
        });
        skippedCount++;
      }

      if (rowNumber % 50 === 0) {
        console.log(`Processed ${rowNumber} rows...`);
      }

    } catch (e) {
      console.error(`Error importing row ${rowNumber} (${name}):`, e);
      skippedCount++;
    }
  }

  console.log(`Import complete! Created: ${createdCount}, Updated/Skipped: ${skippedCount}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
