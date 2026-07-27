import * as z from "zod";

export const CITY_NAME_REGEX = /^[A-Za-z\s\-]+$/;
const TEN_DIGIT_PHONE_REGEX = /^\d{10}$/;

export const addressSchema = z.object({
  type: z.enum(["BILLING", "DELIVERY"], {
    message: "Please select an address type.",
  }),
  contactName: z.string().min(2, "Contact name must be at least 2 characters."),
  phoneNumber: z
    .string()
    .regex(TEN_DIGIT_PHONE_REGEX, "Phone number must be exactly 10 digits."),
  addressLine1: z.string().min(5, "Address line 1 must be at least 5 characters."),
  addressLine2: z.string().optional(),
  city: z
    .string()
    .trim()
    .min(2, "City is required.")
    .regex(CITY_NAME_REGEX, "City name should only contain letters."),
  province: z.string().optional(),
  postalCode: z
    .string()
    .regex(/^[0-9]{5}$/, "Please enter a valid 5-digit Sri Lankan postal code."),
  isDefault: z.boolean(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
