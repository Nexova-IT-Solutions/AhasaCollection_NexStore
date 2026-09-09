"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save, Building2, Printer } from "lucide-react";
import qz from "qz-tray";
import { initQZSecurity } from "@/lib/qz-init";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateReceiptPdf } from "@/lib/pdf-receipt";

const TIMEZONES = [
  { value: "Asia/Muscat", label: "Oman (Muscat) - UTC+4" },
  { value: "Asia/Dubai", label: "UAE (Dubai) - UTC+4" },
  { value: "Asia/Colombo", label: "Sri Lanka (Colombo) - UTC+5:30" },
  { value: "Europe/London", label: "UK (London) - GMT/BST" },
  { value: "America/New_York", label: "USA (New York) - EST/EDT" },
  { value: "UTC", label: "UTC" },
];

const companyDetailsSchema = z.object({
  companyName: z.string().min(1, "Company name is required").optional().or(z.literal("")),
  mobileNumber: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  crNumber: z.string().optional().or(z.literal("")),
  posPrinterName: z.string().optional().or(z.literal("")),
  posPrintMode: z.string().default("raw"),
  timezone: z.string().optional().default("Asia/Muscat"),
  receiptCharWidth: z.number().int().min(32).max(48).default(42),
  receiptLogoWidth: z.number().int().min(100).max(300).default(200),
  receiptLogoHeight: z.number().int().min(40).max(200).default(80),
  receiptPrintArea: z.number().int().min(50).max(120).default(80),
  logoBase64: z.string().optional().nullable().or(z.literal("")),
});

type CompanyDetailsValues = z.infer<typeof companyDetailsSchema>;

