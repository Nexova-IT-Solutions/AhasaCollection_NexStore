import { z } from "zod";

// Friendly phone number validation: allows +94 prefix, 9-12 digits (mobiles/landlines)
const phoneRegex = /^(?:\+94|94|0)?[0-9]{9,12}$/;

export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").trim(),
  contactName: z.string().nullable().optional().or(z.literal("")).transform(v => v || null),
  email: z.union([z.literal(""), z.string().email("Invalid email address")]).nullable().optional().transform(v => v || null),
  phoneNumber: z.string()
    .min(1, "Phone number is required")
    .regex(phoneRegex, "Invalid phone number format. Use local formats like 07XXXXXXXX or 011XXXXXXX")
    .trim(),
  address: z.string().nullable().optional().or(z.literal("")).transform(v => v || null),
});

export type SupplierSchemaType = z.infer<typeof supplierSchema>;
