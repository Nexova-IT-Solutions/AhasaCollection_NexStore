const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');

const prisma = new PrismaClient();

async function importFirst5() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('C:\\Users\\PC\\Downloads\\Book1.xlsx');
    
    const worksheet = workbook.worksheets[0];
    const productsToInsert = [];
    
    worksheet.eachRow({ includeEmpty: false }, function(row, rowNumber) {
      // Row 1 is header, Rows 2-6 are the first 5 data rows
      if (rowNumber > 1 && rowNumber <= 6) {
        const cost = row.values[1];
        const name = row.values[2];
        const categoryName = row.values[3];
        const stock = row.values[4];
        const price = row.values[5];
        const barcode = row.values[6];

        productsToInsert.push({
          costPrice: parseFloat(cost) || 0,
          name: name ? name.toString().trim() : 'Unknown Product',
          shortDescription: name ? name.toString().trim() : 'Unknown Product',
          categoryName: categoryName ? categoryName.toString().trim() : null,
          stock: parseInt(stock, 10) || 0,
          price: parseFloat(price) || 0,
          sku: barcode ? barcode.toString().trim() : null,
        });
      }
    });

    for (const p of productsToInsert) {
      let categoryId = null;
      if (p.categoryName) {
        const cat = await prisma.category.findFirst({
          where: { name: { equals: p.categoryName, mode: 'insensitive' } }
        });
        if (cat) {
          categoryId = cat.id;
        }
      }

      await prisma.product.create({
        data: {
          name: p.name,
          shortDescription: p.shortDescription,
          costPrice: p.costPrice,
          price: p.price,
          stock: p.stock,
          sku: p.sku,
          categoryId: categoryId,
          productImages: [],
          productVariants: [],
          isActive: true
        }
      });
      console.log(`Inserted product: ${p.name}`);
    }
    
    console.log("Successfully inserted the first 5 products!");
  } catch (err) {
    console.error("Error during import:", err);
  } finally {
    await prisma.$disconnect();
  }
}

importFirst5();
