import { PaymentMethod } from "@/types";

export const paymentMethods: PaymentMethod[] = [
  {
    id: "cod",
    name: "Cash on Delivery",
    description: "Pay when you receive your gift",
    icon: "banknote",
  },
  {
    id: "card",
    name: "Card Payment",
    description: "Pay securely with credit/debit card",
    icon: "credit-card",
  },
  {
    id: "bank",
    name: "Bank Transfer",
    description: "Direct bank transfer to our account",
    icon: "building",
  },
];

export const deliveryTimeSlots = [
  { id: "morning", label: "Morning (9 AM - 12 PM)" },
  { id: "afternoon", label: "Afternoon (12 PM - 5 PM)" },
  { id: "evening", label: "Evening (5 PM - 8 PM)" },
];

export const sriLankanCities = [
  "Colombo",
  "Dehiwala",
  "Mount Lavinia",
  "Moratuwa",
  "Rajagiriya",
  "Battaramulla",
  "Kotte",
  "Nugegoda",
  "Maharagama",
  "Piliyandala",
  "Homagama",
  "Kaduwela",
  "Kelaniya",
  "Wattala",
  "Negombo",
  "Gampaha",
  "Ja-Ela",
  "Kandy",
  "Galle",
  "Jaffna",
];

export const deliveryFees: Record<string, number> = {
  "Colombo": 300,
  "Dehiwala": 300,
  "Mount Lavinia": 350,
  "Moratuwa": 350,
  "Rajagiriya": 300,
  "Battaramulla": 300,
  "Kotte": 300,
  "Nugegoda": 300,
  "Maharagama": 350,
  "default": 500,
};

export function getDeliveryFee(city: string): number {
  return deliveryFees[city] || deliveryFees.default;
}
