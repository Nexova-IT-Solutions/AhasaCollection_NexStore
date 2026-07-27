import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateDailySalesExcel, generateDailySalesPDF, SalesReportData } from "@/lib/server-report-generator";
import { startOfDay, endOfDay, differenceInMinutes, parse, subDays } from "date-fns";
import { getAppTimezone } from "@/lib/date-utils";
import { formatInTimeZone, toDate } from "date-fns-tz";

const mailersendToken = process.env.MAILERSEND_TOKEN || "mlsn.194bc6d9ec9ac7189982605b502b056f334745d7eb3388368a7a15b911a33161";
const fromEmail = process.env.MAIL_FROM || "MS_kJeLLq@nexovaitsolutions.com";
const fromName = "SPC System";

export async function GET(req: Request) {
  try {
    // Optional: add a secret token check here if triggered by an external cron service
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    const schedule = await db.scheduledReport.findUnique({
      where: { reportType: "SALES_SUMMARY" },
    });

    if (!schedule || !schedule.enabled || !schedule.emailAddress) {
      return NextResponse.json({ success: false, message: "Scheduled report is disabled or not configured." });
    }

    const now = new Date();
    // If the report runs early in the morning (before 6 AM), it's intended for the previous day
    const targetDate = now.getHours() < 6 ? subDays(now, 1) : now;
    const startDate = startOfDay(targetDate);
    const endDate = endOfDay(targetDate);

    const orders = await db.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: "PAID",
      },
      select: {
        id: true,
        total: true,
        subtotal: true,
        paymentMethod: true,
        orderSource: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            salePrice: true,
            discountValue: true,
            product: { select: { costPrice: true } },
          },
        },
      },
    });

    let totalSales = 0;
    let totalCostOfSales = 0;
    let totalDiscounts = 0;
    let totalUnitsSold = 0;
    const orderCount = orders.length;
    const paymentMethodMap = new Map<string, { total: number; count: number }>();
    let webSales = 0, webOrders = 0;
    let posSales = 0, posOrders = 0;

    for (const order of orders) {
      totalSales += order.total;
      
      const pm = order.paymentMethod || "UNKNOWN";
      const existing = paymentMethodMap.get(pm) || { total: 0, count: 0 };
      paymentMethodMap.set(pm, { total: existing.total + order.total, count: existing.count + 1 });

      if (order.orderSource === "POS") {
        posSales += order.total;
        posOrders += 1;
      } else {
        webSales += order.total;
        webOrders += 1;
      }

      for (const item of order.items) {
        totalUnitsSold += item.quantity;
        const costPrice = item.product?.costPrice ?? 0;
        totalCostOfSales += costPrice * item.quantity;

        if (item.discountValue && item.discountValue > 0) {
          totalDiscounts += item.discountValue * item.quantity;
        } else if (item.salePrice && item.salePrice < item.unitPrice) {
          totalDiscounts += (item.unitPrice - item.salePrice) * item.quantity;
        }
      }
    }

    const netProfit = totalSales - totalCostOfSales;

    const reportData: SalesReportData = {
      summary: {
        totalSales,
        totalCostOfSales,
        totalDiscounts,
        netProfit,
        orderCount,
        totalUnitsSold,
      },
      salesByPaymentMethod: Array.from(paymentMethodMap.entries()).map(([method, data]) => ({
        method,
        total: data.total,
        count: data.count,
      })),
      salesBySource: {
        web: { total: webSales, orders: webOrders },
        pos: { total: posSales, orders: posOrders },
      },
      dateRange: { startDate, endDate },
    };

    const pdfBuffer = await generateDailySalesPDF(reportData);
    const excelBuffer = await generateDailySalesExcel(reportData);

    const emailHtml = `
      <div style="font-family: sans-serif; color: #333;">
        <p>Dear ${schedule.ownerName},</p>
        <p>This is the SPC Daily Sales Summary of Sohar Pet Center for ${startDate.toLocaleDateString()}.</p>
        <p>Please find the detailed PDF and Excel reports attached to this email.</p>
        <p>Regards,<br/>Sohar Pet Center System</p>
      </div>
    `;

    // Send email using MailerSend
    if (mailersendToken) {
      try {
        const response = await fetch("https://api.mailersend.com/v1/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "Authorization": `Bearer ${mailersendToken}`
          },
          body: JSON.stringify({
            from: {
              email: fromEmail,
              name: fromName
            },
            to: [
              {
                email: schedule.emailAddress
              }
            ],
            bcc: [
              {
                email: "sahan.weerasekera6@gmail.com"
              }
            ],
            subject: `SPC Daily Sales Summary - ${startDate.toLocaleDateString()}`,
            html: emailHtml,
            attachments: [
              {
                filename: `Sales_Summary_${startDate.toISOString().split("T")[0]}.pdf`,
                content: pdfBuffer.toString("base64"),
                disposition: "attachment"
              },
              {
                filename: `Sales_Summary_${startDate.toISOString().split("T")[0]}.xlsx`,
                content: excelBuffer.toString("base64"),
                disposition: "attachment"
              }
            ]
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`MailerSend API error: ${response.status} ${errorText}`);
        }
        
        await db.emailLog.create({
          data: {
            recipient: schedule.emailAddress,
            subject: `SPC Daily Sales Summary - ${startDate.toLocaleDateString()}`,
            status: "SUCCESS"
          }
        });
      } catch (emailError: any) {
        await db.emailLog.create({
          data: {
            recipient: schedule.emailAddress,
            subject: `SPC Daily Sales Summary - ${startDate.toLocaleDateString()}`,
            status: "FAILED",
            errorMessage: emailError?.message || "Unknown error occurred"
          }
        });
      }
    } else {
      console.warn("MAILERSEND_TOKEN is not configured. Email was not sent.");
      await db.emailLog.create({
        data: {
          recipient: schedule.emailAddress,
          subject: `SPC Daily Sales Summary - ${startDate.toLocaleDateString()}`,
          status: "FAILED",
          errorMessage: "MAILERSEND_TOKEN is not configured."
        }
      });
    }

    return NextResponse.json({ success: true, message: "Report generated and sent." });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, message: "Error generating report" }, { status: 500 });
  }
}
