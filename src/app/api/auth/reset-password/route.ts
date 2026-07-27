import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const prisma = db as any;
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const { token, password } = parsed.data;

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!resetToken || resetToken.expires < new Date()) {
      return NextResponse.json({ message: "Token is invalid or expired" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: resetToken.email } });
    if (!user) {
      await prisma.passwordResetToken.delete({ where: { token } });
      return NextResponse.json({ message: "Token is invalid" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.delete({ where: { token } }),
    ]);

    return NextResponse.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("reset-password error", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
