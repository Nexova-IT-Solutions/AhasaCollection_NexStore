import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const prisma = db as any;
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid email" }, { status: 400 });
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await db.user.findUnique({ where: { email: normalizedEmail } });

    // Always return success to avoid user enumeration.
    if (!user) {
      return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
    }

    const token = randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });
    await prisma.passwordResetToken.create({
      data: {
        token,
        email: normalizedEmail,
        expires,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      return NextResponse.json({ message: "NEXTAUTH_URL is not configured" }, { status: 500 });
    }

    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;
    await sendPasswordResetEmail({ to: normalizedEmail, resetUrl });

    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  } catch (error) {
    console.error("forgot-password error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
