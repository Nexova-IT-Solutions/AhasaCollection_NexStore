import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { z } from "zod";

// 1. PROPER ZOD DEFINITION (Outside and Above functions)
const gatewayConfigSchema = z.object({
  gateway: z.enum(["DIRECTPAY", "MINTPAY", "COD", "BANK_TRANSFER"]),
  isActive: z.boolean(),
  mode: z.enum(["SANDBOX", "LIVE"]).optional(),
  feeType: z.enum(["NONE", "FIXED", "PERCENTAGE"]),
  feeValue: z.number().min(0),
  config: z.record(z.string(), z.any()).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const gatewayClient = (db as any).paymentGateway;
    const gateways = await gatewayClient.findMany();
    
    const decryptedGateways = gateways.map((g: any) => {
      const config = g.config as any || {};
      const decryptedConfig: any = {};
      
      for (const key in config) {
        decryptedConfig[key] = decrypt(config[key]);
      }
      
      return { 
        ...g, 
        config: decryptedConfig,
        gateway: g.name 
      };
    });

    const bankAccounts = await db.bankAccount.findMany({
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({ gateways: decryptedGateways, bankAccounts });
  } catch (error) {
    console.error("Fetch gateways error:", error);
    return NextResponse.json({ message: "Error fetching gateways" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEV_ADMIN")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    
    const normalizedBody = {
      ...body,
      gateway: body.gateway || body.name,
      config: body.config || body.credentials
    };

    const result = gatewayConfigSchema.safeParse(normalizedBody);
    
    if (!result.success) {
      return NextResponse.json({ 
        message: "Invalid configuration data", 
        errors: result.error.errors 
      }, { status: 400 });
    }

    const { gateway, mode, isActive, feeType, feeValue, config } = result.data;

    // Encrypt sensitive credentials
    const encryptedConfig: any = {};
    if (config) {
      for (const key in config) {
        if (config[key]) {
          encryptedConfig[key] = encrypt(config[key].toString());
        }
      }
    }

    const result_data = await db.$transaction(async (tx) => {
      const updated = await tx.paymentGateway.upsert({
        where: { name: gateway as any },
        update: {
          mode: mode || "SANDBOX",
          isActive,
          feeType,
          feeValue,
          config: encryptedConfig,
        },
        create: {
          name: gateway as any,
          mode: mode || "SANDBOX",
          isActive,
          feeType,
          feeValue,
          config: encryptedConfig,
        },
      });

      if (gateway === "BANK_TRANSFER" && body.bankAccounts) {
        // Sync bank accounts: delete old and insert new (simple sync for now)
        await tx.bankAccount.deleteMany({});
        if (body.bankAccounts.length > 0) {
          await tx.bankAccount.createMany({
            data: body.bankAccounts.map((ba: any) => ({
              bankName: ba.bankName,
              accountName: ba.accountName,
              accountNumber: ba.accountNumber,
              branchName: ba.branchName || null,
              instructions: ba.instructions || null,
              isActive: ba.isActive ?? true
            }))
          });
        }
      }

      return updated;
    });

    return NextResponse.json(result_data);
  } catch (error) {
    console.error("Payment config error:", error);
    return NextResponse.json({ message: "Error updating gateway" }, { status: 500 });
  }
}
