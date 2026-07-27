import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { z } from "zod";

const REQUIRED_FIELD_MESSAGE = "This field is required.";

const registerSchema = z.object({
  email: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE).email("Please enter a valid email address"),
  password: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE).min(6, "Password must be at least 6 characters"),
  name: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: "Privacy policy consent is required" }),
  }),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in database (defaults to USER role)
    const newUser = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        // role defaults to USER in Prisma schema
      },
    });

    return NextResponse.json(
      { message: "User created successfully", user: { id: newUser.id, email: newUser.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
