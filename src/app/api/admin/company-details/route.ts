import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { clearTimezoneCache } from "@/lib/date-utils";

const companyDetailsSchema = z.object({
  companyName: z.string().optional(),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  crNumber: z.string().optional().or(z.literal("")),
  posPrinterName: z.string().optional().or(z.literal("")),
  posPrintMode: z.string().default("raw"),
  timezone: z.string().optional().default("Asia/Muscat"),
  receiptCharWidth: z.number().int().min(32).max(48).optional().default(42),
  receiptLogoWidth: z.number().int().min(100).max(300).optional().default(200),
  receiptLogoHeight: z.number().int().min(40).max(200).optional().default(80),
  receiptPrintArea: z.number().int().min(50).max(120).optional().default(80),
  logoBase64: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    let details = await db.companyDetails.findUnique({
      where: { id: "1" },
    });

    if (!details) {
      details = await db.companyDetails.create({
        data: { id: "1" },
      });
    }

    return NextResponse.json(details, { status: 200 });
  } catch (error) {
    console.error("[COMPANY_DETAILS_GET]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !["SUPER_ADMIN", "DEV_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = companyDetailsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: result.error.errors },
        { status: 400 }
      );
    }

    const data = result.data;

    const details = await db.companyDetails.upsert({
      where: { id: "1" },
      update: {
        companyName: data.companyName,
        mobileNumber: data.mobileNumber,
        address: data.address,
        website: data.website,
        email: data.email,
        crNumber: data.crNumber,
        posPrinterName: data.posPrinterName,
        posPrintMode: data.posPrintMode,
        timezone: data.timezone,
        receiptCharWidth: data.receiptCharWidth,
        receiptLogoWidth: data.receiptLogoWidth,
        receiptLogoHeight: data.receiptLogoHeight,
        receiptPrintArea: data.receiptPrintArea,
        logoBase64: data.logoBase64,
      },
      create: {
        id: "1",
        companyName: data.companyName,
        mobileNumber: data.mobileNumber,
        address: data.address,
        website: data.website,
        email: data.email,
        crNumber: data.crNumber,
        posPrinterName: data.posPrinterName,
        posPrintMode: data.posPrintMode,
        timezone: data.timezone,
        receiptCharWidth: data.receiptCharWidth,
        receiptLogoWidth: data.receiptLogoWidth,
        receiptLogoHeight: data.receiptLogoHeight,
        receiptPrintArea: data.receiptPrintArea,
        logoBase64: data.logoBase64,
      },
    });

    clearTimezoneCache();

    return NextResponse.json(details, { status: 200 });
  } catch (error) {
    console.error("[COMPANY_DETAILS_POST]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