export default function CompanyDetailsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Logo upload cropping modal state variables
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const form = useForm<CompanyDetailsValues>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: {
      companyName: "",
      mobileNumber: "",
      address: "",
      website: "",
      email: "",
      crNumber: "",
      posPrinterName: "",
      posPrintMode: "raw",
      timezone: "Asia/Muscat",
      receiptCharWidth: 42,
      receiptLogoWidth: 200,
      receiptLogoHeight: 80,
      receiptPrintArea: 80,
      logoBase64: "",
    },
  });

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch("/api/admin/company-details");
        if (!res.ok) throw new Error("Failed to fetch details");
        const data = await res.json();
        
        form.reset({
          companyName: data.companyName || "",
          mobileNumber: data.mobileNumber || "",
          address: data.address || "",
          website: data.website || "",
          email: data.email || "",
          crNumber: data.crNumber || "",
          posPrinterName: data.posPrinterName || "",
          posPrintMode: data.posPrintMode || "raw",
          timezone: data.timezone || "Asia/Muscat",
          receiptCharWidth: data.receiptCharWidth ?? 42,
          receiptLogoWidth: data.receiptLogoWidth ?? 200,
          receiptLogoHeight: data.receiptLogoHeight ?? 80,
          receiptPrintArea: data.receiptPrintArea ?? 80,
          logoBase64: data.logoBase64 || "",
        });
      } catch (error) {
        toast.error("Failed to load company details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [form]);

  // Hook to redraw canvas on cropping dialog settings changes
  useEffect(() => {
    if (!cropImageSrc) return;
    const canvas = document.getElementById("crop-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Fill canvas background with white
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center the image draw
      const drawWidth = img.width * zoom;
      const drawHeight = img.height * zoom;
      const startX = (canvas.width - drawWidth) / 2 + offsetX;
      const startY = (canvas.height - drawHeight) / 2 + offsetY;

      ctx.drawImage(img, startX, startY, drawWidth, drawHeight);
    };
    img.src = cropImageSrc;
  }, [cropImageSrc, zoom, offsetX, offsetY]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmCrop = () => {
    const canvas = document.getElementById("crop-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    form.setValue("logoBase64", dataUrl);
    setCropImageSrc(null);
    toast.success("Logo cropped successfully!");
  };

  const [printers, setPrinters] = useState<string[]>([]);
  const [isConnectingQz, setIsConnectingQz] = useState(false);

  const fetchPrinters = async () => {
    setIsConnectingQz(true);
    try {
      initQZSecurity();
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({ retries: 0 });
      }
      const foundPrinters = await qz.printers.find();
      setPrinters(foundPrinters);
      toast.success("Connected to QZ Tray & found printers");
    } catch (err) {
      console.error(err);
      toast.error("Could not connect to QZ Tray. Make sure it is installed and running.");
    } finally {
      setIsConnectingQz(false);
    }
  };

  useEffect(() => {
    // Attempt to auto-connect to QZ Tray silently in the background
    initQZSecurity();
    qz.websocket.connect({ retries: 0 }).then(() => {
      return qz.printers.find();
    }).then((foundPrinters) => {
      setPrinters(foundPrinters);
    }).catch((e) => {
      console.log("Silent QZ connection failed (it might not be running yet)");
    });
  }, []);

  const handleTestPrint = async () => {
    const selectedPrinter = form.getValues("posPrinterName");
    if (!selectedPrinter) {
      toast.error("Please select a printer first.");
      return;
    }
    try {
      toast.info("Sending layout test print to printer...");
      generateReceiptPdf({
        orderNumber: "POS-TEST-EN",
        total: 36.000,
        subtotal: 40.000,
        changeDue: 4.000,
        paymentMethod: "CARD",
        date: new Date().toLocaleString(),
        items: [
          { name: "Nexova-Product", sku: "N00011", quantity: 2, price: 20.000, discountPercent: 10 }
        ],
        companyDetails: form.getValues(),
      }, "print");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send test print. Is the printer online?");
    }
  };

  const handleTestArabicPrint = async () => {
    const selectedPrinter = form.getValues("posPrinterName");
    if (!selectedPrinter) {
      toast.error("Please select a printer first.");
      return;
    }
    try {
      toast.info("Sending Arabic layout test print to printer...");
      generateReceiptPdf({
        orderNumber: "POS-TEST-AR",
        total: 36.000,
        subtotal: 40.000,
        changeDue: 4.000,
        paymentMethod: "POS_CARD",
        date: new Date().toLocaleString(),
        items: [
          { name: "Sohar Pet Product", nameAr: "منتج صحار الأليف", sku: "N00011", quantity: 2, price: 20.000, discountPercent: 10 }
        ],
        companyDetails: form.getValues(),
      }, "print");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send Arabic test print.");
    }
  };

  const onSubmit = async (values: CompanyDetailsValues) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/company-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Failed to save details");
      toast.success("Company details saved successfully!");
      router.refresh();
    } catch (err) {
      toast.error("Failed to save company details");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#A7066A]" />
            Company Details
          </h1>
          <p className="text-sm text-slate-500">
            Manage your company information. These details will appear on printed and downloaded receipts.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="crNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CR Number / Tax ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter CR or Tax Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Timezone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "Asia/Muscat"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter mobile number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. www.yourcompany.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter complete address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Logo Upload with Cropper trigger */}
            <FormField
              control={form.control}
              name="logoBase64"
              render={({ field }) => (
                <FormItem className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-2">
                  <FormLabel className="font-semibold text-slate-800">Company Logo (Printed on Receipts)</FormLabel>
                  <FormControl>
                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-1">
                      {field.value ? (
                        <div className="relative group shrink-0">
                          <img
                            src={field.value}
                            alt="Company Logo Preview"
                            className="w-20 h-20 object-contain bg-white border border-slate-200 rounded-lg p-1 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => field.onChange("")}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md transition-colors"
                            title="Remove logo"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-slate-100 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-bold shrink-0">
                          NO LOGO
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="max-w-[280px] h-9 text-xs file:bg-slate-100 file:border-0 file:rounded-md file:text-xs file:font-semibold hover:file:bg-slate-200 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-400">
                          Upload PNG/JPG. Will open cropping canvas to position and zoom the logo properly.
                        </p>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-6 border-t border-slate-100">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#A7066A] hover:bg-[#8A0558] text-white min-w-[120px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Details
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    

    {/* Canvas-Based Interactive Cropping Modal */}
    {cropImageSrc && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in duration-150">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">Crop Logo</h3>
            <button 
              type="button" 
              className="text-slate-400 hover:text-slate-600 transition-colors font-semibold"
              onClick={() => setCropImageSrc(null)}
            >
              ✕
            </button>
          </div>
          <div className="p-6 flex flex-col items-center gap-6 bg-slate-50">
            {/* Interactive Preview Canvas */}
            <div 
              className="relative border-2 border-dashed border-slate-300 bg-white shadow-inner rounded-xl overflow-hidden flex items-center justify-center transition-all"
              style={{ width: '220px', height: '220px' }}
            >
              <canvas
                id="crop-canvas"
                width="220"
                height="220"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Scale & Alignment Controls */}
            <div className="w-full space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Zoom / Scale</span>
                  <span className="text-[#A7066A]">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="4.0"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#A7066A]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Horizontal Position (Move X)</span>
                  <span className="text-[#A7066A]">{offsetX} px</span>
                </div>
                <input
                  type="range"
                  min="-200"
                  max="200"
                  step="1"
                  value={offsetX}
                  onChange={(e) => setOffsetX(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#A7066A]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Vertical Position (Move Y)</span>
                  <span className="text-[#A7066A]">{offsetY} px</span>
                </div>
                <input
                  type="range"
                  min="-200"
                  max="200"
                  step="1"
                  value={offsetY}
                  onChange={(e) => setOffsetY(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#A7066A]"
                />
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setCropImageSrc(null)}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#A7066A] hover:bg-[#8A0558] text-white h-9 text-xs" onClick={handleConfirmCrop}>
              Crop & Apply Logo
            </Button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
