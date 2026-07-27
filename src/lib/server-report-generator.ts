import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { db } from "@/lib/db";

export interface SalesReportData {
  summary: {
    totalSales: number;
    totalCostOfSales: number;
    totalDiscounts: number;
    netProfit: number;
    orderCount: number;
    totalUnitsSold: number;
  };
  salesByPaymentMethod: { method: string; total: number; count: number }[];
  salesBySource: {
    web: { total: number; orders: number };
    pos: { total: number; orders: number };
  };
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

export async function generateDailySalesExcel(data: SalesReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Daily Sales Summary");

  // Fetch company details for header and currency
  const company = await db.companyDetails.findUnique({ where: { id: "1" } });
  const companyName = company?.companyName?.toUpperCase() || "COMPANY NAME";
  const currency = company?.currency || "OMR";

  const lastColLetter = "C";

  // 1. Merged Header Banner
  worksheet.mergeCells(`A1:${lastColLetter}1`);
  const bannerCell = worksheet.getCell("A1");
  bannerCell.value = `${companyName} — DAILY SALES SUMMARY`;
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

  // 2. Meta Info
  const dateStr = `${format(data.dateRange.startDate, "yyyy-MM-dd")} to ${format(data.dateRange.endDate, "yyyy-MM-dd")}`;
  worksheet.mergeCells(`A2:${lastColLetter}2`);
  const metaCell = worksheet.getCell("A2");
  metaCell.value = `Generated on ${format(new Date(), "PPpp")} | Period: ${dateStr}`;
  metaCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF555555" } };
  metaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  metaCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(2).height = 20;

  worksheet.addRow([]);

  worksheet.getRow(4).values = ["Metric", "Value", "Currency"];
  worksheet.getRow(4).font = { bold: true };
  worksheet.getRow(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };

  worksheet.columns = [
    { key: "metric", width: 30 },
    { key: "value", width: 20 },
    { key: "currency", width: 15 },
  ];

  worksheet.addRow({ metric: "Total Orders", value: data.summary.orderCount, currency: "" });
  worksheet.addRow({ metric: "Total Units Sold", value: data.summary.totalUnitsSold, currency: "" });
  worksheet.addRow({ metric: "Total Sales", value: data.summary.totalSales, currency });
  worksheet.addRow({ metric: "Total Cost of Sales", value: data.summary.totalCostOfSales, currency });
  worksheet.addRow({ metric: "Total Discounts", value: data.summary.totalDiscounts, currency });
  worksheet.addRow({ metric: "Net Profit", value: data.summary.netProfit, currency });

  worksheet.addRow([]);
  worksheet.addRow({ metric: "Sales By Source", value: "", currency: "" }).font = { bold: true };
  worksheet.addRow({ metric: "Online (Web)", value: data.salesBySource.web.total, currency });
  worksheet.addRow({ metric: "In-Store (POS)", value: data.salesBySource.pos.total, currency });

  worksheet.addRow([]);
  worksheet.addRow({ metric: "Sales By Payment Method", value: "", currency: "" }).font = { bold: true };
  data.salesByPaymentMethod.forEach(pm => {
    worksheet.addRow({ metric: pm.method, value: pm.total, currency });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateDailySalesPDF(data: SalesReportData): Promise<Buffer> {
  const doc = new jsPDF();
  const dateStr = `${format(data.dateRange.startDate, "yyyy-MM-dd")} to ${format(data.dateRange.endDate, "yyyy-MM-dd")}`;

  const company = await db.companyDetails.findUnique({ where: { id: "1" } });
  const companyName = company?.companyName || "Company Name";
  const currency = company?.currency || "OMR";

  // Header background
  doc.setFillColor(16, 78, 91); // #104E5B
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(`${companyName} — Daily Sales Summary`, 14, 15);
  
  doc.setFontSize(10);
  doc.text(`Period: ${dateStr} | Generated: ${format(new Date(), "PPpp")}`, 14, 23);

  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 35,
    head: [["KPI", "Value"]],
    body: [
      ["Total Orders", data.summary.orderCount.toString()],
      ["Total Units Sold", data.summary.totalUnitsSold.toString()],
      ["Total Sales", `${currency} ${data.summary.totalSales.toFixed(3)}`],
      ["Cost of Sales", `${currency} ${data.summary.totalCostOfSales.toFixed(3)}`],
      ["Total Discounts", `${currency} ${data.summary.totalDiscounts.toFixed(3)}`],
      ["Net Profit", `${currency} ${data.summary.netProfit.toFixed(3)}`],
    ],
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [["Channel", "Orders", "Revenue"]],
    body: [
      ["Online (Web)", data.salesBySource.web.orders.toString(), `${currency} ${data.salesBySource.web.total.toFixed(3)}`],
      ["In-Store (POS)", data.salesBySource.pos.orders.toString(), `${currency} ${data.salesBySource.pos.total.toFixed(3)}`],
    ],
  });

  const paymentBody = data.salesByPaymentMethod.map(pm => [
    pm.method,
    pm.count.toString(),
    `${currency} ${pm.total.toFixed(3)}`
  ]);

  if (paymentBody.length > 0) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Payment Method", "Count", "Total"]],
      body: paymentBody,
    });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
