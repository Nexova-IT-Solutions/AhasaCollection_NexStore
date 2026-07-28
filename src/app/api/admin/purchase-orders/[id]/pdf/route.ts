import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePurchaseOrderPdf } from "@/lib/pdf-po-doc";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, { params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: true,
      },
    });

    if (!po) {
      return NextResponse.json({ message: "Purchase Order not found" }, { status: 404 });
    }

    const pdfBuffer = generatePurchaseOrderPdf(po);

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${po.poNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("[PO PDF Download Error]:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
