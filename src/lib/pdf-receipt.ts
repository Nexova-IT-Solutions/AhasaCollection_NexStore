import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import qz from "qz-tray";
import { amiriBase64 } from "./fonts/Amiri-Regular";
import html2canvas from "html2canvas";
import { initQZSecurity } from "./qz-init";

const arNum = (n: number | string) => {
  const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(n).replace(/[0-9]/g, (w) => arabicNumbers[+w]);
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
  changeDue: number;
  paymentMethod: string;
  date: string;
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
  // m = 1 (8-dot double density)
  // n1 = width & 0xFF
  // n2 = (width >> 8) & 0xFF
  const n1 = width & 0xFF;
  const n2 = (width >> 8) & 0xFF;

  const n1Hex = n1.toString(16).padStart(2, '0');
  const n2Hex = n2.toString(16).padStart(2, '0');

  let hex = '';

  // Set line spacing to 8 dots (ESC 3 8) -> 1B 33 08 to prevent vertical white gaps
  hex += '1B3308';

  // Process image in 8-dot vertical slices
  for (let y = 0; y < height; y += 8) {
    // Send ESC * command: 1B 2A 01 n1 n2
    hex += '1B2A01' + n1Hex + n2Hex;

    for (let x = 0; x < width; x++) {
      let byteValue = 0;
      for (let b = 0; b < 8; b++) {
        const targetY = y + b;
        if (targetY < height) {
          const i = (targetY * width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const bVal = data[i + 2];
          const a = data[i + 3];
          const luminance = 0.299 * r + 0.587 * g + 0.114 * bVal;
          const isBlack = (a > 128 && luminance < 160);
          if (isBlack) {
            byteValue |= (1 << (7 - b));
          }
        }
      }
      hex += byteValue.toString(16).padStart(2, '0');
    }
    // Line feed after each 8-dot row
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

  if (format === "print") {
    const mode = data.companyDetails?.posPrintMode || "raw";
    const isRaster = mode.startsWith("raster");
    const isEnglish = mode.endsWith("_english");

    if (isRaster) {
      // 80mm THERMAL PRINTER RASTER FORMAT (html2canvas to PNG)


      let itemsHtml = "";
      data.items.forEach(item => {
        let itemName = item.name;
        if (!isEnglish && item.nameAr) itemName += ` - ${item.nameAr}`;
        
        let qtyPrice = isEnglish 
          ? `Qty: ${item.quantity} x OMR ${item.price.toFixed(3)}`
          : `Qty / الكمية: ${item.quantity} / ${arNum(item.quantity)} x ${item.price.toFixed(3)} / ${arNum(item.price.toFixed(3))}`;
          
        if (item.discountPercent && item.discountPercent > 0) {
          qtyPrice += isEnglish 
            ? ` (Disc ${item.discountPercent}%)`
            : ` (Disc / خصم ${item.discountPercent}%)`;
        }
        
        const total = isEnglish
          ? `OMR ${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(3)}`
          : `${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(3)} / ${arNum((item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(3))}`;
        
        itemsHtml += `
          <div style="margin-bottom: 4px;">
            <div>${itemName}</div>
            ${item.sku ? `<div style="font-size: 10px; color: #555;">SKU: ${item.sku}</div>` : ''}
            <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px;">
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
        width: "280px", // 72mm printable area roughly maps to 280px
        backgroundColor: "white",
        color: "black",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        fontSize: "12px",
        lineHeight: "1.3",
        padding: "0"
      });

      const originalLogo = logoBase64 ? logoBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "") : null;
      const logoHtml = originalLogo ? `<div style="margin-bottom: 8px; width: 100%; display: flex; justify-content: center;"><img src="data:image/png;base64,${originalLogo}" style="max-height: 60px; max-width: 60px; object-fit: contain;" /></div>` : '';

      container.innerHTML = `
        ${logoHtml}
        <div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 4px;">${data.companyDetails?.companyName || "STORE RECEIPT"}</div>
        <div style="text-align: center; font-size: 11px; margin-bottom: 8px;">
          ${data.companyDetails?.address ? `<div>${data.companyDetails.address}</div>` : ''}
          ${data.companyDetails?.mobileNumber ? `<div>Tel: ${data.companyDetails.mobileNumber}</div>` : ''}
          ${data.companyDetails?.email ? `<div>${data.companyDetails.email}</div>` : ''}
          ${data.companyDetails?.website ? `<div>${data.companyDetails.website}</div>` : ''}
          ${data.companyDetails?.crNumber ? `<div>CR: ${data.companyDetails.crNumber}</div>` : ''}
        </div>
        <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
        <div style="font-size: 11px; margin-bottom: 8px;">
          <div>Order: ${data.orderNumber}</div>
          <div>Date: ${data.date}</div>
          <div>Payment: ${data.paymentMethod.replace("POS_", "")}</div>
        </div>
        <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
        <div style="margin-bottom: 8px;">
          ${itemsHtml}
        </div>
        <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
        <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>${isEnglish ? 'Subtotal:' : 'Subtotal / المجموع الفرعي:'}</span>
          <span style="font-weight: bold;">${isEnglish ? `OMR ${data.subtotal.toFixed(3)}` : `OMR ${data.subtotal.toFixed(3)} / ${arNum(data.subtotal.toFixed(3))}`}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 14px;">
          <span style="font-weight: bold;">${isEnglish ? 'Total:' : 'Total / المجموع:'}</span>
          <span style="font-weight: bold;">${isEnglish ? `OMR ${data.total.toFixed(3)}` : `OMR ${data.total.toFixed(3)} / ${arNum(data.total.toFixed(3))}`}</span>
        </div>
        ${data.changeDue > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>${isEnglish ? 'Change Due:' : 'Change Due / الباقي:'}</span>
            <span style="font-weight: bold;">${isEnglish ? `OMR ${data.changeDue.toFixed(3)}` : `OMR ${data.changeDue.toFixed(3)} / ${arNum(data.changeDue.toFixed(3))}`}</span>
          </div>
        ` : ''}
        <div style="text-align: center; margin-top: 16px; margin-bottom: 4px;">Thank you for your purchase!</div>
        <div style="text-align: center; margin-top: 8px; font-size: 9px; color: #555; padding-bottom: 20px;">Powered by Nexova</div>
      `;

      document.body.appendChild(container);

      if (data.companyDetails?.posPrinterName) {
        try {
          if (!qz.websocket.isActive()) {
            await qz.websocket.connect({ retries: 0 });
          }
          await new Promise(r => setTimeout(r, 50));
          const canvas = await html2canvas(container, {
            scale: 2,
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
      const COL = Math.max(30, charWidth - 6);

      // Switch to left align before first separator so it spans full width
      rawLines.push(
        '\x1B\x61\x00', // Left align
        `${SEP}\n`,
        isEnglish ? `Order: ${data.orderNumber}\n` : `Order / الطلب: ${data.orderNumber}\n`,
        isEnglish ? `Date: ${data.date}\n` : `Date / التاريخ: ${data.date}\n`,
        isEnglish ? `Payment: ${data.paymentMethod.replace("POS_", "")}\n` : `Payment / الدفع: ${data.paymentMethod.replace("POS_", "")}\n`,
        `${SEP}\n`
      );
      
      // Items — qty/name left aligned, total always right-aligned by the printer hardware
      data.items.forEach(item => {
        let nameLine = item.name;
        if (!isEnglish && item.nameAr) nameLine += ` - ${item.nameAr}`;

        // Name line (left aligned)
        rawLines.push('\x1B\x61\x00'); // Left align
        rawLines.push(`${nameLine}\n`);
        if (item.sku) rawLines.push(`SKU: ${item.sku}\n`);

        // Qty line (left aligned)
        const qtyPrice = isEnglish
          ? `Qty: ${item.quantity} x OMR ${item.price.toFixed(3)}`
          : `Qty/الكمية: ${item.quantity} x OMR ${item.price.toFixed(3)}`;
        rawLines.push(`${qtyPrice}\n`);

        // Discount line if applicable (left aligned)
        if (item.discountPercent && item.discountPercent > 0) {
          const discountedTotal = item.quantity * item.price * (1 - item.discountPercent / 100);
          const discLine = isEnglish
            ? `Discount: ${item.discountPercent}% off -> OMR ${discountedTotal.toFixed(3)}`
            : `Discount / خصم: ${item.discountPercent}%`;
          rawLines.push(`${discLine}\n`);
        }

        // Total — always right-aligned by the printer's own hardware command
        const lineTotal = item.quantity * item.price * (1 - (item.discountPercent || 0) / 100);
        rawLines.push('\x1B\x61\x02'); // Right align
        rawLines.push(`OMR ${lineTotal.toFixed(3)}\n`);
        rawLines.push('\x1B\x61\x00'); // Back to left align
      });

      // Separator then right-aligned totals
      rawLines.push(
        '\x1B\x61\x00', // Left align for separator
        `${SEP}\n`,
        '\x1B\x61\x02', // Right align for totals
        isEnglish ? `Subtotal: OMR ${data.subtotal.toFixed(3)}\n` : `Subtotal / المجموع الفرعي: OMR ${data.subtotal.toFixed(3)}\n`,
        isEnglish ? `Total: OMR ${data.total.toFixed(3)}\n` : `Total / المجموع: OMR ${data.total.toFixed(3)}\n`
      );
      
      if (data.changeDue > 0) {
        rawLines.push(isEnglish ? `Change Due: OMR ${data.changeDue.toFixed(3)}\n` : `Change Due / الباقي: OMR ${data.changeDue.toFixed(3)}\n`);
      }
      
      rawLines.push(
        '\x1B\x61\x01', // Center align
        isEnglish ? '\nThank you for your purchase!\n' : '\nThank you for your purchase!\nشكرا لتسوقكم معنا\n',
        '\nPowered by Nexova\n',
        '\n\n\n\n\n\n', // Feed paper
        '\x1D\x56\x41\x10' // Full cut
      );

      if (data.companyDetails?.posPrinterName) {
        try {
          console.log("[QZ] Checking websocket connection...");
          initQZSecurity();
          if (!qz.websocket.isActive()) {
            console.log("[QZ] Connecting to websocket...");
            await qz.websocket.connect({ retries: 0 });
            console.log("[QZ] Connected successfully!");
          } else {
            console.log("[QZ] Websocket already active.");
          }

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
                  hexLines.push('0A'); // Line feed after logo
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
              const qtyLabel = `Qty/${String.fromCharCode(0x0627,0x0644,0x0643,0x0645,0x064A,0x0629)}: ${item.quantity} x OMR ${item.price.toFixed(3)}`;
              const lineTotal = `OMR ${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(3)}`;
              hexLines.push(toW1256Hex(qtyLabel + '  ' + lineTotal + '\n'));
            });
            // Totals (right-align)
            hexLines.push(toW1256Hex(arabicSep + '\n'));
            hexLines.push('1B6102'); // Right align
            const subtotalLabel = `Subtotal / ${String.fromCharCode(0x0645,0x062C,0x0645,0x0648,0x0639,0x20,0x0641,0x0631,0x0639,0x064A)}`;
            hexLines.push(toW1256Hex(`${subtotalLabel}: OMR ${data.subtotal.toFixed(3)}\n`));
            const totalLabel = `Total / ${String.fromCharCode(0x0645,0x062C,0x0645,0x0648,0x0639)}`;
            hexLines.push(toW1256Hex(`${totalLabel}: OMR ${data.total.toFixed(3)}\n`));
            if (data.changeDue > 0) {
              const changeLabel = `Change / ${String.fromCharCode(0x0628,0x0627,0x0642,0x064A)}`;
              hexLines.push(toW1256Hex(`${changeLabel}: OMR ${data.changeDue.toFixed(3)}\n`));
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
                    // Center align + raster image bytes + line feed
                    const logoHex = '1B6101' + canvasToEscposHex(logoCanvas) + '0A';
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
    doc.addFileToVFS("Amiri-Regular.ttf", amiriBase64);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 0;

    // Header Background
    doc.setFillColor(167, 6, 106); // #A7066A (Brand color)
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
        `${item.quantity} / ${arNum(item.quantity)}`,
        `OMR ${item.price.toFixed(3)} / ${arNum(item.price.toFixed(3))}`,
        discountText,
        `OMR ${(item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(3)} / ${arNum((item.quantity * item.price * (1 - (item.discountPercent || 0) / 100)).toFixed(3))}`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Item Description / وصف العنصر", "Qty / الكمية", "Unit Price / سعر الوحدة", "Discount / خصم", "Total / المجموع"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [167, 6, 106], textColor: 255, fontStyle: "normal", font: "Amiri", halign: "center" },
      styles: { font: "Amiri", fontSize: 10, cellPadding: 4 },
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

    // Totals Area (Right aligned box)
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(pageWidth - 115, currentY, 100, 40, 3, 3, "FD");

    let totalY = currentY + 10;
    doc.setFont("Amiri", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    doc.text("Subtotal / المجموع الفرعي:", pageWidth - 110, totalY);
    doc.text(`OMR ${data.subtotal.toFixed(3)} / ${arNum(data.subtotal.toFixed(3))}`, pageWidth - 20, totalY, { align: "right" });
    
    totalY += 12;
    doc.setFont("Amiri", "normal");
    doc.setFontSize(14);
    doc.setTextColor(167, 6, 106);
    doc.text("Total / المجموع:", pageWidth - 110, totalY);
    doc.text(`OMR ${data.total.toFixed(3)} / ${arNum(data.total.toFixed(3))}`, pageWidth - 20, totalY, { align: "right" });

    if (data.changeDue > 0) {
      totalY += 10;
      doc.setFont("Amiri", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Change Due / الباقي:", pageWidth - 110, totalY);
      doc.text(`OMR ${data.changeDue.toFixed(3)} / ${arNum(data.changeDue.toFixed(3))}`, pageWidth - 20, totalY, { align: "right" });
    }

    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your purchase!", pageWidth / 2, 280, { align: "center" });

    doc.save(`Receipt-${data.orderNumber}.pdf`);
  }
}
