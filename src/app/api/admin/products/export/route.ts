import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import * as ExcelJS from "exceljs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN", "ADMIN", "STOREFRONT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  // The request says owner and manager. SUPER_ADMIN is owner, ADMIN is manager.
  // We'll restrict this to SUPER_ADMIN, DEV_ADMIN, and ADMIN roles.
  if (!["SUPER_ADMIN", "DEV_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const products = await db.product.findMany({
      select: {
        name: true,
        sku: true,
        stock: true,
        price: true,
        productVariants: true,
        supplier: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Inventory Backup");

    const lastColLetter = "E";

    // 1. Merged Header Banner
    worksheet.mergeCells(`A1:${lastColLetter}1`);
    const bannerCell = worksheet.getCell("A1");
    bannerCell.value = `AL ZINA TRADING ESTABLISHMENT SPC — INVENTORY BACKUP`;
    bannerCell.font = {
      name: "Segoe UI",
      size: 14,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    bannerCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF104E5B" },
    };
    bannerCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 36;

    // 2. Merged Sub-banner
    worksheet.mergeCells(`A2:${lastColLetter}2`);
    const metaCell = worksheet.getCell("A2");
    metaCell.value = `Generated on: ${new Date().toLocaleString("en-LK", { timeZone: "Asia/Colombo" })} | Confidential Admin Report`;
    metaCell.font = {
      name: "Segoe UI",
      size: 9,
      italic: true,
      color: { argb: "FFD0E5E8" },
    };
    metaCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF104E5B" },
    };
    metaCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(2).height = 20;

    // Spacer row
    worksheet.addRow([]);
    worksheet.getRow(3).height = 12;

    // 3. Headers Row (Row 4)
    const headerRow = worksheet.getRow(4);
    headerRow.height = 24;

    const columnConfig = [
      { header: "Product Name", width: 40 },
      { header: "SKU", width: 20 },
      { header: "Stock", width: 40 },
      { header: "Supplier", width: 30 },
      { header: "Base Price (OMR)", width: 18 },
    ];

    columnConfig.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col.header;
      worksheet.getColumn(index + 1).width = col.width;

      cell.font = { name: "Segoe UI", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF183B46" } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF4F828F" } },
        bottom: { style: "thin", color: { argb: "FF4F828F" } },
        left: { style: "thin", color: { argb: "FF4F828F" } },
        right: { style: "thin", color: { argb: "FF4F828F" } },
      };
    });

    let currentRowNumber = 5;

    products.forEach((p, index) => {
      let stockDisplay = p.stock?.toString() || "0";

      if (Array.isArray(p.productVariants) && p.productVariants.length > 0) {
        const variantStrings = p.productVariants
          .map((v: any) => {
            if (!v || typeof v !== "object") return null;
            const combination = [v.color, v.size].filter(Boolean).join("-");
            if (combination) {
              return `${combination}-${v.stock || 0}`;
            }
            return null;
          })
          .filter(Boolean);

        if (variantStrings.length > 0) {
          stockDisplay = variantStrings.join(" / ");
        }
      }

      const row = worksheet.getRow(currentRowNumber);
      row.getCell(1).value = p.name;
      row.getCell(2).value = p.sku || "N/A";
      row.getCell(3).value = stockDisplay;
      row.getCell(4).value = p.supplier?.name || "N/A";
      row.getCell(5).value = p.price;

      // Stripe effect and border
      const isEven = index % 2 === 0;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (colNumber <= 5) {
          cell.font = { name: "Segoe UI", size: 10 };
          cell.alignment = { vertical: "middle" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FBFC" },
          };
          cell.border = {
            bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        }
      });
      row.height = 20;
      currentRowNumber++;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="inventory-backup.xlsx"',
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
