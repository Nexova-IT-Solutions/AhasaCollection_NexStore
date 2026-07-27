import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  alignment?: "left" | "center" | "right";
  type?: "string" | "number" | "currency" | "date";
}

export interface ExportOptions<T> {
  title: string;
  filename: string;
  columns: ExcelColumn[];
  data: T[];
  includeSummaryRow?: boolean;
}

export class ExcelExportUtility {
  /**
   * Dynamically exports any given array of data objects to a highly styled Excel workbook (.xlsx)
   */
  static async exportToExcel<T>({
    title,
    filename,
    columns,
    data,
    includeSummaryRow = false,
  }: ExportOptions<T>): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("Excel export can only be run in the browser environment.");
    }

    // Safety boundary: ensure columns array is present
    if (!columns || columns.length === 0) {
      throw new Error("Export columns configuration must not be empty.");
    }

    const workbook = new ExcelJS.Workbook();
    const sheetName = title.replace(/[\\\/\?\*\[\]\:]/g, "").substring(0, 31); // Sanitize and cap length
    const worksheet = workbook.addWorksheet(sheetName || "Sheet1");

    const totalColumns = columns.length;
    const lastColLetter = String.fromCharCode(65 + totalColumns - 1);

    // 1. Merged Header Banner: Company Name and Report Title
    worksheet.mergeCells(`A1:${lastColLetter}1`);
    const bannerCell = worksheet.getCell("A1");
    bannerCell.value = `AL ZINA TRADING ESTABLISHMENT SPC — ${title.toUpperCase()}`;
    bannerCell.font = {
      name: "Segoe UI",
      size: 14,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    bannerCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF104E5B" }, // Dark Teal (#104E5B)
    };
    bannerCell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getRow(1).height = 36;

    // 2. Merged Sub-banner: Metadata (Date of export)
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
      fgColor: { argb: "FF104E5B" }, // Dark Teal (#104E5B)
    };
    metaCell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getRow(2).height = 20;

    // Add empty spacer row
    worksheet.addRow([]);
    worksheet.getRow(3).height = 12;

    // 3. Headers Row (Row 4)
    const headerRowNumber = 4;
    const headerRow = worksheet.getRow(headerRowNumber);
    headerRow.height = 24;

    columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col.header;
      cell.font = {
        name: "Segoe UI",
        size: 10,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0D3B45" }, // Slightly darker Teal for headers
      };
      cell.alignment = {
        horizontal: col.alignment || "left",
        vertical: "middle",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "medium", color: { argb: "FF104E5B" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };
    });

    // Helper function to safely fetch nested values (e.g., customer.name)
    const getNestedValue = (obj: any, path: string): any => {
      if (!obj) return "";
      const val = path.split(".").reduce((acc, part) => {
        return acc && acc[part] !== undefined ? acc[part] : "";
      }, obj);
      return val === null || val === undefined ? "" : val;
    };

    // 4. Fill Data Rows (Starting at Row 5)
    let currentRowNum = 5;

    data.forEach((rowItem, rowIdx) => {
      const dataRow = worksheet.getRow(currentRowNum);
      dataRow.height = 20;

      // Alternating row zebra striping (#E6F2F4 tint vs solid white)
      const isEven = rowIdx % 2 === 1;
      const rowBgColor = isEven ? "FFE6F2F4" : "FFFFFFFF";

      columns.forEach((col, colIdx) => {
        const cell = dataRow.getCell(colIdx + 1);
        const rawValue = getNestedValue(rowItem, col.key);

        cell.font = {
          name: "Segoe UI",
          size: 10,
        };
        cell.alignment = {
          horizontal: col.alignment || "left",
          vertical: "middle",
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowBgColor },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE0E0E0" } },
          left: { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          right: { style: "thin", color: { argb: "FFE0E0E0" } },
        };

        // Format cell dynamically by type definition
        if (col.type === "number") {
          const num = parseFloat(rawValue);
          if (!isNaN(num)) {
            cell.value = num;
            cell.numFmt = "#,##0";
          } else {
            cell.value = "";
          }
        } else if (col.type === "currency") {
          const num = parseFloat(rawValue);
          if (!isNaN(num)) {
            cell.value = num;
            cell.numFmt = "Rs. #,##0.00";
          } else {
            cell.value = "";
          }
        } else if (col.type === "date") {
          if (rawValue) {
            const date = new Date(rawValue);
            if (!isNaN(date.getTime())) {
              cell.value = date;
              cell.numFmt = "yyyy-mm-dd hh:mm";
            } else {
              cell.value = String(rawValue);
            }
          } else {
            cell.value = "";
          }
        } else {
          cell.value = String(rawValue);
        }
      });

      currentRowNum++;
    });

    // 5. Optional Summary Row
    if (includeSummaryRow && data.length > 0) {
      const summaryRow = worksheet.getRow(currentRowNum);
      summaryRow.height = 22;

      columns.forEach((col, colIdx) => {
        const cell = summaryRow.getCell(colIdx + 1);
        cell.font = {
          name: "Segoe UI",
          size: 10,
          bold: true,
        };
        cell.alignment = {
          horizontal: col.alignment || "left",
          vertical: "middle",
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD8ECEF" }, // Darker Teal summary tint
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FF104E5B" } },
          left: { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "double", color: { argb: "FF104E5B" } },
          right: { style: "thin", color: { argb: "FFE0E0E0" } },
        };

        if (colIdx === 0) {
          cell.value = "TOTALS / SUMMARY";
        } else if (col.type === "currency" || col.type === "number") {
          // Dynamic transactional sum accumulation
          const sum = data.reduce((acc, item) => {
            const val = parseFloat(getNestedValue(item, col.key));
            return acc + (isNaN(val) ? 0 : val);
          }, 0);

          cell.value = sum;
          cell.numFmt = col.type === "currency" ? "Rs. #,##0.00" : "#,##0";
        } else {
          cell.value = "";
        }
      });

      currentRowNum++;
    }

    // 6. Optimal Column Widths Auto-padding
    columns.forEach((col, colIdx) => {
      const column = worksheet.getColumn(colIdx + 1);
      let maxLen = col.header.length;

      for (let r = headerRowNumber; r < currentRowNum; r++) {
        const cellValue = worksheet.getRow(r).getCell(colIdx + 1).value;
        if (cellValue !== null && cellValue !== undefined) {
          let str = "";
          if (cellValue instanceof Date) {
            str = "2026-06-02 12:00"; // typical date length
          } else if (typeof cellValue === "number") {
            str = col.type === "currency" ? `Rs. ${cellValue.toLocaleString()}` : cellValue.toLocaleString();
          } else {
            str = String(cellValue);
          }
          if (str.length > maxLen) {
            maxLen = str.length;
          }
        }
      }

      column.width = col.width ? col.width : Math.max(maxLen + 4, 12);
    });

    // 7. Write XLSX workbook and trigger browser download
    const buffer = await workbook.xlsx.writeBuffer();
    const fileBlob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(fileBlob, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
  }
}
