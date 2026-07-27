"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { ReusablePagination } from "@/components/admin/reusable-pagination";
import { 
  Plus, 
  Search, 
  CreditCard, 
  Ticket, 
  MoreHorizontal,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  Check,
  RotateCcw,
  FileSpreadsheet
} from "lucide-react";
import { ExcelExportUtility } from "@/utils/excel-export";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface GiftCardsClientProps {
  digitalCards: any[];
  paperCards: any[];
  totalDigitalCount: number;
  totalPaperCount: number;
  digitalPage: number;
  paperPage: number;
  digitalLimit: number;
  paperLimit: number;
}

export function GiftCardsClient({ 
  digitalCards, 
  paperCards,
  totalDigitalCount,
  totalPaperCount,
  digitalPage,
  paperPage,
  digitalLimit,
  paperLimit
}: GiftCardsClientProps) {
  const router = useRouter();
  const [digitalSearch, setDigitalSearch] = useState("");
  const [paperSearch, setPaperSearch] = useState("");
  const [activeTab, setActiveTab] = useState("digital");

  // Form State for Registration
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    initialValue: "1000",
  });

  const handleExportDigital = async () => {
    try {
      await ExcelExportUtility.exportToExcel({
        title: "Digital Gift Cards Registry",
        filename: "Digital_Gift_Cards_Export",
        columns: [
          { header: "Gift Card Code", key: "code", type: "string" },
          { header: "Initial Value (LKR)", key: "initialValue", type: "currency", alignment: "right" },
          { header: "Current Balance (LKR)", key: "balance", type: "currency", alignment: "right" },
          { header: "Status", key: "status", type: "string", alignment: "center" },
          { header: "Created Date", key: "createdAt", type: "date" },
          { header: "Order Number", key: "purchasedInOrder.orderNumber", type: "string", alignment: "center" },
        ],
        data: digitalCards,
        includeSummaryRow: true,
      });
      toast.success("Digital cards Excel report downloaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to export digital cards");
    }
  };

  const handleExportPaper = async () => {
    try {
      await ExcelExportUtility.exportToExcel({
        title: "Printed Gift Cards Inventory",
        filename: "Printed_Gift_Cards_Export",
        columns: [
          { header: "Voucher Code", key: "code", type: "string" },
          { header: "Initial Value (LKR)", key: "initialValue", type: "currency", alignment: "right" },
          { header: "Current Balance (LKR)", key: "balance", type: "currency", alignment: "right" },
          { header: "Status", key: "status", type: "string", alignment: "center" },
          { header: "Registered On", key: "createdAt", type: "date" },
        ],
        data: paperCards,
        includeSummaryRow: true,
      });
      toast.success("Printed vouchers Excel report downloaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to export printed vouchers");
    }
  };

  // Filter logic
  const filteredDigital = digitalCards.filter(card => 
    card.code.toLowerCase().includes(digitalSearch.toLowerCase()) ||
    card.purchasedInOrder?.orderNumber?.toLowerCase().includes(digitalSearch.toLowerCase())
  );

  const filteredPaper = paperCards.filter(card => 
    card.code.toLowerCase().includes(paperSearch.toLowerCase())
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Available</Badge>;
      case "USED":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none"><Check className="w-3 h-3 mr-1" /> Used</Badge>;
      case "DISABLED":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none"><XCircle className="w-3 h-3 mr-1" /> Disabled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Stats for Paper Cards
  const totalPaper = paperCards.length;
  const usedPaper = paperCards.filter(c => c.status === "USED").length;
  const availablePaper = paperCards.filter(c => c.status === "AVAILABLE").length;
  const disabledPaper = paperCards.filter(c => c.status === "DISABLED").length;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/gift-cards/printed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          count: 1, // Hardcode count/batchSize to 1 to comply with backend constraints
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register card");
      }

      toast.success("Gift card registered successfully");
      setIsRegisterOpen(false);
      setFormData({ code: "", initialValue: "1000" });
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const loadingToast = toast.loading("Updating card status...");
    try {
      const res = await fetch(`/api/admin/gift-cards/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(`Card marked as ${status.toLowerCase()}`, { id: loadingToast });
      router.refresh();
    } catch (error) {
      toast.error("Error updating status", { id: loadingToast });
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <TabsList className="h-12 bg-white border border-brand-border p-1 shadow-sm">
          <TabsTrigger 
            value="digital" 
            className="h-10 px-6 font-semibold data-[state=active]:bg-[#A7066A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Digital Gift Cards
          </TabsTrigger>
          <TabsTrigger 
            value="paper" 
            className="h-10 px-6 font-semibold data-[state=active]:bg-[#A7066A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            <Ticket className="w-4 h-4 mr-2" />
            Printed (Paper) Cards
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">

          {activeTab === "paper" && (
            <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-10 bg-[#A7066A] hover:bg-[#8A0558] text-white shadow-md">
                  <Plus className="w-4 h-4 mr-2" /> Register Voucher
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] border-brand-border">
                <DialogHeader>
                  <DialogTitle>Register Printed Vouchers</DialogTitle>
                  <DialogDescription>
                    Manually enter a code or generate a physical voucher.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRegister} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Voucher Code (Optional)</Label>
                    <Input 
                      id="code" 
                      placeholder="Leave blank to auto-generate"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="initialValue">Face Value (LKR)</Label>
                    <Input 
                      id="initialValue" 
                      type="number" 
                      value={formData.initialValue}
                      onChange={(e) => setFormData({...formData, initialValue: e.target.value})}
                    />
                  </div>

                  <DialogFooter className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-[#A7066A] hover:bg-[#8A0558]"
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Register Card
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <TabsContent value="digital" className="space-y-6 outline-none">
        {/* Digital Configuration Section (Simplified for brevity, keeping existing structure) */}
        {/* Digital Cards Table */}
        <Card className="border-brand-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Generated Digital Cards</CardTitle>
                <CardDescription>Monitor cards purchased via the web store.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleExportDigital}
                  variant="outline"
                  size="sm"
                  className="h-10 border-brand-border text-[#104E5B] hover:bg-[#E6F2F4] hover:text-[#104E5B] font-semibold"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Search code or order #..." 
                    className="pl-10 border-brand-border h-10"
                    value={digitalSearch}
                    onChange={(e) => setDigitalSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-brand-border hover:bg-transparent">
                  <TableHead className="font-bold text-[#1F1720]">Gift Card Code</TableHead>
                  <TableHead className="font-bold text-[#1F1720]">Value</TableHead>
                  <TableHead className="font-bold text-[#1F1720]">Balance</TableHead>
                  <TableHead className="font-bold text-[#1F1720]">Status</TableHead>
                  <TableHead className="font-bold text-[#1F1720]">Created Date</TableHead>
                  <TableHead className="font-bold text-[#1F1720]">Order</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDigital.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">No digital cards found.</TableCell>
                  </TableRow>
                ) : (
                  filteredDigital.map((card) => (
                    <TableRow key={card.id} className="border-brand-border hover:bg-slate-50/30">
                      <TableCell className="font-mono font-bold text-[#A7066A]">
                        {card.code}
                      </TableCell>
                      <TableCell>{formatPrice(card.initialValue)}</TableCell>
                      <TableCell className="font-semibold text-[#1F1720]">{formatPrice(card.balance)}</TableCell>
                      <TableCell>{getStatusBadge(card.status)}</TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {format(new Date(card.createdAt), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {card.purchasedInOrder ? (
                          <Badge variant="outline" className="font-mono text-[10px] border-slate-200 text-[#1F1720]">
                            #{card.purchasedInOrder.orderNumber}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 border-brand-border">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem className="cursor-pointer">
                              <Eye className="w-4 h-4 mr-2" /> View Transactions
                            </DropdownMenuItem>
                            {card.status === "AVAILABLE" && (
                              <DropdownMenuItem 
                                className="cursor-pointer text-orange-600 focus:text-orange-600"
                                onClick={() => updateStatus(card.id, "DISABLED")}
                              >
                                <Eye className="w-4 h-4 mr-2" /> Disable Card
                              </DropdownMenuItem>
                            )}
                            {card.status === "DISABLED" && (
                              <DropdownMenuItem 
                                className="cursor-pointer text-emerald-600 focus:text-emerald-600"
                                onClick={() => updateStatus(card.id, "AVAILABLE")}
                              >
                                <Check className="w-4 h-4 mr-2" /> Re-enable Card
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                              Deactivate Card
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <ReusablePagination 
            totalItems={totalDigitalCount}
            itemsPerPage={digitalLimit}
            currentPage={digitalPage}
            pageParamKey="digitalPage"
            limitParamKey="digitalLimit"
          />
        </Card>
      </TabsContent>

      <TabsContent value="paper" className="space-y-6 outline-none">
        {/* Paper Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <Card className="border-brand-border shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Total Registered</CardDescription>
              <CardTitle className="text-3xl font-black text-[#1F1720]">{totalPaper}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-brand-border shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Available</CardDescription>
              <CardTitle className="text-3xl font-black text-slate-400">{availablePaper}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-brand-border shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Disabled</CardDescription>
              <CardTitle className="text-3xl font-black text-orange-500">{disabledPaper}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-brand-border shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>Redeemed / Used</CardDescription>
              <CardTitle className="text-3xl font-black text-[#A7066A]">{usedPaper}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Paper Cards Table */}
        <Card className="border-brand-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Physical Card Inventory</CardTitle>
                <CardDescription>Manage cards issued physically at retail locations.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleExportPaper}
                  variant="outline"
                  size="sm"
                  className="h-10 border-brand-border text-[#104E5B] hover:bg-[#E6F2F4] hover:text-[#104E5B] font-semibold"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Search code..." 
                    className="pl-10 border-brand-border h-10"
                    value={paperSearch}
                    onChange={(e) => setPaperSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-brand-border hover:bg-transparent">
                  <TableHead className="font-bold text-[#1F1720]">Voucher Code</TableHead>
                  <TableHead className="font-bold text-[#1F1720]">Value</TableHead>
                  <TableHead className="font-bold text-[#1F1720]">Balance</TableHead>
                  <TableHead className="font-bold text-[#1F1720]">Status</TableHead>
                  <TableHead className="font-bold text-[#1F1720]">Registered On</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPaper.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">No physical vouchers registered.</TableCell>
                  </TableRow>
                ) : (
                  filteredPaper.map((card) => (
                    <TableRow key={card.id} className="border-brand-border hover:bg-slate-50/30">
                      <TableCell className="font-mono font-bold text-[#1F1720]">
                        {card.code}
                      </TableCell>
                      <TableCell>{formatPrice(card.initialValue)}</TableCell>
                      <TableCell className="font-semibold text-[#1F1720]">{formatPrice(card.balance)}</TableCell>
                      <TableCell>{getStatusBadge(card.status)}</TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {format(new Date(card.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 border-brand-border">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {card.status === "AVAILABLE" && (
                              <DropdownMenuItem 
                                className="cursor-pointer text-orange-600 focus:text-orange-600"
                                onClick={() => updateStatus(card.id, "DISABLED")}
                              >
                                <Eye className="w-4 h-4 mr-2" /> Disable Card
                              </DropdownMenuItem>
                            )}
                            {card.status === "DISABLED" && (
                              <DropdownMenuItem 
                                className="cursor-pointer text-emerald-600 focus:text-emerald-600"
                                onClick={() => updateStatus(card.id, "AVAILABLE")}
                              >
                                <RotateCcw className="w-4 h-4 mr-2" /> Re-enable Card
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                              Report Stolen/Lost
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <ReusablePagination 
            totalItems={totalPaperCount}
            itemsPerPage={paperLimit}
            currentPage={paperPage}
            pageParamKey="paperPage"
            limitParamKey="paperLimit"
          />
        </Card>
      </TabsContent>
    </Tabs>
  );
}
