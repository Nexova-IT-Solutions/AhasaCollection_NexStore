import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "STOREFRONT_ADMIN", "ADMIN", "PRODUCT_MANAGER"].includes(session.user.role as string)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ahasa POS System";
    workbook.lastModifiedBy = "Ahasa POS System";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Bulk Product Template");

    worksheet.columns = [
      { header: "Product Name *", key: "name", width: 30 },
      { header: "SKU", key: "sku", width: 15 },
      { header: "Category Name *", key: "category", width: 25 },
      { header: "Selling Price (LKR) *", key: "price", width: 20 },
      { header: "Cost Price (LKR)", key: "costPrice", width: 18 },
      { header: "Stock Qty *", key: "stock", width: 15 },
      { header: "Weight (g)", key: "weightGrams", width: 15 },
      { header: "Short Description", key: "shortDescription", width: 35 },
      { header: "Full Description", key: "description", width: 45 },
      { header: "Barcode / ISBN", key: "isbn", width: 20 },
      { header: "Author", key: "author", width: 20 },
      { header: "Publisher", key: "publisher", width: 20 },
      { header: "Rack Number", key: "rackNumber", width: 15 },
      { header: "Row Location", key: "rowNumber", width: 15 },
      { header: "Bin Location", key: "binLocation", width: 15 },
      { header: "Image URL", key: "imageUrl", width: 40 },
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "A7066A" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    // Add Sample Rows
    worksheet.addRow({
      name: "Harry Potter and the Sorcerer's Stone",
      sku: "HP-001",
      category: "Books",
      price: 2500,
      costPrice: 1800,
      stock: 50,
      weightGrams: 420,
      shortDescription: "First novel in the Harry Potter series",
      description: "Harry Potter learns on his eleventh birthday that he is an orphaned son of two powerful wizards.",
      isbn: "9780590353427",
      author: "J.K. Rowling",
      publisher: "Scholastic",
      rackNumber: "RACK-01",
      rowNumber: "ROW-A",
      binLocation: "BIN-05",
      imageUrl: "https://example.com/images/hp1.jpg",
    });

    worksheet.addRow({
      name: "Gentle Giant Soft Plush Bear",
      sku: "TOY-BEAR-01",
      category: "Soft Toys",
      price: 3800,
      costPrice: 2200,
      stock: 20,
      weightGrams: 650,
      shortDescription: "Ultra soft premium plush teddy bear",
      description: "Handcrafted cuddle teddy bear with hypoallergenic velvet fur.",
      isbn: "",
      author: "",
      publisher: "",
      rackNumber: "RACK-03",
      rowNumber: "ROW-C",
      binLocation: "BIN-12",
      imageUrl: "https://example.com/images/teddy.jpg",
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="products_bulk_upload_template.xlsx"',
      },
    });
  } catch (error: any) {
    console.error("Bulk template error:", error);
    return NextResponse.json({ message: "Failed to generate Excel template" }, { status: 500 });
  }
}
