import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import qz from "qz-tray";
import { amiriBase64 } from "./fonts/Amiri-Regular";
import { notoBase64 } from "./fonts/NotoSansSinhala-Regular";
import html2canvas from "html2canvas";
import { initQZSecurity, connectQZ } from "./qz-init";

const arNum = (n: number | string) => {
  return String(n);
};

// ─── Windows-1256 Arabic encoder ────────────────────────────────────────────
// Maps Unicode codepoints → Windows-1256 byte values for Arabic characters.
// This lets us pre-encode strings entirely in JavaScript so QZ Tray / Java
// never has to perform charset conversion (which fails silently on some setups).
const WIN1256_MAP: Record<number, number> = {
  0x20AC:0x80, 0x067E:0x81, 0x201A:0x82, 0x0192:0x83, 0x201E:0x84,
  0x2026:0x85, 0x2020:0x86, 0x2021:0x87, 0x02C6:0x88, 0x2030:0x89,
  0x0698:0x8A, 0x2039:0x8B, 0x0152:0x8C, 0x0686:0x8D, 0x0688:0x8F,
  0x06AF:0x90, 0x2018:0x91, 0x2019:0x92, 0x201C:0x93, 0x201D:0x94,
  0x2022:0x95, 0x2013:0x96, 0x2014:0x97, 0x02DC:0x98, 0x2122:0x99,
  0x200C:0x9A, 0x203A:0x9B, 0x0153:0x9C, 0x200D:0x9D, 0x200E:0x9E, 0x200F:0x9F,
  // Arabic punctuation
  0x060C:0xA1, 0x061F:0xBF,
  // Arabic letters U+0621–U+063A
  0x0621:0xC1, 0x0622:0xC2, 0x0623:0xC3, 0x0624:0xC4, 0x0625:0xC5,
  0x0626:0xC6, 0x0627:0xC7, 0x0628:0xC8, 0x0629:0xC9, 0x062A:0xCA,
  0x062B:0xCB, 0x062C:0xCC, 0x062D:0xCD, 0x062E:0xCE, 0x062F:0xCF,
  0x0630:0xD0, 0x0631:0xD1, 0x0632:0xD2, 0x0633:0xD3, 0x0634:0xD4,
  0x0635:0xD5, 0x0636:0xD6, 0x0637:0xD7, 0x0638:0xD8, 0x0639:0xD9,
  0x063A:0xDA,
  // Arabic letters U+0641–U+0652
  0x0641:0xE1, 0x0642:0xE2, 0x0643:0xE3, 0x0644:0xE4, 0x0645:0xE5,
  0x0646:0xE6, 0x0647:0xE7, 0x0648:0xE8, 0x0649:0xE9, 0x064A:0xEA,
  0x064B:0xEB, 0x064C:0xEC, 0x064D:0xED, 0x064E:0xEE, 0x064F:0xEF,
  0x0650:0xF0, 0x0651:0xF1, 0x0652:0xF2,
};

/**
 * Converts a JS Unicode string to a Windows-1256 hex byte string.
 * ASCII chars (< 0x80) pass through directly.
 * Arabic/special chars are looked up in WIN1256_MAP.
 * Unknown chars are replaced with a space (0x20).
 * ESC/POS control bytes (e.g. \x1B) are kept as-is.
 */
function toW1256Hex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      hex += code.toString(16).padStart(2, '0');
    } else if (WIN1256_MAP[code] !== undefined) {
      hex += WIN1256_MAP[code].toString(16).padStart(2, '0');
    } else {
      hex += '20'; // replace unknown with space
    }
  }
  return hex;
}

export interface ReceiptData {
  orderNumber: string;
  total: number;
  subtotal: number;
  billDiscountAmount?: number;
  changeDue: number;
  paymentMethod: string;
  date: string;
  trackingNumber?: string | null;
  customerName?: string | null;
  paidAmount?: number;
  outstandingAmount?: number;
  currencySymbol?: string;
  decimals?: number;
  items: {
    name: string;
    nameAr?: string | null;
    sku?: string;
    quantity: number;
    price: number;
    discountPercent?: number;
  }[];
  companyDetails?: {
    companyName?: string | null;
    mobileNumber?: string | null;
    address?: string | null;
    website?: string | null;
    email?: string | null;
    crNumber?: string | null;
    posPrinterName?: string | null;
    posPrintMode?: string | null;
  } | null;
}

