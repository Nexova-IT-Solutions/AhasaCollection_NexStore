"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header, Footer, CartDrawer } from "@/components/giftbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/components/CurrencyProvider";
import useSWR from "swr";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useCartStore } from "@/store";
import { useBoxBuilderStore } from "@/store";
import { toast } from "sonner";
import { GiftCardInput } from "@/components/checkout/GiftCardInput";
import { PackagingSelection } from "@/components/checkout/PackagingSelection";
import { PaymentOptionsRenderer } from "@/components/checkout/PaymentOptionsRenderer";
import { CitySearch } from "@/components/checkout/city-search";
import { paymentMethods, sriLankanCities } from "@/data";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CreditCard,
  Landmark,
  Building2,
  Banknote,
  Truck,
  Shield,
  Sparkles,
  Check,
  AlertCircle,
  Gift,
  Trash2,
  Minus,
  Plus,
  Tag,
  CalendarIcon,
  UserRound,
  Mail,
  Info,
  Loader2,
  CheckCircle2
} from "lucide-react";

const REQUIRED_FIELD_MESSAGE = "This field is required.";
const PHONE_REGEX = /^(?:0|\+94)[0-9]{9}$/;
const INVALID_PHONE_MESSAGE = "Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94771234567)";

const checkoutSchema = z.object({
  addressLine1: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
  city: z.string().trim().optional(),
  paymentMethod: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
});

interface ShippingConfig {
  id: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  isFreeDeliveryEnabled: boolean;
  expressDeliveryFee: number;
  isDeliveryEnabled: boolean;
  deliveryNote?: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName?: string | null;
  instructions?: string | null;
  isActive: boolean;
}

interface GiftWrapOption {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isByob = mounted && typeof window !== "undefined"
    ? window.location.search.includes("byob=1")
    : false;

  const { data: session, status } = useSession();
  const { items, getSubtotal, getTotalSaved, appliedGiftCard, recalculateGiftCardDeduction, selectedPackaging, setPackaging, syncPrices, removeItem, updateQuantity } = useCartStore();
  // BYOB store
  const {
    addedItems: byobItems,
    message: byobMessage,
    selectedWrapping: byobWrapping,
    reset: resetByob,
    getTotal: getByobTotal,
  } = useBoxBuilderStore();
  const { toast: shadcnToast } = useToast();

