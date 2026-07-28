import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generatePurchaseOrderPdf(po: any): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const currencySymbol = "LKR";

  // Brand Header
  doc.setFillColor(167, 6, 106); // #A7066A
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("AHASA COLLECTION", 14, 16);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("PURCHASE REQUEST / ORDER", 14, 23);

  // Status Badge
  const statusText = (po.status || "PENDING").replace(/_/g, " ");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(150, 10, 46, 10, 2, 2, "F");
  doc.setTextColor(167, 6, 106);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, 173, 16.5, { align: "center" });

  let y = 38;

  // Metadata Grid Box
  doc.setLineWidth(0.3);
  doc.setDrawColor(230, 230, 230);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(14, y, 182, 38, 2, 2, "FD");

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);

  // Left Column Metadata
  doc.setFont("helvetica", "bold");
  doc.text("PO Request No:", 18, y + 8);
  doc.setFont("helvetica", "normal");
  doc.text(po.poNumber || "N/A", 50, y + 8);

  doc.setFont("helvetica", "bold");
  doc.text("Request Date:", 18, y + 16);
  doc.setFont("helvetica", "normal");
  doc.text(po.requestDate ? new Date(po.requestDate).toLocaleDateString("en-GB") : "N/A", 50, y + 16);

  doc.setFont("helvetica", "bold");
  doc.text("Requested By:", 18, y + 24);
  doc.setFont("helvetica", "normal");
  doc.text(po.requestedByName || "N/A", 50, y + 24);

  doc.setFont("helvetica", "bold");
  doc.text("Branch / Outlet:", 18, y + 32);
  doc.setFont("helvetica", "normal");
  doc.text(po.outletName || "Main Warehouse", 50, y + 32);

  // Right Column Metadata
  doc.setFont("helvetica", "bold");
  doc.text("Request Type:", 110, y + 8);
  doc.setFont("helvetica", "normal");
  doc.text(po.requestType || "RESTOCK", 145, y + 8);

  doc.setFont("helvetica", "bold");
  doc.text("Priority:", 110, y + 16);
  doc.setFont("helvetica", "normal");
  doc.text(po.priority || "NORMAL", 145, y + 16);

  doc.setFont("helvetica", "bold");
  doc.text("Expected Delivery:", 110, y + 24);
  doc.setFont("helvetica", "normal");
  doc.text(po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString("en-GB") : "Not specified", 145, y + 24);

  doc.setFont("helvetica", "bold");
  doc.text("Payment Status:", 110, y + 32);
  doc.setFont("helvetica", "normal");
  doc.text(po.paymentStatus || "UNPAID", 145, y + 32);

  y += 45;

  // Supplier Information Section
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(167, 6, 106);
  doc.text("SUPPLIER INFORMATION", 14, y);
  y += 5;

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "bold");
  doc.text("Supplier Name:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(po.supplier?.name || "N/A", 45, y);

  doc.setFont("helvetica", "bold");
  doc.text("Contact Person:", 110, y);
  doc.setFont("helvetica", "normal");
  doc.text(po.supplier?.contactName || "N/A", 145, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Phone Number:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(po.supplier?.phoneNumber || "N/A", 45, y);

  doc.setFont("helvetica", "bold");
  doc.text("Email:", 110, y);
  doc.setFont("helvetica", "normal");
  doc.text(po.supplier?.email || "N/A", 145, y);
  y += 10;

  // Items Section Table
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(167, 6, 106);
  doc.text("PURCHASE ITEMS LIST", 14, y);
  y += 3;

  const tableRows = (po.items || []).map((item: any, idx: number) => [
    idx + 1,
    item.itemName,
    item.sku || "—",
    item.requestedQty,
    item.unit || "Pcs",
    `${currencySymbol} ${(Number(item.estimatedUnitCost) || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    `${currencySymbol} ${((Number(item.requestedQty) || 0) * (Number(item.estimatedUnitCost) || 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    item.reason || "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Item Description", "SKU", "Qty", "Unit", "Est. Cost", "Total Est.", "Reason"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [167, 6, 106],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [40, 40, 40],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 45 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 15, halign: "center" },
      5: { cellWidth: 25, halign: "right" },
      6: { cellWidth: 25, halign: "right" },
      7: { cellWidth: 22 },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Summary Totals Box
  const totalCost = Number(po.totalEstimatedCost || 0);

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(120, finalY, 76, 20, 2, 2, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Total Estimated Cost:", 125, finalY + 12);
  doc.setTextColor(167, 6, 106);
  doc.text(`${currencySymbol} ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 190, finalY + 12, { align: "right" });

  let notesY = finalY + 28;

  if (po.remarks) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("Remarks / Notes:", 14, notesY);
    doc.setFont("helvetica", "normal");
    doc.text(po.remarks, 14, notesY + 5);
    notesY += 15;
  }

  // Signature / Approval Block
  doc.setLineWidth(0.2);
  doc.setDrawColor(200, 200, 200);

  doc.line(14, notesY + 25, 74, notesY + 25);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Requested By (Signature)", 14, notesY + 30);
  doc.text(po.requestedByName || "", 14, notesY + 35);

  doc.line(130, notesY + 25, 190, notesY + 25);
  doc.text("Stock Admin Approval (Signature)", 130, notesY + 30);
  doc.text(po.approvedByName ? `Approved by: ${po.approvedByName}` : "Pending Approval", 130, notesY + 35);

  // Return PDF Node Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