// Helper to fetch and resize logo to prevent massive printing
async function getResizedLogoBase64(imageUrl: string, targetWidth: number): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const origBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    return await new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = targetWidth / img.width;
        const targetHeight = img.height * scale;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(origBase64); return; }
        
        // Fill white background for transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        // Auto-crop top/bottom white space
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        let minY = canvas.height, maxY = 0;
        
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            const isNonWhite = a > 20 && (r < 250 || g < 250 || b < 250);
            if (isNonWhite) {
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        
        if (minY < maxY) {
          const cropH = maxY - minY + 1;
          const croppedCanvas = document.createElement('canvas');
          croppedCanvas.width = canvas.width;
          croppedCanvas.height = cropH;
          const croppedCtx = croppedCanvas.getContext('2d');
          if (croppedCtx) {
            croppedCtx.drawImage(canvas, 0, minY, canvas.width, cropH, 0, 0, canvas.width, cropH);
            resolve(croppedCanvas.toDataURL('image/png'));
            return;
          }
        }
        
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(origBase64);
      img.src = origBase64;
    });
  } catch (error) {
    console.error("Error loading logo:", error);
    return null;
  }
}

function canvasToEscposHex(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // ESC * (Select bit-image mode)
  // m = 33 (24-dot double density)
  // n1 = width & 0xFF
  // n2 = (width >> 8) & 0xFF
  const n1 = width & 0xFF;
  const n2 = (width >> 8) & 0xFF;

  const n1Hex = n1.toString(16).padStart(2, '0');
  const n2Hex = n2.toString(16).padStart(2, '0');

  let hex = '';

  // Set line spacing to 24 dots (ESC 3 24) -> 1B 33 18
  hex += '1B3318';

  // Process image in 24-dot vertical slices
  for (let y = 0; y < height; y += 24) {
    // Send ESC * command: 1B 2A 21 n1 n2
    hex += '1B2A21' + n1Hex + n2Hex;

    for (let x = 0; x < width; x++) {
      // 24 dots = 3 bytes per column x
      for (let k = 0; k < 3; k++) {
        let byteValue = 0;
        for (let b = 0; b < 8; b++) {
          const targetY = y + k * 8 + b;
          if (targetY < height) {
            const i = (targetY * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const bVal = data[i + 2];
            const a = data[i + 3];
            const luminance = 0.299 * r + 0.587 * g + 0.114 * bVal;
            const isBlack = (a > 50 && luminance < 200);
            if (isBlack) {
              byteValue |= (1 << (7 - b));
            }
          }
        }
        hex += byteValue.toString(16).padStart(2, '0');
      }
    }
    // Line feed after each 24-dot row
    hex += '0A';
  }

  // Restore default line spacing (ESC 2) -> 1B 32
  hex += '1B32';

  return hex.toUpperCase();
}

function getQZPrinterConfig(printerName: string): string | { host: string; port: number } {
  if (printerName.startsWith("tcp://")) {
    const parts = printerName.replace("tcp://", "").split(":");
    return { host: parts[0], port: parts.length > 1 ? parseInt(parts[1], 10) : 9100 };
  }
  return printerName;
}

// Global print queue to prevent "Connection refused" on TCP printers
let printQueue = Promise.resolve();

export async function generateReceiptPdf(data: ReceiptData, format: "print" | "download") {
  const logoBase64 = data.companyDetails?.logoBase64 || await getResizedLogoBase64("/logo/logo.png", 200);

  let saleType = "Cash Sale";
  if (data.paymentMethod === "COURIER_COD" || data.paymentMethod === "COURIER_OTHER") {
    saleType = "Courier Sale";
  } else if (data.paymentMethod === "POS_CREDIT") {
    saleType = "Credit Sale";
  }

  const curSymbol = (data.currencySymbol || "LKR").trim();
  const decimals = typeof data.decimals === "number" ? data.decimals : 2;

  if (format === "print") {
    const mode = data.companyDetails?.posPrintMode || "raw";
    const isRaster = mode.startsWith("raster");
    const isEnglish = mode.endsWith("_english");

    if (isRaster) {
      // 80mm THERMAL PRINTER RASTER FORMAT (html2canvas to PNG)


      let itemsHtml = "";
      data.items.forEach(item => {
        let cleanName = item.name.replace(/\|?\s*#[a-fA-F0-9]{3,6}/g, '').trim();
        let itemName = cleanName;
        if (item.nameAr) {
          const cleanAr = item.nameAr.replace(/\|?\s*#[a-fA-F0-9]{3,6}/g, '').trim();
          itemName += ` - ${cleanAr}`;
        }
        
        let qtyPrice = `Qty: ${item.quantity} x ${curSymbol} ${item.price.toFixed(decimals)}`;
          
        if (item.discountPercent && item.discountPercent > 0) {
          qtyPrice += ` (Disc ${item.discountPercent}%)`;
        }
        
        const total = `${curSymbol} ${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(decimals)}`;
        
        itemsHtml += `
          <div style="margin-bottom: 6px;">
            <div>${itemName}</div>
            ${item.sku ? `<div style="font-size: 14px; color: #333;">SKU: ${item.sku}</div>` : ''}
            <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 17.5px;">
              <div style="flex: 1;">${qtyPrice}</div>
              <div style="font-weight: bold; text-align: right; white-space: nowrap;">${total}</div>
            </div>
          </div>
        `;
      });

      const container = document.createElement("div");
      Object.assign(container.style, {
        position: "fixed",
        left: "-9999px",
        top: "0",
        width: "576px", // Full 80mm printable width (576 dots)
        backgroundColor: "white",
        color: "#000000",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        fontSize: "18.5px",
        fontWeight: "600",
        lineHeight: "1.4",
        padding: "0"
      });

      const originalLogo = logoBase64 ? logoBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") : null;
      const logoHtml = originalLogo ? `<div style="margin-top: 0px; margin-bottom: 6px; width: 100%; display: flex; justify-content: center;"><img src="data:image/png;base64,${originalLogo}" style="max-height: 100px; max-width: 156px; object-fit: contain; margin-top: 0;" /></div>` : '';

      container.innerHTML = `
        ${logoHtml}
        <div style="text-align: center; font-size: 25px; font-weight: bold; margin-bottom: 6px;">${data.companyDetails?.companyName || "Ahasa Collection"}</div>
        <div style="text-align: center; font-size: 17.5px; margin-bottom: 8px;">
          ${data.companyDetails?.address ? `<div>${data.companyDetails.address}</div>` : ''}
          ${data.companyDetails?.mobileNumber ? `<div>Tel: ${data.companyDetails.mobileNumber}</div>` : ''}
          ${data.companyDetails?.email ? `<div>${data.companyDetails.email}</div>` : ''}
          ${data.companyDetails?.website ? `<div>${data.companyDetails.website}</div>` : ''}
          ${data.companyDetails?.crNumber ? `<div>CR: ${data.companyDetails.crNumber}</div>` : ''}
        </div>
        <div style="border-bottom: 2px dashed #000; margin: 10px 0; clear: both;"></div>
        <div style="font-size: 18.5px; margin-bottom: 8px;">
          <div>Order: ${data.orderNumber}</div>
          <div>Date: ${data.date}</div>
          <div>Payment: ${data.paymentMethod.replace("POS_", "")}</div>
          ${data.trackingNumber ? `<div>Tracking ID: ${data.trackingNumber}</div>` : ""}
          ${data.customerName ? `<div>Customer: ${data.customerName}</div>` : ""}
          ${data.paymentMethod === "POS_CREDIT" ? `
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dotted #000;">
              <div>Paid Amount: ${curSymbol} ${(data.paidAmount ?? 0).toFixed(decimals)}</div>
              <div>Outstanding Amount: ${curSymbol} ${(data.outstandingAmount ?? data.total).toFixed(decimals)}</div>
            </div>
          ` : ""}
        </div>
        <div style="border-bottom: 2px dashed #000; margin: 10px 0; clear: both;"></div>
        <div style="margin-bottom: 8px;">
          ${itemsHtml}
        </div>
        <div style="border-bottom: 2px dashed #000; margin: 10px 0; clear: both;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 16px; margin-bottom: 4px; font-size: 18.5px;">
          <span>Subtotal:</span>
          <span style="font-weight: bold;">${curSymbol} ${data.subtotal.toFixed(decimals)}</span>
        </div>
        ${data.billDiscountAmount && data.billDiscountAmount > 0 ? `
          <div style="display: flex; justify-content: flex-end; gap: 16px; margin-bottom: 4px; font-size: 18.5px;">
            <span>Discount:</span>
            <span style="font-weight: bold;">-${curSymbol} ${data.billDiscountAmount.toFixed(decimals)}</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: flex-end; gap: 16px; margin-bottom: 4px; font-size: 23px; font-weight: bold;">
          <span>Total:</span>
          <span>${curSymbol} ${data.total.toFixed(decimals)}</span>
        </div>
        ${data.changeDue > 0 ? `
          <div style="display: flex; justify-content: flex-end; gap: 16px; margin-bottom: 4px; font-size: 18.5px;">
            <span>Change Due:</span>
            <span style="font-weight: bold;">${curSymbol} ${data.changeDue.toFixed(decimals)}</span>
          </div>
        ` : ''}
        <div style="text-align: center; margin-top: 16px; margin-bottom: 6px; font-size: 18.5px;">Thank you for your purchase!</div>
        <div style="text-align: center; margin-top: 6px; font-size: 15px; color: #000; padding-bottom: 10px;">Powered by Nexova</div>
      `;

      document.body.appendChild(container);

      if (data.companyDetails?.posPrinterName) {
        try {
          await connectQZ();
          await new Promise(r => setTimeout(r, 50));
          const canvas = await html2canvas(container, {
            scale: 1,
            useCORS: true,
            logging: false
          });
          const hexImage = canvasToEscposHex(canvas);
          const qzTarget = getQZPrinterConfig(data.companyDetails.posPrinterName);
          const config = qz.configs.create(qzTarget, { margins: 0 });
          
          // Enqueue the print job with a 500ms delay to allow the printer TCP socket to close safely
          printQueue = printQueue.then(async () => {
            await qz.print(config, [
              {
                type: 'raw',
                format: 'command',
                flavor: 'hex',
                data: '1B40' + '1B6101' + hexImage + '1D564100'
              }
            ]);
            await new Promise(resolve => setTimeout(resolve, 500));
          }).catch(e => {
            console.error("QZ image print failed in queue", e);
          });
          
          await printQueue;

        } catch (e) {
          console.error("QZ image print failed", e);
        } finally {
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
        }
      } else {
        document.body.removeChild(container);
      }
      return;
    } else {
      // THERMAL PRINTER RAW TEXT FORMAT
      const companyName = data.companyDetails?.companyName || "STORE RECEIPT";
      const charWidth = data.companyDetails?.receiptCharWidth || 42;
      const logoWidth = data.companyDetails?.receiptLogoWidth || 200;
      const logoHeight = data.companyDetails?.receiptLogoHeight || 80;
      
      const rawLines: any[] = [];

      rawLines.push(
        '\x1B\x40', // Init printer
        '\x1B\x4D\x01', // Select Font B (Small condensed font ~40% smaller)
      );

      if (!isEnglish) {
        rawLines.push('\x1B\x74\x21'); // Select character code table 33 (WPC1256 for Arabic)
      }

      rawLines.push(
        '\x1B\x61\x01', // Center align
      );
      
      // Logo will be sent as a real raster image via ESC/POS hex (built later, before qz.print)

      rawLines.push(
        '\x1B\x61\x01', // Ensure center align again just in case
        '\x1B\x45\x01', // Bold on
        `${companyName}\n`,
        '\x1B\x45\x00', // Bold off
      );

      if (data.companyDetails?.address) rawLines.push(`${data.companyDetails.address}\n`);
      if (data.companyDetails?.mobileNumber) rawLines.push(`Tel: ${data.companyDetails.mobileNumber}\n`);
      if (data.companyDetails?.email) rawLines.push(`${data.companyDetails.email}\n`);
      if (data.companyDetails?.website) rawLines.push(`${data.companyDetails.website}\n`);
      if (data.companyDetails?.crNumber) rawLines.push(`CR: ${data.companyDetails.crNumber}\n`);
      
      const SEP = '-'.repeat(charWidth);

      // Switch to left align before first separator so it spans full width
      rawLines.push(
        '\x1B\x61\x00', // Left align
        `${SEP}\n`,
        `Order: ${data.orderNumber}\n`,
        `Date: ${data.date}\n`,
        `Payment: ${data.paymentMethod.replace("POS_", "")}\n`,
        data.trackingNumber ? `Tracking ID: ${data.trackingNumber}\n` : "",
        data.customerName ? `Customer: ${data.customerName}\n` : "",
        data.paymentMethod === "POS_CREDIT"
          ? `Paid Amount: ${curSymbol} ${(data.paidAmount ?? 0).toFixed(decimals)}\nOutstanding Amount: ${curSymbol} ${(data.outstandingAmount ?? data.total).toFixed(decimals)}\n`
          : "",
        `${SEP}\n`
      );
      
      // Items — qty left aligned, price exact right aligned by padding to charWidth
      data.items.forEach((item, index) => {
        let nameLine = item.name.replace(/\|?\s*#[a-fA-F0-9]{3,6}/g, '').trim();
        if (!isEnglish && item.nameAr) {
          const cleanAr = item.nameAr.replace(/\|?\s*#[a-fA-F0-9]{3,6}/g, '').trim();
          nameLine += ` - ${cleanAr}`;
        }

        // Name line (left aligned)
        rawLines.push('\x1B\x61\x00'); // Left align
        rawLines.push(`${nameLine}\n`);
        if (item.sku) rawLines.push(`SKU: ${item.sku}\n`);

        // Qty & Price Line padded to right edge
        const qtyPrice = isEnglish
          ? `Qty: ${item.quantity} x ${curSymbol} ${item.price.toFixed(decimals)}`
          : `Qty / ප්‍රමාණය: ${item.quantity} x ${curSymbol} ${item.price.toFixed(decimals)}`;
        
        const lineTotal = item.quantity * item.price * (1 - (item.discountPercent || 0) / 100);
        const formattedTotal = `${curSymbol} ${lineTotal.toFixed(decimals)}`;

        // Calculate exact whitespace padding for right alignment on thermal printer text mode
        let itemQtyPriceLine = "";
        if (qtyPrice.length + formattedTotal.length + 1 <= charWidth) {
          const spaces = " ".repeat(charWidth - qtyPrice.length - formattedTotal.length);
          itemQtyPriceLine = `${qtyPrice}${spaces}${formattedTotal}\n`;
        } else {
          const spaces = " ".repeat(Math.max(0, charWidth - formattedTotal.length));
          itemQtyPriceLine = `${qtyPrice}\n${spaces}${formattedTotal}\n`;
        }

        rawLines.push(itemQtyPriceLine);

        // Discount line if applicable (left aligned)
        if (item.discountPercent && item.discountPercent > 0) {
          const discLine = isEnglish
            ? `Discount: ${item.discountPercent}% off`
            : `Discount / වට්ටම්: ${item.discountPercent}%`;
          rawLines.push(`${discLine}\n`);
        }
      });

      // Separator then right-aligned totals
      rawLines.push(
        '\x1B\x61\x00', // Left align for separator
        `${SEP}\n`,
        '\x1B\x61\x02', // Right align for totals
        isEnglish ? `Subtotal: ${curSymbol} ${data.subtotal.toFixed(decimals)}\n` : `Subtotal / උප එකතුව: ${curSymbol} ${data.subtotal.toFixed(decimals)}\n`,
        data.billDiscountAmount && data.billDiscountAmount > 0
          ? (isEnglish ? `Discount: -${curSymbol} ${data.billDiscountAmount.toFixed(decimals)}\n` : `Discount / වට්ටම්: -${curSymbol} ${data.billDiscountAmount.toFixed(decimals)}\n`)
          : '',
        isEnglish ? `Total: ${curSymbol} ${data.total.toFixed(decimals)}\n` : `Total / මුළු මුදල: ${curSymbol} ${data.total.toFixed(decimals)}\n`
      );
      
      if (data.changeDue > 0) {
        rawLines.push(isEnglish ? `Change Due: ${curSymbol} ${data.changeDue.toFixed(decimals)}\n` : `Change Due / ඉතිරි මුදල: ${curSymbol} ${data.changeDue.toFixed(decimals)}\n`);
      }
      
      rawLines.push(
        '\x1B\x61\x01', // Center align
        isEnglish ? '\nThank you for your purchase!\n' : '\nThank you for your purchase!\n',
        'Powered by Nexova\n',
        '\n\n', // Compact 2x line feed (was 6x)
        '\x1D\x56\x41\x10' // Full cut
      );

      if (data.companyDetails?.posPrinterName) {
        try {
          await connectQZ();

          console.log("[QZ] Creating printer config for:", data.companyDetails.posPrinterName);
          const qzTarget = getQZPrinterConfig(data.companyDetails.posPrinterName);
          const config = qz.configs.create(qzTarget, { encoding: 'windows-1256' });
          console.log("[QZ] Config created. Queuing print job...");

          if (!isEnglish) {
            // ── Arabic mode: build entire receipt as pre-encoded Windows-1256 hex ──
            // This completely bypasses Java's charset conversion in QZ Tray,
            // which is the root cause of silent Arabic print failures.
            console.log("[QZ] Building Arabic hex payload...");
            const hexLines: string[] = [
              '1B40',       // ESC @ — Init printer
              '1B7401',     // ESC t 1 — Set code page to PC437 (safe default; we send pre-encoded bytes anyway)
              '1B6101',     // ESC a 1 — Center align
            ];
            const arabicSep = '-'.repeat(Math.max(28, charWidth - 10));

            // Logo: convert to real raster ESC/POS hex bytes
            if (logoBase64) {
              try {
                const logoCanvas = await new Promise<HTMLCanvasElement | null>((resolve) => {
                  const img = new Image();
                  img.onload = () => {
                    const c = document.createElement('canvas');
                    const maxW = logoWidth;
                    const maxH = logoHeight;
                    const scale = Math.min(1, maxW / img.width, maxH / img.height);
                    c.width = Math.floor((img.width * scale) / 8) * 8;
                    c.height = Math.floor(img.height * scale);
                    const ctx = c.getContext('2d');
                    if (!ctx) { resolve(null); return; }
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, c.width, c.height);
                    ctx.drawImage(img, 0, 0, c.width, c.height);
                    resolve(c);
                  };
                  img.onerror = () => resolve(null);
                  img.src = logoBase64;
                });
                if (logoCanvas) {
                  hexLines.push('1B6101'); // Center align before logo
                  hexLines.push(canvasToEscposHex(logoCanvas));
                }
              } catch (logoErr) {
                console.warn('[QZ] Arabic logo conversion failed, skipping:', logoErr);
              }
            }
            // Company name (bold)
            hexLines.push('1B4501'); // Bold on
            hexLines.push(toW1256Hex(companyName + '\n'));
            hexLines.push('1B4500'); // Bold off
            if (data.companyDetails?.address)      hexLines.push(toW1256Hex(data.companyDetails.address + '\n'));
            if (data.companyDetails?.mobileNumber) hexLines.push(toW1256Hex('Tel: ' + data.companyDetails.mobileNumber + '\n'));
            if (data.companyDetails?.email)        hexLines.push(toW1256Hex(data.companyDetails.email + '\n'));
            if (data.companyDetails?.website)      hexLines.push(toW1256Hex(data.companyDetails.website + '\n'));
            if (data.companyDetails?.crNumber)     hexLines.push(toW1256Hex('CR: ' + data.companyDetails.crNumber + '\n'));
            // Separator + order info
            hexLines.push(toW1256Hex(arabicSep + '\n'));
            hexLines.push('1B6100'); // Left align
            hexLines.push(toW1256Hex(`Order / ${String.fromCharCode(0x0637,0x0644,0x0628)}: ${data.orderNumber}\n`));
            hexLines.push(toW1256Hex(`Date / ${String.fromCharCode(0x062A,0x0627,0x0631,0x064A,0x062E)}: ${data.date}\n`));
            hexLines.push(toW1256Hex(`Payment / ${String.fromCharCode(0x062F,0x0641,0x0639)}: ${data.paymentMethod.replace('POS_', '')}\n`));
            hexLines.push(toW1256Hex(arabicSep + '\n'));
            // Items
            data.items.forEach(item => {
              const nameLine = item.nameAr ? `${item.name} - ${item.nameAr}` : item.name;
              hexLines.push(toW1256Hex(nameLine + '\n'));
              if (item.sku) hexLines.push(toW1256Hex(`SKU: ${item.sku}\n`));
              const qtyLabel = `Qty/${String.fromCharCode(0x0627,0x0644,0x0643,0x0645,0x064A,0x0629)}: ${item.quantity} x ${curSymbol} ${item.price.toFixed(decimals)}`;
              const lineTotal = `${curSymbol} ${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(decimals)}`;
              hexLines.push(toW1256Hex(qtyLabel + '  ' + lineTotal + '\n'));
            });
            // Totals (right-align)
            hexLines.push(toW1256Hex(arabicSep + '\n'));
            hexLines.push('1B6102'); // Right align
            const subtotalLabel = `Subtotal / ${String.fromCharCode(0x0645,0x062C,0x0645,0x0648,0x0639,0x20,0x0641,0x0631,0x0639,0x064A)}`;
            hexLines.push(toW1256Hex(`${subtotalLabel}: ${curSymbol} ${data.subtotal.toFixed(decimals)}\n`));
            if (data.billDiscountAmount && data.billDiscountAmount > 0) {
              const discLabel = `Discount / ${String.fromCharCode(0x062E,0x0635,0x0645)}`;
              hexLines.push(toW1256Hex(`${discLabel}: -${curSymbol} ${data.billDiscountAmount.toFixed(decimals)}\n`));
            }
            const totalLabel = `Total / ${String.fromCharCode(0x0645,0x062C,0x0645,0x0648,0x0639)}`;
            hexLines.push(toW1256Hex(`${totalLabel}: ${curSymbol} ${data.total.toFixed(decimals)}\n`));
            if (data.changeDue > 0) {
              const changeLabel = `Change / ${String.fromCharCode(0x0628,0x0627,0x0642,0x064A)}`;
              hexLines.push(toW1256Hex(`${changeLabel}: ${curSymbol} ${data.changeDue.toFixed(decimals)}\n`));
            }
            // Footer
            hexLines.push('1B6101'); // Center
            hexLines.push(toW1256Hex('\nThank you / ' + String.fromCharCode(0x0634,0x0643,0x0631,0x0627,0x064B) + '\n'));
            hexLines.push(toW1256Hex('\nPowered by Nexova\n'));
            hexLines.push('0A0A0A0A0A0A'); // 6x line feed
            hexLines.push('1D564100');      // Full cut

            const fullHex = hexLines.join('');
            console.log("[QZ] Arabic hex payload built, length:", fullHex.length);

            printQueue = printQueue.then(async () => {
              console.log("[QZ] Executing qz.print() with hex payload...");
              await qz.print(config, [{ type: 'raw', format: 'command', flavor: 'hex', data: fullHex }]);
              console.log("[QZ] qz.print() Arabic hex completed!");
              await new Promise(resolve => setTimeout(resolve, 500));
            }).catch(e => {
              console.error("[QZ] Arabic hex print failed in queue:", e);
            });

          } else {
            // ── English mode: build logo as ESC/POS raster hex, then send text lines ──
            printQueue = printQueue.then(async () => {
              console.log("[QZ] Executing qz.print() with raw string lines...");
              const printData: any[] = [];
              // Build logo raster hex and prepend as a hex-flavored item
              if (logoBase64) {
                try {
                  const logoCanvas = await new Promise<HTMLCanvasElement | null>((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                      const c = document.createElement('canvas');
                      const maxW = logoWidth;
                      const maxH = logoHeight;
                      const scale = Math.min(1, maxW / img.width, maxH / img.height);
                      c.width = Math.floor((img.width * scale) / 8) * 8;
                      c.height = Math.floor(img.height * scale);
                      const ctx = c.getContext('2d');
                      if (!ctx) { resolve(null); return; }
                      ctx.fillStyle = '#FFFFFF';
                      ctx.fillRect(0, 0, c.width, c.height);
                      ctx.drawImage(img, 0, 0, c.width, c.height);
                      resolve(c);
                    };
                    img.onerror = () => resolve(null);
                    img.src = logoBase64;
                  });
                  if (logoCanvas) {
                    // Center align + raster image bytes (no extra line feed)
                    const logoHex = '1B6101' + canvasToEscposHex(logoCanvas);
                    printData.push({ type: 'raw', format: 'command', flavor: 'hex', data: logoHex });
                    console.log('[QZ] English logo raster hex built, length:', logoHex.length);
                  }
                } catch (logoErr) {
                  console.warn('[QZ] English logo conversion failed, skipping:', logoErr);
                }
              }
              // Append all the text rawLines after the logo
              printData.push(...rawLines);
              await qz.print(config, printData);
              console.log("[QZ] qz.print() English completed!");
              await new Promise(resolve => setTimeout(resolve, 500));
            }).catch(e => {
              console.error("[QZ] qz.print() failed in queue:", e);
            });
          }

          await printQueue;
          console.log("[QZ] Print queue finished.");
          return;
        } catch (e) {
          console.error("[QZ] raw print overall catch block triggered:", e);
        }
      } else {
        console.warn("[QZ] No posPrinterName configured in Company Details.");
      }
      return;
    }
  } else {
    // COLORFUL A4 INVOICE FORMAT
    const doc = new jsPDF({
      unit: "mm",
      format: "a4", // 210 x 297 mm
    });
    let hasSinhalaFont = false;
    try {
      if (notoBase64 && notoBase64.length > 1000) {
        doc.addFileToVFS("NotoSansSinhala-Regular.ttf", notoBase64);
        doc.addFont("NotoSansSinhala-Regular.ttf", "NotoSansSinhala", "normal");
        hasSinhalaFont = true;
      }
      if (amiriBase64 && amiriBase64.length > 1000) {
        doc.addFileToVFS("Amiri-Regular.ttf", amiriBase64);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
      }
    } catch (fontErr) {
      console.warn("Custom TTF font registration skipped, using standard fonts:", fontErr);
    }

    const fontToUse = hasSinhalaFont ? "NotoSansSinhala" : "helvetica";

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 0;

    // Header Background (#1565C0 Brand Royal Blue)
    doc.setFillColor(21, 101, 192);
    doc.rect(0, 0, pageWidth, 40, "F");

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("RECEIPT", pageWidth - 15, 25, { align: "right" });

    // Logo
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 15, 8, 24, 24);
    }

    currentY = 50;

    // Reset text color
    doc.setTextColor(33, 33, 33);

    // Company Details (Left)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(data.companyDetails?.companyName || "STORE RECEIPT", 15, currentY);
    currentY += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    
    if (data.companyDetails?.address) {
      const splitAddress = doc.splitTextToSize(data.companyDetails.address, 90);
      doc.text(splitAddress, 15, currentY);
      currentY += splitAddress.length * 5;
    }
    if (data.companyDetails?.mobileNumber) {
      doc.text(`Tel: ${data.companyDetails.mobileNumber}`, 15, currentY);
      currentY += 5;
    }
    if (data.companyDetails?.email) {
      doc.text(`Email: ${data.companyDetails.email}`, 15, currentY);
      currentY += 5;
    }
    if (data.companyDetails?.website) {
      doc.text(`Web: ${data.companyDetails.website}`, 15, currentY);
      currentY += 5;
    }
    if (data.companyDetails?.crNumber) {
      doc.text(`CR No: ${data.companyDetails.crNumber}`, 15, currentY);
      currentY += 5;
    }

    // Receipt Info (Right)
    let rightY = 50;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 33, 33);
    doc.text("Order Number:", pageWidth - 80, rightY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(data.orderNumber, pageWidth - 15, rightY, { align: "right" });
    
    rightY += 8;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 33, 33);
    doc.text("Date:", pageWidth - 80, rightY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(data.date, pageWidth - 15, rightY, { align: "right" });
    
    rightY += 8;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(33, 33, 33);
    doc.text("Payment Method:", pageWidth - 80, rightY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(data.paymentMethod.replace("POS_", ""), pageWidth - 15, rightY, { align: "right" });

    if (data.trackingNumber) {
      rightY += 8;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(33, 33, 33);
      doc.text("Tracking ID:", pageWidth - 80, rightY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(data.trackingNumber, pageWidth - 15, rightY, { align: "right" });
    }

    if (data.customerName) {
      rightY += 8;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(33, 33, 33);
      doc.text("Customer:", pageWidth - 80, rightY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(data.customerName, pageWidth - 15, rightY, { align: "right" });
    }

    if (data.paymentMethod === "POS_CREDIT") {
      rightY += 8;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(33, 33, 33);
      doc.text("Paid Amount:", pageWidth - 80, rightY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`${curSymbol} ${(data.paidAmount ?? 0).toFixed(decimals)}`, pageWidth - 15, rightY, { align: "right" });

      rightY += 8;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(33, 33, 33);
      doc.text("Outstanding:", pageWidth - 80, rightY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`${curSymbol} ${(data.outstandingAmount ?? data.total).toFixed(decimals)}`, pageWidth - 15, rightY, { align: "right" });
    }

    currentY = Math.max(currentY, rightY) + 15;

    // Items Table mapping
    const tableData = data.items.map((item) => {
      let itemName = item.name;
      if (item.nameAr) {
        itemName += `\n${item.nameAr}`;
      }
      if (item.sku) {
        itemName += `\nSKU: ${item.sku}`;
      }
      
      const discountText = item.discountPercent ? `${item.discountPercent}%` : "-";

      return [
        itemName,
        `${item.quantity}`,
        `${curSymbol} ${item.price.toFixed(decimals)}`,
        discountText,
        `${curSymbol} ${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(decimals)}`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Item Description", "Qty", "Unit Price", "Discount", "Total"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: "normal", font: fontToUse, halign: "center" },
      styles: { font: fontToUse, fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 24, halign: "center" },
        2: { cellWidth: 28, halign: "right" },
        3: { cellWidth: 26, halign: "center" },
        4: { cellWidth: 32, halign: "right" },
      },
      margin: { left: 15, right: 15 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Totals Area (Right aligned box with clean brand background)
    let boxHeight = 40;
    if (data.billDiscountAmount && data.billDiscountAmount > 0) boxHeight += 10;

    doc.setFillColor(239, 246, 255); // #EFF6FF (Light blue tint)
    doc.setDrawColor(191, 219, 254); // #BFDBFE (Soft blue border)
    doc.roundedRect(pageWidth - 115, currentY, 100, boxHeight, 3, 3, "FD");

    let totalY = currentY + 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate 600
    
    doc.text("Subtotal:", pageWidth - 110, totalY);
    doc.text(`${curSymbol} ${data.subtotal.toFixed(decimals)}`, pageWidth - 20, totalY, { align: "right" });
    
    if (data.billDiscountAmount && data.billDiscountAmount > 0) {
      totalY += 8;
      doc.setTextColor(225, 29, 72); // Rose 600 for discount
      doc.text("Discount:", pageWidth - 110, totalY);
      doc.text(`-${curSymbol} ${data.billDiscountAmount.toFixed(decimals)}`, pageWidth - 20, totalY, { align: "right" });
    }

    totalY += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(21, 101, 192); // #1565C0 Brand Royal Blue
    doc.text("Total:", pageWidth - 110, totalY);
    doc.text(`${curSymbol} ${data.total.toFixed(decimals)}`, pageWidth - 20, totalY, { align: "right" });

    if (data.changeDue > 0) {
      totalY += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Change Due:", pageWidth - 110, totalY);
      doc.text(`${curSymbol} ${data.changeDue.toFixed(decimals)}`, pageWidth - 20, totalY, { align: "right" });
    }

    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your purchase!", pageWidth / 2, 280, { align: "center" });

    doc.save(`Receipt-${data.orderNumber}.pdf`);
  }
}