  // Cart Price Validation
  useEffect(() => {
    const validateCart = async () => {
      if (items.length === 0) return;

      try {
        const payload = items.map(item => ({
          id: item.product?.id || item.giftBox?.id || item.id,
          type: item.type
        }));

        const res = await fetch("/api/v1/cart/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: payload })
        });

        if (res.ok) {
          const { data } = await res.json();
          const { pricesChanged, itemsRemoved } = syncPrices(data);

          if (itemsRemoved) {
            toast.error("Item Removed", {
              description: "An item in your box is no longer available and has been removed.",
            });
          }

          if (pricesChanged) {
            toast.warning("Cart Updated", {
              description: "The price of one or more items in your gift box has changed. Your total has been recalculated.",
            });
          }
        }
      } catch (error) {
        console.error("Cart validation error:", error);
      }
    };

    validateCart();
  }, []); // Run on mount

  const byobItemsSubtotal = useMemo(() => {
    return byobItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }, [byobItems]);

  const subtotal = isByob ? byobItemsSubtotal : getSubtotal();
  const totalSaved = isByob ? 0 : getTotalSaved();

  // Shipping config state
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Form fields
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [contactName, setContactName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isGift, setIsGift] = useState(false); // BYOB orders are always gifts
  const [initializedByob, setInitializedByob] = useState(false);

  // Billing address state fields
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingContactName, setBillingContactName] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [billingAddressLine1, setBillingAddressLine1] = useState("");
  const [billingAddressLine2, setBillingAddressLine2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingProvince, setBillingProvince] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");

  useEffect(() => {
    if (isByob && !initializedByob) {
      setIsGift(true);
      setGiftMessage(byobMessage || "");
      setSelectedWrapId(byobWrapping?.id || "");
      setInitializedByob(true);
    }
  }, [isByob, byobMessage, byobWrapping, initializedByob]);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAddressLine1, setSenderAddressLine1] = useState("");
  const [senderAddressLine2, setSenderAddressLine2] = useState("");
  const [senderCity, setSenderCity] = useState("");
  const [senderProvince, setSenderProvince] = useState("");
  const [senderPostalCode, setSenderPostalCode] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [selectedWrapId, setSelectedWrapId] = useState("");
  const [wrapOptions, setWrapOptions] = useState<GiftWrapOption[]>([]);
  const [revealSender, setRevealSender] = useState(true);
  const [suppressInvoice, setSuppressInvoice] = useState(false);
  const [paymentGateways, setPaymentGateways] = useState<any[]>([]);
  const [shippingCities, setShippingCities] = useState<any[]>([]);
  const [selectedCityFee, setSelectedCityFee] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState("COD");
  const [isProcessing, setIsProcessing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState<Date | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<{ name?: string; phone?: string; defaultShippingAddress?: any } | null>(null);
  const [saveDefaultAddress, setSaveDefaultAddress] = useState(false);
  // For BYOB: isDigitalOnly is always false (physical box)
  const [isDigitalOnly, setIsDigitalOnly] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Update isDigitalOnly state when items change — only for non-BYOB flows
  useEffect(() => {
    if (isByob) return;
    setIsDigitalOnly(items.length > 0 && items.every(item => item.isDigital || item.type === "giftcard" || item.product?.isEGiftCard));
  }, [items, isByob]);

  const hasEGiftCard = useMemo(() => {
    return items.some(item => item.product?.isEGiftCard || item.type === "giftcard");
  }, [items]);

  // Reset COD for digital items
  useEffect(() => {
    if (isDigitalOnly && selectedPayment === "COD") {
      setSelectedPayment("DIRECTPAY");
    }
  }, [isDigitalOnly, selectedPayment]);

  // Fetch shipping config and payment methods on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoadingConfig(true);
        const [shippingResponse, wrapsResponse, gatewaysResponse, citiesResponse, bankAccountsResponse] = await Promise.all([
          fetch("/api/shipping-config"),
          fetch("/api/wrappings"),
          fetch("/api/payment-gateways"),
          fetch("/api/shipping-cities"),
          fetch("/api/bank-accounts"),
        ]);

        const data = await shippingResponse.json();
        if (data.success && data.data) {
          setShippingConfig(data.data);
        }

        const wrapsData = await wrapsResponse.json();
        if (wrapsData.success && Array.isArray(wrapsData.data)) {
          setWrapOptions(wrapsData.data);
        }

        const gatewaysData = await gatewaysResponse.json();
        if (gatewaysData.success && Array.isArray(gatewaysData.data)) {
          setPaymentGateways(gatewaysData.data);
          // Set default payment to the first active gateway if COD is not available
          const hasCOD = gatewaysData.data.some((g: any) => g.name === "COD");
          if (!hasCOD && gatewaysData.data.length > 0) {
            setSelectedPayment(gatewaysData.data[0].name);
          }
        }

        const citiesData = await citiesResponse.json();
        if (citiesData.success && Array.isArray(citiesData.data)) {
          setShippingCities(citiesData.data);
        }

        const banksData = await bankAccountsResponse.json();
        if (banksData.success && Array.isArray(banksData.data)) {
          setBankAccounts(banksData.data);
          // Task 1: Auto-select if only one account
          if (banksData.data.length === 1) {
            setSelectedBankId(banksData.data[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching checkout config:", error);
        shadcnToast({
          title: "Error",
          description: "Failed to load checkout configuration",
          variant: "destructive",
        });
      } finally {
        setIsLoadingConfig(false);
      }
    };

    fetchConfig();
  }, [shadcnToast]);

  // Task 3: Fetch Bank Accounts when BANK_TRANSFER is selected (Fallback if not already fetched or to refresh)
  useEffect(() => {
    if (selectedPayment === "BANK_TRANSFER" && bankAccounts.length === 0) {
      const fetchBanks = async () => {
        try {
          setIsLoadingBanks(true);
          setBankError(null);
          const res = await fetch("/api/bank-accounts");
          const data = await res.json();

          if (data.success && Array.isArray(data.data)) {
            if (data.data.length === 0) {
              setBankError("No active bank accounts found. Please choose another payment method.");
            } else {
              setBankAccounts(data.data);
              // Task 1: Auto-select first account
              if (data.data.length > 0) {
                setSelectedBankId(data.data[0].id);
              }
            }
          } else {
            throw new Error("Failed to fetch bank accounts");
          }
        } catch (error) {
          setBankError("Could not load bank details. Please try again or use another method.");
        } finally {
          setIsLoadingBanks(false);
        }
      };
      fetchBanks();
    }
  }, [selectedPayment, bankAccounts.length]);

  // Fetch user profile/addresses
  useEffect(() => {
    const fetchProfile = async () => {
      if (status !== "authenticated") return;
      try {
        const res = await fetch("/api/addresses");
        if (res.ok) {
          const addresses = await res.json();
          const defaultAddress = Array.isArray(addresses) ? addresses.find((a: any) => a.isDefault) : null;

          const profile = {
            name: session?.user?.name || "",
            phone: (session?.user as any)?.phone || "",
            defaultShippingAddress: defaultAddress
          };
          setUserProfile(profile);

          // Initial prefill
          if (!isGift) {
            setContactName(profile.name);
            setCustomerPhone(profile.phone);
            setBillingContactName(profile.name);
            setBillingPhone(profile.phone);
            if (defaultAddress) {
              setAddressLine1(defaultAddress.addressLine1 || "");
              setAddressLine2(defaultAddress.addressLine2 || "");
              setCity(defaultAddress.city || "");
              setProvince(defaultAddress.province || "");
              setPostalCode(defaultAddress.postalCode || "");
              
              setBillingAddressLine1(defaultAddress.addressLine1 || "");
              setBillingAddressLine2(defaultAddress.addressLine2 || "");
              setBillingCity(defaultAddress.city || "");
              setBillingProvince(defaultAddress.province || "");
              setBillingPostalCode(defaultAddress.postalCode || "");
              setSaveDefaultAddress(false);
            } else {
              setSaveDefaultAddress(true);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching addresses:", error);
      }
    };

    fetchProfile();
  }, [status, session]);

  // Handle Gift Toggle Prefill
  useEffect(() => {
    if (!userProfile) return;

    if (isGift) {
      // SCENARIO B: IS A GIFT
      // SENDER PREFILL: From user profile
      setSenderName(userProfile.name || "");
      setSenderPhone(userProfile.phone || "");
      if (userProfile.defaultShippingAddress) {
        const addr = userProfile.defaultShippingAddress;
        setSenderAddressLine1(addr.addressLine1 || "");
        setSenderAddressLine2(addr.addressLine2 || "");
        setSenderCity(addr.city || "");
        setSenderProvince(addr.province || "");
        setSenderPostalCode(addr.postalCode || "");
      }

      // RECIPIENT PREFILL: BLANK
      setRecipientName("");
      setRecipientEmail("");
      setRecipientPhone("");
      setAddressLine1("");
      setAddressLine2("");
      setCity("");
      setProvince("");
      setPostalCode("");

      setSaveDefaultAddress(false);
    } else {
      // SCENARIO A: NOT A GIFT
      setContactName(userProfile.name || "");
      setCustomerPhone(userProfile.phone || "");
      setBillingContactName(userProfile.name || "");
      setBillingPhone(userProfile.phone || "");

      // Reset Packaging to Standard when gift is disabled
      const standardPackaging = (useCartStore.getState() as any).PACKAGING_OPTIONS?.find((p: any) => p.id === "standard");
      if (standardPackaging) setPackaging(standardPackaging);

      // Prefill Delivery Address with user default
      if (userProfile.defaultShippingAddress) {
        const addr = userProfile.defaultShippingAddress;
        setAddressLine1(addr.addressLine1 || "");
        setAddressLine2(addr.addressLine2 || "");
        setCity(addr.city || "");
        setProvince(addr.province || "");
        setPostalCode(addr.postalCode || "");

        setBillingAddressLine1(addr.addressLine1 || "");
        setBillingAddressLine2(addr.addressLine2 || "");
        setBillingCity(addr.city || "");
        setBillingProvince(addr.province || "");
        setBillingPostalCode(addr.postalCode || "");
        setSaveDefaultAddress(false);
      } else {
        setSaveDefaultAddress(true);
      }
    }
  }, [isGift, userProfile, setPackaging]);

  // Calculate delivery fee and totals
  const deliveryFee = useMemo(() => {
    if (isDigitalOnly) return 0;
    if (!shippingConfig || !city) return 0;
    if (shippingConfig.isFreeDeliveryEnabled && subtotal >= shippingConfig.freeDeliveryThreshold) return 0;

    // Check if selected city has a specific fee
    if (selectedCityFee !== null) return selectedCityFee;

    const cityConfig = shippingCities.find(c => c.name === city);
    return cityConfig ? cityConfig.fee : shippingConfig.deliveryFee;
  }, [subtotal, city, shippingConfig, shippingCities, isDigitalOnly, selectedCityFee]);

  const selectedWrap = wrapOptions.find((wrap) => wrap.id === selectedWrapId) ||
    (isByob && byobWrapping && selectedWrapId === byobWrapping.id
      ? {
        id: byobWrapping.id,
        price: byobWrapping.price,
        name: byobWrapping.name,
        imageUrl: (byobWrapping as any).imageUrl || byobWrapping.image || ""
      }
      : null);
  const wrappingFee = isGift && selectedWrap && !isDigitalOnly ? selectedWrap.price : 0;

  const selectedGateway = paymentGateways.find(g => g.name === selectedPayment);
  // paymentFee base = what the gateway actually processes = amount after gift card reduction.
  // We derive this iteratively: start with subtotal+delivery+wrap, then compute GC deduction,
  // then apply the fee on the remainder. On the first render payableBeforeFee is a reasonable
  // approximation; the useEffect below keeps it accurate as state settles.
  const preFeePayable = subtotal + deliveryFee + wrappingFee;
  const estimatedGcDeduction = appliedGiftCard
    ? Math.min(preFeePayable, appliedGiftCard.balance)
    : 0;
  const paymentFeeBase = Math.max(0, preFeePayable - estimatedGcDeduction);
  const paymentFee = selectedGateway
    ? selectedGateway.feeType === "PERCENTAGE"
      ? paymentFeeBase * (selectedGateway.feeValue / 100)
      : selectedGateway.feeType === "FIXED"
        ? selectedGateway.feeValue
        : 0
    : 0;

  // Grand Total before any gift card discount
  const totalBeforeGiftCard = subtotal + deliveryFee + wrappingFee + paymentFee;

  // extraFees = everything the gift card discount applies on top of subtotal
  const extraFees = deliveryFee + wrappingFee + paymentFee;

  // Re-sync deduction whenever any input to the total changes
  useEffect(() => {
    recalculateGiftCardDeduction(extraFees);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, deliveryFee, wrappingFee, paymentFee]);

  // Formula: Grand Total = Max(0, TotalBeforeGiftCard - GiftCardDeduction)
  const giftCardDeduction = appliedGiftCard
    ? Math.min(totalBeforeGiftCard, appliedGiftCard.balance)
    : 0;
  const payableRemaining = Math.max(0, totalBeforeGiftCard - giftCardDeduction);

  // Calculate free delivery nudge
  const remainingForFreeDelivery = shippingConfig?.isFreeDeliveryEnabled && subtotal < shippingConfig.freeDeliveryThreshold
    ? Math.ceil(shippingConfig.freeDeliveryThreshold - subtotal)
    : null;

  const { formatPrice } = useCurrency();
  const { data: toggles } = useSWR<Record<string, boolean>>("/api/admin/feature-toggles");
  const isGiftcardsEnabled = toggles?.storefront_giftcards !== false;

  const getItemName = (item: typeof items[0]) => {
    if (item.type === "product") return item.product?.name;
    if (item.type === "giftbox") return item.giftBox?.name;
    if (item.type === "giftcard") return `Digital Gift Card - ${formatPrice(item.virtualGiftCard?.initialValue || 0)}`;
    return "Custom Gift Box";
  };

  const getItemImage = (item: typeof items[0]) => {
    if (item.type === "product") return item.product?.images[0];
    if (item.type === "giftbox") return item.giftBox?.images[0];
    if (item.type === "giftcard") return "/images/giftcard-placeholder.png";
    return "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=100&h=100&fit=crop";
  };

  const getPaymentIcon = (icon: string) => {
    switch (icon) {
      case "credit-card":
        return <CreditCard className="w-5 h-5" />;
      case "building":
        return <Building2 className="w-5 h-5" />;
      default:
        return <Banknote className="w-5 h-5" />;
    }
  };

  const handlePlaceOrder = async () => {
    setFieldErrors({});

    // Validate form
    const parsed = checkoutSchema.safeParse({
      addressLine1: isDigitalOnly ? "Digital Delivery" : addressLine1,
      city: isDigitalOnly ? "Digital" : city,
      paymentMethod: selectedPayment,
    });

    if (!parsed.success) {
      const nextErrors: Partial<Record<string, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }

    const nextErrors: Partial<Record<string, string>> = {};

    if (isGift) {
      if (!recipientName.trim()) nextErrors.recipientName = REQUIRED_FIELD_MESSAGE;
      if (!recipientPhone.trim()) {
        nextErrors.recipientPhone = REQUIRED_FIELD_MESSAGE;
      } else if (!PHONE_REGEX.test(recipientPhone)) {
        nextErrors.recipientPhone = INVALID_PHONE_MESSAGE;
      }

      if (hasEGiftCard && !recipientEmail.trim()) nextErrors.recipientEmail = REQUIRED_FIELD_MESSAGE;
      if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        nextErrors.recipientEmail = "Please enter a valid email address.";
      }

      if (!senderName.trim()) nextErrors.senderName = REQUIRED_FIELD_MESSAGE;
      if (!senderPhone.trim()) {
        nextErrors.senderPhone = REQUIRED_FIELD_MESSAGE;
      } else if (!PHONE_REGEX.test(senderPhone)) {
        nextErrors.senderPhone = INVALID_PHONE_MESSAGE;
      }

      if (!isDigitalOnly) {
        if (!senderAddressLine1.trim()) nextErrors.senderAddressLine1 = REQUIRED_FIELD_MESSAGE;
        if (!senderCity.trim()) nextErrors.senderCity = REQUIRED_FIELD_MESSAGE;
      }
    } else {
      if (!contactName.trim()) nextErrors.contactName = REQUIRED_FIELD_MESSAGE;
      if (!customerPhone.trim()) {
        nextErrors.customerPhone = REQUIRED_FIELD_MESSAGE;
      } else if (!PHONE_REGEX.test(customerPhone)) {
        nextErrors.customerPhone = INVALID_PHONE_MESSAGE;
      }

      // Billing Address Validation
      if (isDigitalOnly || !billingSameAsShipping) {
        if (!billingContactName.trim()) nextErrors.billingContactName = REQUIRED_FIELD_MESSAGE;
        if (!billingPhone.trim()) {
          nextErrors.billingPhone = REQUIRED_FIELD_MESSAGE;
        } else if (!PHONE_REGEX.test(billingPhone)) {
          nextErrors.billingPhone = INVALID_PHONE_MESSAGE;
        }
        if (!billingAddressLine1.trim()) nextErrors.billingAddressLine1 = REQUIRED_FIELD_MESSAGE;
        if (!billingCity.trim()) nextErrors.billingCity = REQUIRED_FIELD_MESSAGE;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);

      // Auto-scroll and focus the first invalid field
      const firstErrorFieldId = Object.keys(nextErrors)[0];
      setTimeout(() => {
        const element = document.getElementById(firstErrorFieldId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }, 100);

      return;
    }

    // Check if delivery is enabled
    if (!isDigitalOnly && !shippingConfig?.isDeliveryEnabled) {
      shadcnToast({
        title: "Error",
        description: "Delivery is currently disabled",
        variant: "destructive",
      });
      return;
    }

    if (selectedPayment === "BANK_TRANSFER" && !selectedBankId) {
      shadcnToast({
        title: "Selection Required",
        description: "Please select a bank account to proceed with your transfer.",
        variant: "destructive",
      });
      return;
    }

    // BYOB checkout path — wrapped in its own try/finally for processing state
    if (isByob) {
      if (byobItems.length === 0) {
        shadcnToast({ title: "Empty Box", description: "Your gift box has no items.", variant: "destructive" });
        return;
      }

      setIsProcessing(true);
      try {
        const byobPayload = {
          orderType: "CUSTOM_GIFT_BOX",
          isGift: true,
          requestedDeliveryDate: requestedDeliveryDate ? requestedDeliveryDate.toISOString() : null,
          items: byobItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            name: i.name,
            image: i.image,
            selectedSize: i.selectedSize || null,
            selectedColor: i.selectedColor || null,
          })),
          giftWrapId: selectedWrapId || undefined,
          giftMessage: giftMessage || undefined,
          shippingAddress: {
            contactName: recipientName || contactName,
            phoneNumber: recipientPhone || customerPhone,
            addressLine1: addressLine1,
            addressLine2: addressLine2 || undefined,
            city: city,
            postalCode: postalCode || undefined,
          },
          billingAddress: {
            contactName: senderName || contactName,
            phoneNumber: senderPhone || customerPhone,
            addressLine1: senderAddressLine1 || addressLine1,
            addressLine2: senderAddressLine2 || undefined,
            city: senderCity || city,
            postalCode: senderPostalCode || undefined,
          },
          customerPhone: senderPhone || customerPhone,
          sender: { name: senderName, phone: senderPhone },
          recipient: { name: recipientName, phone: recipientPhone },
          revealSender,
          suppressInvoice,
          paymentMethod: selectedPayment as "COD" | "DIRECTPAY" | "MINTPAY" | "BANK_TRANSFER",
          bankAccountId: selectedPayment === "BANK_TRANSFER" ? selectedBankId : undefined,
          saveAddress: saveDefaultAddress,
        };

        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(byobPayload),
        });

        const data = await response.json();
        if (!response.ok) {
          shadcnToast({ title: "Order Failed", description: data.message || "Failed to place order", variant: "destructive" });
          return;
        }

        // Reset BYOB builder state after successful order
        resetByob();
        router.push(`/${locale}/checkout/success/${data.orderId}`);
      } catch (err) {
        console.error("[BYOB checkout] Error:", err);
        shadcnToast({ title: "Error", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // ─── Standard cart checkout path ─────────────────────────────────────────
    try {
      setIsProcessing(true);

      const normalizedItems = items
        .map((item) => {
          const productId = item.product?.id || item.giftBox?.id || (item as any).productId || (item as any).id;
          if (!productId) return null;
          return {
            productId,
            quantity: item.quantity,
            price: item.quantity > 0 ? item.subtotal / item.quantity : item.subtotal,
            discountId: (item as any).discountId || undefined,
            type: item.type,
            isDigital: item.isDigital || item.type === "giftcard",
            virtualGiftCard: item.virtualGiftCard,
            variantId: item.selectedVariant?.id,
          };
        })
        .filter(Boolean) as Array<{ productId: string; quantity: number; price: number; discountId?: string; variantId?: string }>;

      if (normalizedItems.length === 0) {
        shadcnToast({
          title: "Invalid cart",
          description: "Invalid cart items: Missing Product IDs",
          variant: "destructive",
        });
        return;
      }

      if (normalizedItems.length !== items.length) {
        shadcnToast({
          title: "Invalid cart",
          description: "Some cart items could not be processed. Please review your cart and try again.",
          variant: "destructive",
        });
        return;
      }

      const checkoutPayload = {
        items: normalizedItems,
        requestedDeliveryDate: requestedDeliveryDate ? requestedDeliveryDate.toISOString() : null,
        shippingAddress: {
          contactName: isGift ? recipientName : contactName,
          phoneNumber: isGift ? recipientPhone : customerPhone,
          addressLine1: isDigitalOnly ? "Digital Delivery" : addressLine1,
          addressLine2: isDigitalOnly ? undefined : (addressLine2 || undefined),
          city: isDigitalOnly ? "Digital" : city,
          province: isDigitalOnly ? "Digital" : province,
          postalCode: isDigitalOnly ? undefined : (postalCode || undefined),
        },
        billingAddress: {
          contactName: isGift ? senderName : (isDigitalOnly || !billingSameAsShipping ? billingContactName : contactName),
          phoneNumber: isGift ? senderPhone : (isDigitalOnly || !billingSameAsShipping ? billingPhone : customerPhone),
          addressLine1: isDigitalOnly ? (isGift ? "Digital Delivery" : billingAddressLine1) : (isGift ? senderAddressLine1 : (billingSameAsShipping ? addressLine1 : billingAddressLine1)),
          addressLine2: isDigitalOnly ? undefined : (isGift ? senderAddressLine2 : (billingSameAsShipping ? addressLine2 : billingAddressLine2)) || undefined,
          city: isDigitalOnly ? (isGift ? "Digital" : billingCity) : (isGift ? senderCity : (billingSameAsShipping ? city : billingCity)),
          province: isDigitalOnly ? (isGift ? "Digital" : billingProvince) : (isGift ? senderProvince : (billingSameAsShipping ? province : billingProvince)),
          postalCode: isDigitalOnly ? undefined : (isGift ? senderPostalCode : (billingSameAsShipping ? postalCode : billingPostalCode)) || undefined,
        },
        customerPhone: isGift ? senderPhone : customerPhone,
        isGift,
        giftMessage: isGift ? giftMessage : undefined,
        giftWrapId: isGift && selectedWrapId ? selectedWrapId : undefined,
        sender: isGift ? { name: senderName, phone: senderPhone } : undefined,
        recipient: (isGift || hasEGiftCard) ? {
          name: recipientName,
          phone: recipientPhone,
          email: recipientEmail
        } : undefined,
        revealSender,
        suppressInvoice,
        paymentMethod: payableRemaining <= 0 ? "GIFT_CARD" : selectedPayment as "COD" | "DIRECTPAY" | "MINTPAY" | "BANK_TRANSFER",
        appliedGiftCardId: appliedGiftCard?.cardId || undefined,
        packagingId: selectedPackaging.id,
        saveAddress: saveDefaultAddress,
        bankAccountId: selectedPayment === "BANK_TRANSFER" ? selectedBankId : undefined,
      };

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        shadcnToast({
          title: "Error",
          description: data.message || "Failed to place order",
          variant: "destructive",
        });
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        router.push(`/${locale}/checkout/success/${data.orderId}`);
      }
    } catch (error) {
      console.error("Error placing order:", error);
      shadcnToast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    router.push(`/${locale}/sign-in?callbackUrl=/${locale}/checkout`);
    return null;
  }

  // For BYOB flow: cart is intentionally empty — only show empty state for regular cart users
  if (!isByob && items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <CartDrawer />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#1F1720]">Your Cart is Empty</h1>
            <p className="text-[#6B5A64] mt-2">Add some items to checkout</p>
            <Button asChild className="mt-4 bg-[#A7066A]">
              <Link href="/">Continue Shopping</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />

      <main className="flex-1">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 py-6">
          {/* Back Button */}
          <Link href="/" className="inline-flex items-center gap-2 text-[#6B5A64] hover:text-[#A7066A] mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Shopping
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F1720] mb-6">Checkout</h1>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Packaging Selection - ONLY for Gifts */}
              {isGift && !isDigitalOnly && <PackagingSelection />}

              {/* Delivery Status Alert */}
              {!isDigitalOnly && isLoadingConfig ? (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <p className="text-blue-800">Loading shipping configuration...</p>
                  </CardContent>
                </Card>
              ) : !isDigitalOnly && !shippingConfig?.isDeliveryEnabled && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="flex gap-3 items-start pt-6">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800">Delivery is currently disabled. Please try again later.</p>
                  </CardContent>
                </Card>
              )}

              {/* Contact Information */}
              <Card className="border-brand-border">
                <CardHeader>
                  <CardTitle className="text-lg text-[#1F1720]">Checkout Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isByob && (
                    <div className="mb-2 flex items-center gap-2 rounded-xl border border-[#A7066A]/30 bg-[#FCEAF4]/60 p-3">
                      <Gift className="w-4 h-4 text-[#A7066A] shrink-0" />
                      <p className="text-sm text-[#A7066A] font-semibold">Completing your Build-Your-Own Gift Box order</p>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 rounded-xl border border-brand-border p-3">
                    <Checkbox
                      id="isGift"
                      checked={isByob ? true : isGift}
                      disabled={isByob}
                      onCheckedChange={(checked) => !isByob && setIsGift(checked as boolean)}
                    />
                    <Label htmlFor="isGift" className="font-normal">
                      This order is a gift{isByob ? <span className="ml-2 text-xs text-[#A7066A] font-bold">(Box Builder Order)</span> : ""}
                    </Label>
                  </div>

                  {!isGift && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="contactName" required>Your Name</Label>
                        <Input
                          id="contactName"
                          value={contactName}
                          onChange={(e) => {
                            setContactName(e.target.value);
                          }}
                          placeholder="Your full name"
                          className={`border-brand-border ${fieldErrors.contactName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        />
                        {fieldErrors.contactName && <p className="text-sm text-destructive pointer-events-none">{fieldErrors.contactName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerPhone" required>Contact Phone Number</Label>
                        <Input
                          id="customerPhone"
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => {
                            const numericValue = e.target.value.replace(/[^0-9+]/g, '');
                            setCustomerPhone(numericValue);
                          }}
                          placeholder="+94 XX XXX XXXX"
                          className={`border-brand-border ${fieldErrors.customerPhone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        />
                        {fieldErrors.customerPhone && <p className="text-sm text-destructive pointer-events-none">{fieldErrors.customerPhone}</p>}
                      </div>
                    </div>
                  )}

                  {!isGift && hasEGiftCard && (
                    <div className="pt-4 border-t border-brand-border space-y-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#A7066A] uppercase tracking-wider">
                        <Mail className="size-4" />
                        E-Gift Card Delivery
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recipientEmail" required>Recipient Email</Label>
                        <Input
                          id="recipientEmail"
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="Where should we send the gift card?"
                          className={`border-brand-border ${fieldErrors.recipientEmail ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        />
                        {fieldErrors.recipientEmail && <p className="text-sm text-destructive pointer-events-none">{fieldErrors.recipientEmail}</p>}
                        <p className="text-xs text-[#6B5A64]">The e-gift card voucher code will be sent to this email address immediately after payment.</p>
                      </div>
                    </div>
                  )}

                  {isGift && (
                    <div className="space-y-6">
                      {/* Sender Section */}
                      <div className="space-y-4 rounded-xl border border-brand-border p-5 bg-slate-50/50">
                        <p className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-widest"><Gift className="size-4 text-[#A7066A]" />Sender Details & Address</p>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="senderName" required>Sender Name</Label>
                            <Input id="senderName" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Your name" className={`bg-white ${fieldErrors.senderName ? "border-red-500 focus-visible:ring-red-500" : ""}`} />
                            {fieldErrors.senderName && <p className="text-sm text-destructive font-bold pointer-events-none">{fieldErrors.senderName}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="senderPhone" required>Sender Phone</Label>
                            <Input
                              id="senderPhone"
                              type="tel"
                              value={senderPhone}
                              onChange={(e) => {
                                const numericValue = e.target.value.replace(/[^0-9+]/g, '');
                                setSenderPhone(numericValue);
                              }}
                              placeholder="+94 XX XXX XXXX"
                              className={`bg-white ${fieldErrors.senderPhone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                            />
                            {fieldErrors.senderPhone && <p className="text-sm text-destructive font-bold pointer-events-none">{fieldErrors.senderPhone}</p>}
                          </div>
                        </div>

                        {!isDigitalOnly && (
                          <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                              <Label htmlFor="senderAddressLine1" required>Sender Address</Label>
                              <Textarea id="senderAddressLine1" value={senderAddressLine1} onChange={(e) => setSenderAddressLine1(e.target.value)} placeholder="Your full address..." className={`bg-white min-h-[80px] ${fieldErrors.senderAddressLine1 ? "border-red-500 focus-visible:ring-red-500" : ""}`} />
                              {fieldErrors.senderAddressLine1 && <p className="text-sm text-destructive font-bold pointer-events-none">{fieldErrors.senderAddressLine1}</p>}
                            </div>
                             <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="senderCity" required>City</Label>
                                <CitySearch
                                  id="senderCity"
                                  value={senderCity}
                                  onChange={(cityName, provinceName) => {
                                    setSenderCity(cityName);
                                    setSenderProvince(provinceName);
                                  }}
                                  error={fieldErrors.senderCity}
                                  placeholder="Type to search city..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="senderPostalCode">Postal Code</Label>
                                <Input id="senderPostalCode" value={senderPostalCode} onChange={(e) => setSenderPostalCode(e.target.value)} placeholder="00000" className="bg-white" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Recipient Section */}
                      <div className="space-y-4 rounded-xl border border-brand-border p-5">
                        <p className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-widest"><UserRound className="size-4 text-[#A7066A]" />Recipient / Delivery Address</p>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="recipientName" required>Recipient Name</Label>
                            <Input id="recipientName" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Who receives this gift?" className={`${fieldErrors.recipientName ? "border-red-500 focus-visible:ring-red-500" : ""}`} />
                            {fieldErrors.recipientName && <p className="text-sm text-destructive font-bold pointer-events-none">{fieldErrors.recipientName}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="recipientPhone" required>Recipient Phone</Label>
                            <Input
                              id="recipientPhone"
                              type="tel"
                              value={recipientPhone}
                              onChange={(e) => {
                                const numericValue = e.target.value.replace(/[^0-9+]/g, '');
                                setRecipientPhone(numericValue);
                              }}
                              placeholder="+94 XX XXX XXXX"
                              className={`${fieldErrors.recipientPhone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                            />
                            {fieldErrors.recipientPhone && <p className="text-sm text-destructive font-bold pointer-events-none">{fieldErrors.recipientPhone}</p>}
                          </div>
                          {hasEGiftCard && (
                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor="recipientEmail" required>Recipient Email (for E-Gift Card)</Label>
                              <Input
                                id="recipientEmail"
                                type="email"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                placeholder="recipient@example.com"
                                className={`${fieldErrors.recipientEmail ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                              />
                              {fieldErrors.recipientEmail && <p className="text-sm text-destructive font-bold pointer-events-none">{fieldErrors.recipientEmail}</p>}
                              <p className="text-xs text-[#6B5A64]">Required for e-gift card delivery.</p>
                            </div>
                          )}
                        </div>

                        {!isDigitalOnly && (
                          <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                              <Label htmlFor="addressLine1" required>Delivery Address</Label>
                              <Textarea id="addressLine1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Recipient's street address..." className={`min-h-[80px] ${fieldErrors.addressLine1 ? "border-red-500 focus-visible:ring-red-500" : ""}`} />
                              {fieldErrors.addressLine1 && <p className="text-sm text-destructive font-bold pointer-events-none">{fieldErrors.addressLine1}</p>}
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4 hidden">
                              <div className="space-y-2">
                                <Label htmlFor="city" required>City</Label>
                                <CitySearch
                                  id="city"
                                  value={city}
                                  onChange={(cityName, provinceName, fee) => {
                                    setCity(cityName);
                                    setProvince(provinceName);
                                    setSelectedCityFee(fee);
                                  }}
                                  error={fieldErrors.city}
                                  placeholder="Type to search city..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="postalCode">Postal Code</Label>
                                <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="00000" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Delivery Address - ONLY for Non-Gifts */}
              {!isGift && !isDigitalOnly && (
                <Card className="border-brand-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#1F1720]">Delivery Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="addressLine1" required>Address Line 1</Label>
                      <Textarea
                        id="addressLine1"
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        placeholder="Street address, apartment, building name..."
                        className={`border-brand-border min-h-[80px] ${fieldErrors.addressLine1 ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      />
                      {fieldErrors.addressLine1 && <p className="text-sm text-destructive pointer-events-none">{fieldErrors.addressLine1}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                      <Input
                        id="addressLine2"
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                        placeholder="Additional address details"
                        className="border-brand-border"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 hidden">
                      <div className="space-y-2">
                        <Label htmlFor="city" required>City</Label>
                        <CitySearch
                          id="city"
                          value={city}
                          onChange={(cityName, provinceName, fee) => {
                            setCity(cityName);
                            setProvince(provinceName);
                            setSelectedCityFee(fee);
                          }}
                          error={fieldErrors.city}
                          placeholder="Type to search city..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code (Optional)</Label>
                        <Input
                          id="postalCode"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="00000"
                          className="border-brand-border"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-50">
                      <Checkbox
                        id="saveAddress"
                        checked={saveDefaultAddress}
                        onCheckedChange={(checked) => setSaveDefaultAddress(checked as boolean)}
                      />
                      <Label htmlFor="saveAddress" className="text-xs text-slate-500 font-medium">
                        Save this as my default shipping address
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Billing Address Section */}
              {!isGift && (
                <div className="space-y-4">
                  {!isDigitalOnly && (
                    <div className="flex items-center space-x-2 rounded-xl border border-brand-border p-4 bg-white shadow-sm">
                      <Checkbox
                        id="billingSameAsShipping"
                        checked={billingSameAsShipping}
                        onCheckedChange={(checked) => setBillingSameAsShipping(checked as boolean)}
                      />
                      <Label htmlFor="billingSameAsShipping" className="font-medium cursor-pointer text-sm text-[#1F1720]">
                        Billing address is the same as shipping address
                      </Label>
                    </div>
                  )}

                  {/* Billing Address Card */}
                  {(isDigitalOnly || !billingSameAsShipping) && (
                    <Card className="border-brand-border animate-in fade-in slide-in-from-top-2 duration-300">
                      <CardHeader>
                        <CardTitle className="text-lg text-[#1F1720]">Billing Address</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="billingContactName" required>Billing Contact Name</Label>
                            <Input
                              id="billingContactName"
                              value={billingContactName}
                              onChange={(e) => setBillingContactName(e.target.value)}
                              placeholder="Full name for billing"
                              className={`border-brand-border ${fieldErrors.billingContactName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                            />
                            {fieldErrors.billingContactName && <p className="text-sm text-destructive pointer-events-none">{fieldErrors.billingContactName}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="billingPhone" required>Billing Phone Number</Label>
                            <Input
                              id="billingPhone"
                              type="tel"
                              value={billingPhone}
                              onChange={(e) => {
                                const numericValue = e.target.value.replace(/[^0-9+]/g, '');
                                setBillingPhone(numericValue);
                              }}
                              placeholder="+94 XX XXX XXXX"
                              className={`border-brand-border ${fieldErrors.billingPhone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                            />
                            {fieldErrors.billingPhone && <p className="text-sm text-destructive pointer-events-none">{fieldErrors.billingPhone}</p>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="billingAddressLine1" required>Address Line 1</Label>
                          <Textarea
                            id="billingAddressLine1"
                            value={billingAddressLine1}
                            onChange={(e) => setBillingAddressLine1(e.target.value)}
                            placeholder="Street address, apartment, building name..."
                            className={`border-brand-border min-h-[80px] ${fieldErrors.billingAddressLine1 ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          />
                          {fieldErrors.billingAddressLine1 && <p className="text-sm text-destructive pointer-events-none">{fieldErrors.billingAddressLine1}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="billingAddressLine2">Address Line 2 (Optional)</Label>
                          <Input
                            id="billingAddressLine2"
                            value={billingAddressLine2}
                            onChange={(e) => setBillingAddressLine2(e.target.value)}
                            placeholder="Additional address details"
                            className="border-brand-border"
                          />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="billingCity" required>City</Label>
                            <CitySearch
                              id="billingCity"
                              value={billingCity}
                              onChange={(cityName, provinceName) => {
                                setBillingCity(cityName);
                                setBillingProvince(provinceName);
                              }}
                              error={fieldErrors.billingCity}
                              placeholder="Type to search city..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="billingPostalCode">Postal Code (Optional)</Label>
                            <Input
                              id="billingPostalCode"
                              value={billingPostalCode}
                              onChange={(e) => setBillingPostalCode(e.target.value)}
                              placeholder="00000"
                              className="border-brand-border"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Gift Options */}
              {!isDigitalOnly && (
                <Card className="border-brand-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#1F1720]">Gift Experience</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isGift && (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="giftMessage">Gift Message</Label>
                          <Textarea
                            id="giftMessage"
                            value={giftMessage}
                            onChange={(e) => setGiftMessage(e.target.value)}
                            placeholder="Write your personal message..."
                            className="border-brand-border min-h-[100px]"
                            maxLength={300}
                          />
                          <p className="text-xs text-[#6B5A64]">{giftMessage.length}/300 characters</p>
                        </div>

                        <div className="space-y-3">
                          <Label>Select Wrapping (Optional)</Label>
                          {wrapOptions.length === 0 ? (
                            <p className="text-sm text-[#6B5A64]">No wrapping options are active right now.</p>
                          ) : (
                            <div className="flex gap-3 overflow-x-auto pb-1">
                              {wrapOptions.map((wrap) => {
                                const selected = selectedWrapId === wrap.id;
                                return (
                                  <button
                                    key={wrap.id}
                                    type="button"
                                    onClick={() => setSelectedWrapId((current) => (current === wrap.id ? "" : wrap.id))}
                                    className={`w-52 shrink-0 rounded-xl border p-3 text-left transition-all ${selected ? "border-[#A7066A] bg-[#FCEAF4]" : "border-brand-border hover:border-[#A7066A]/50"}`}
                                  >
                                    <div className="relative mb-2 h-28 w-full overflow-hidden rounded-lg bg-[#F5F5F5]">
                                      {wrap.imageUrl ? (
                                        <Image src={wrap.imageUrl} alt={wrap.name} fill className="object-cover" />
                                      ) : (
                                        <div className="flex h-full items-center justify-center text-xs text-[#6B5A64]">No image</div>
                                      )}
                                    </div>
                                    <p className="font-medium text-[#1F1720]">{wrap.name}</p>
                                    <p className="text-sm text-[#A7066A]">{formatPrice(wrap.price)}</p>
                                    {wrap.description ? <p className="mt-1 text-xs text-[#6B5A64] line-clamp-2">{wrap.description}</p> : null}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 rounded-xl border border-brand-border p-3">
                          <label className="flex items-center gap-2 text-sm text-[#1F1720]">
                            <Checkbox checked={revealSender} onCheckedChange={(checked) => setRevealSender(checked as boolean)} />
                            Reveal sender name to recipient
                          </label>
                          <label className="flex items-center gap-2 text-sm text-[#1F1720]">
                            <Checkbox checked={suppressInvoice} onCheckedChange={(checked) => setSuppressInvoice(checked as boolean)} />
                            Do not include invoice in the box
                          </label>
                        </div>
                      </div>
                    )}

                    {!isGift ? <p className="text-sm text-[#6B5A64]">Enable gift mode to add message, sender details, and premium wrapping.</p> : null}
                  </CardContent>
                </Card>
              )}

              {!isDigitalOnly && (
                <Card className="border-brand-border hidden">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#1F1720]">Preferred Delivery Date</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="deliveryDate">Requested Delivery Date (Optional)</Label>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="deliveryDate"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal border-brand-border h-10 bg-white",
                                !requestedDeliveryDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-[#A7066A]" />
                              {requestedDeliveryDate ? format(requestedDeliveryDate, "PPP") : <span>Select a preferred delivery date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={requestedDeliveryDate}
                              onSelect={setRequestedDeliveryDate}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {requestedDeliveryDate && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="border-brand-border hover:bg-slate-50 shrink-0"
                            onClick={() => setRequestedDeliveryDate(undefined)}
                            title="Clear delivery date"
                          >
                            <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-[#6B5A64]">
                        Select an optional date if you would like us to deliver your order on a specific day.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Method */}
              <Card className="border-brand-border">
                <CardHeader>
                  <CardTitle className="text-lg text-[#1F1720]">Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label required className="mb-3 block">Select Payment Method</Label>
                  <PaymentOptionsRenderer
                    gateways={paymentGateways.filter(g => {
                      if (isDigitalOnly && g.name === "COD") return false;
                      if (g.name === "BANK_TRANSFER" && bankAccounts.length === 0) return false;
                      return true;
                    })}
                    selectedPayment={selectedPayment}
                    onSelect={setSelectedPayment}
                    formatPrice={formatPrice}
                  />

                  {/* Bank Transfer Details Section (Task 4) */}
                  {selectedPayment === "BANK_TRANSFER" && (
                    <div className="mt-4 p-5 rounded-2xl bg-brand-light/20 border border-brand-border space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      {bankAccounts.length > 1 ? (
                        <>
                          <div className="flex items-center gap-2 pb-2 border-b border-brand-border/50">
                            <Landmark className="w-5 h-5 text-[#A7066A]" />
                            <h4 className="font-bold text-[#1F1720]">Select Bank Account</h4>
                          </div>
                          <RadioGroup
                            value={selectedBankId}
                            onValueChange={setSelectedBankId}
                            className="grid gap-4 sm:grid-cols-2"
                          >
                            {bankAccounts.map((account) => {
                              const isSelected = selectedBankId === account.id;
                              return (
                                <div key={account.id} className="space-y-2">
                                  <RadioGroupItem
                                    value={account.id}
                                    id={account.id}
                                    className="sr-only"
                                  />
                                  <Label
                                    htmlFor={account.id}
                                    className={cn(
                                      "relative block p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 bg-white",
                                      isSelected
                                        ? "border-[#A7066A] shadow-md ring-2 ring-[#A7066A]/10"
                                        : "border-brand-border hover:border-[#A7066A]/30 hover:shadow-sm"
                                    )}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Building2 className={cn("w-3 h-3", isSelected ? "text-[#A7066A]" : "text-[#6B5A64]")} />
                                        <p className={cn("text-[10px] font-bold uppercase tracking-wider", isSelected ? "text-[#A7066A]" : "text-[#6B5A64]")}>
                                          {account.bankName}
                                        </p>
                                      </div>
                                      {isSelected && (
                                        <CheckCircle2 className="w-4 h-4 text-[#A7066A] fill-[#A7066A] text-white" />
                                      )}
                                    </div>
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between items-start gap-2">
                                        <span className="text-[9px] text-[#6B5A64] font-medium uppercase opacity-70">Acc Name</span>
                                        <span className="text-xs font-bold text-right text-[#1F1720] leading-tight">{account.accountName}</span>
                                      </div>
                                      <div className="flex justify-between items-start gap-2">
                                        <span className="text-[9px] text-[#6B5A64] font-medium uppercase opacity-70">Acc Number</span>
                                        <span className="text-xs font-bold text-right text-[#1F1720] font-mono tracking-wider">{account.accountNumber}</span>
                                      </div>
                                      {account.branchName && (
                                        <div className="flex justify-between items-start gap-2">
                                          <span className="text-[9px] text-[#6B5A64] font-medium uppercase opacity-70">Branch</span>
                                          <span className="text-xs font-bold text-right text-[#1F1720]">{account.branchName}</span>
                                        </div>
                                      )}
                                    </div>
                                  </Label>

                                  {isSelected && account.instructions && (
                                    <div className="p-3 rounded-xl bg-white border border-brand-border/30 shadow-inner animate-in fade-in slide-in-from-top-1 duration-300">
                                      <div className="flex gap-2">
                                        <Sparkles className="w-3 h-3 text-[#A7066A] flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-[#6B5A64] italic leading-relaxed">
                                          {account.instructions}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </RadioGroup>
                        </>
                      ) : bankAccounts.length === 1 ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-brand-border/50">
                            <Landmark className="w-5 h-5 text-[#A7066A]" />
                            <h4 className="font-bold text-[#1F1720]">Bank Details</h4>
                          </div>
                          <div className="p-5 rounded-2xl bg-white border-2 border-[#A7066A]/10 shadow-sm space-y-4">
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#6B5A64] uppercase tracking-widest opacity-60">Bank Name</p>
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-3.5 h-3.5 text-[#A7066A]" />
                                  <p className="text-sm font-bold text-[#1F1720]">{bankAccounts[0].bankName}</p>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#6B5A64] uppercase tracking-widest opacity-60">Branch</p>
                                <p className="text-sm font-bold text-[#1F1720]">{bankAccounts[0].branchName || "Main Branch"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#6B5A64] uppercase tracking-widest opacity-60">Account Name</p>
                                <p className="text-sm font-bold text-[#1F1720]">{bankAccounts[0].accountName}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#6B5A64] uppercase tracking-widest opacity-60">Account Number</p>
                                <p className="text-sm font-bold text-[#1F1720] font-mono tracking-wider">{bankAccounts[0].accountNumber}</p>
                              </div>
                            </div>

                            {bankAccounts[0].instructions && (
                              <div className="pt-4 border-t border-brand-border/30">
                                <div className="flex gap-2">
                                  <Sparkles className="w-4 h-4 text-[#A7066A] flex-shrink-0 mt-0.5" />
                                  <p className="text-xs text-[#6B5A64] italic leading-relaxed">
                                    {bankAccounts[0].instructions}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}

                    </div>
                  )}
                  {fieldErrors.paymentMethod && <p className="mt-3 text-sm text-destructive">{fieldErrors.paymentMethod}</p>}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 border-brand-border">
                <CardHeader>
                  <CardTitle className="text-lg text-[#1F1720]">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Items */}
                  <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar mb-4">
                    {isByob ? (
                      <>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Your Gift Box</p>
                        {byobItems.map((item) => (
                          <div key={`${item.productId}-${item.selectedSize || ""}-${item.selectedColor || ""}`} className="flex gap-3 items-center">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#FCEAF4] flex-shrink-0">
                              {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-[#1F1720] line-clamp-1">{item.name}</p>
                              {(item.selectedSize || item.selectedColor) && (
                                <p className="text-[10px] text-slate-400 font-bold leading-none mb-1">
                                  {item.selectedSize && `Size: ${item.selectedSize}`}
                                  {item.selectedSize && item.selectedColor && " | "}
                                  {item.selectedColor && `Color: ${item.selectedColor}`}
                                </p>
                              )}
                              <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                            </div>
                            <span className="text-sm font-medium text-[#1F1720] shrink-0">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        ))}
                        {selectedWrap && (
                          <div className="flex gap-3 items-center pt-2 border-t border-slate-100">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#FCEAF4] flex-shrink-0">
                              {selectedWrap.imageUrl
                                ? <Image src={selectedWrap.imageUrl} alt={selectedWrap.name} fill className="object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-[#A7066A] font-black italic text-sm">W</div>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-[#1F1720] line-clamp-1">{selectedWrap.name}</p>
                              <p className="text-xs text-[#A7066A]">Gift Wrapping</p>
                            </div>
                            <span className="text-sm font-medium text-[#1F1720] shrink-0">{selectedWrap.price === 0 ? "FREE" : formatPrice(selectedWrap.price)}</span>
                          </div>
                        )}
                        {giftMessage && (
                          <div className="mt-2 p-2 bg-fuchsia-50/40 rounded-lg border border-fuchsia-100/60">
                            <p className="text-[10px] font-black text-[#A7066A] uppercase tracking-wider mb-1">Gift Message</p>
                            <p className="text-xs text-slate-600 italic line-clamp-2">"{giftMessage}"</p>
                          </div>
                        )}
                      </>
                    ) : items.map((item) => (

                      <div key={item.id} className="flex gap-3">
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#FCEAF4] flex-shrink-0">
                          <Image
                            src={getItemImage(item) || "/placeholder.jpg"}
                            alt={getItemName(item) || "Product"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-[#1F1720] line-clamp-1">
                            {getItemName(item)}
                          </p>
                          {item.selectedVariant?.name && (
                            <p className="text-xs text-[#6B5A64] mt-0.5">
                              Variant: {item.selectedVariant.name}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-2 mt-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 border-brand-border"
                                onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 border-brand-border"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            {(() => {
                              const isCustomBox = item.type === "custombox";
                              const isReadyMadeGiftBox = item.type === "giftbox" ||
                                item.product?.isPremiumGiftBox === true ||
                                item.product?.name.toLowerCase().includes("gift box");

                              if (isCustomBox) {
                                return <Badge className="bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200 border-none text-[10px] h-4 px-1.5 font-bold">Custom Box</Badge>;
                              }
                              if (isReadyMadeGiftBox) {
                                return <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-200 border-none text-[10px] h-4 px-1.5 font-bold">Gift Box</Badge>;
                              }
                              return <Badge variant="outline" className="text-slate-500 border-slate-200 text-[10px] h-4 px-1.5 font-bold">Standard Item</Badge>;
                            })()}
                          </div>

                          {/* Gift Box Contents */}
                          {item.type === "giftbox" && item.giftBox?.contents && (
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 italic leading-tight">
                              Includes: {item.giftBox.contents.map(c => `${c.quantity}x ${c.productName}`).join(", ")}
                            </p>
                          )}
                          {item.type === "custombox" && item.customBox && (
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 italic leading-tight">
                              Includes: {item.customBox.items.map(i => `${i.quantity}x ${i.item.name}`).join(", ")}
                              {item.customBox.wrapping && `, ${item.customBox.wrapping.name} (${item.customBox.wrapping.price === 0 ? "FREE" : formatPrice(item.customBox.wrapping.price)})`}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col items-end justify-between">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors mb-1"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div>
                            {(() => {
                              if (item.type === "product" && item.product && !item.selectedVariant) {
                                const { price, originalPrice, salePrice } = item.product;
                                const strikePrice = (typeof originalPrice === "number" && originalPrice > price)
                                  ? originalPrice
                                  : (typeof salePrice === "number" && salePrice < price)
                                    ? price
                                    : null;
                                if (strikePrice) {
                                  return (
                                    <span className="mr-1 text-xs text-gray-400 line-through">
                                      {formatPrice(strikePrice * item.quantity)}
                                    </span>
                                  );
                                }
                              }
                              return null;
                            })()}
                            <span className="text-sm font-medium text-[#1F1720]">
                              {formatPrice(item.subtotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  {/* Free Delivery Nudge */}
                  {remainingForFreeDelivery && remainingForFreeDelivery > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-xs text-green-800">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        Add <strong>{formatPrice(remainingForFreeDelivery)}</strong> more for free delivery!
                      </p>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B5A64]">Subtotal</span>
                      <span className="text-[#1F1720]">{formatPrice(subtotal)}</span>
                    </div>
                    {totalSaved > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium text-green-600">
                          <Tag className="h-3.5 w-3.5" />
                          You Save
                        </span>
                        <span className="font-medium text-green-600">−{formatPrice(totalSaved)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#6B5A64]">Delivery</span>
                      <span className="text-[#1F1720]">
                        {!city ? "Select city" : deliveryFee === 0 ? "FREE" : formatPrice(deliveryFee)}
                      </span>
                    </div>
                    {paymentFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#6B5A64]">Payment Fee</span>
                        <span className="text-[#1F1720]">{formatPrice(paymentFee)}</span>
                      </div>
                    )}
                    {isGift ? (
                      <div className="flex justify-between">
                        <span className="text-[#6B5A64]">Gift Wrapping</span>
                        <span className="text-[#1F1720]">
                          {selectedWrap
                            ? selectedWrap.price === 0
                              ? "FREE"
                              : formatPrice(selectedWrap.price)
                            : "Not selected"}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex justify-between">
                      <span className="text-[#6B5A64]">{isDigitalOnly ? "Delivery" : "Packaging"}</span>
                      <span className="text-[#1F1720]">{isDigitalOnly ? "Digital via Email" : selectedPackaging.name}</span>
                    </div>

                    {appliedGiftCard && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium text-[#A7066A]">
                          <Gift className="h-3.5 w-3.5" />
                          Gift Card ({appliedGiftCard.code})
                        </span>
                        <span className="font-medium text-[#A7066A]">−{formatPrice(giftCardDeduction)}</span>
                      </div>
                    )}

                    <Separator />
                    <div className="flex justify-between text-base font-semibold">
                      <span className="text-[#1F1720]">Total</span>
                      <span className="text-[#A7066A]">
                        {formatPrice(payableRemaining)}
                      </span>
                    </div>
                  </div>

                  {isGiftcardsEnabled && (
                    <div className="mt-4">
                      {/* Pass the full extraFees so setGiftCard computes the correct deduction
                          even if delivery city hasn't been selected yet (deliveryFee = 0) */}
                      <GiftCardInput extraFees={extraFees} />
                    </div>
                  )}

                  <Button
                    className="w-full mt-6 bg-gradient-to-r from-[#A7066A] to-[#E91E8C] hover:opacity-90"
                    size="lg"
                    onClick={handlePlaceOrder}
                    disabled={isProcessing || isLoadingConfig || !shippingConfig?.isDeliveryEnabled}
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      `Place Order - ${formatPrice(payableRemaining)}`
                    )}
                  </Button>

                  {/* Trust Badges */}
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-[#6B5A64]">
                      <Shield className="w-4 h-4 text-[#A7066A]" />
                      <span>Secure checkout</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#6B5A64]">
                      <Truck className="w-4 h-4 text-[#A7066A]" />
                      <span>Island-wide delivery</span>
                    </div>
                  </div>

                  {/* Shipping Note */}
                  {shippingConfig?.deliveryNote && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">{shippingConfig.deliveryNote}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
