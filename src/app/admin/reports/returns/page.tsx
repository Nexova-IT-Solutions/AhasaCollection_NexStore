import { db } from "@/lib/db";
import { formatPriceServer, getCurrencyServer } from "@/lib/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PackageX, Calendar, RefreshCcw, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReturnsReportPage() {
  const returns = await db.orderItemReturn.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      orderItem: true,
      order: {
        select: {
          orderNumber: true,
          customerName: true,
        }
      }
    }
  });

  const currency = await getCurrencyServer();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <RefreshCcw className="h-6 w-6 text-[#A7066A]" />
            Returned Items Report
          </h1>
          <p className="text-sm text-slate-500">
            A comprehensive log of all item-level returns and restocks.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Returns</span>
            <span className="text-lg font-bold text-slate-900">{returns.length}</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase">Refunded Value</span>
            <span className="text-lg font-bold text-[#A7066A]">
              {formatPriceServer(returns.reduce((sum, r) => sum + r.refundAmount, 0), currency)}
            </span>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg">Return History</CardTitle>
          <CardDescription>All processed returns across web and POS orders.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="pl-6">Date</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Refunded</TableHead>
                <TableHead>Restocked</TableHead>
                <TableHead className="pr-6">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.length > 0 ? (
                returns.map((ret) => (
                  <TableRow key={ret.id} className="hover:bg-slate-50/50">
                    <TableCell className="pl-6 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {format(new Date(ret.createdAt), "MMM d, yyyy h:mm a")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link 
                        href={`/admin/orders/${ret.orderId}`}
                        className="flex items-center gap-1 font-mono text-xs font-semibold text-[#A7066A] hover:underline"
                      >
                        {ret.order.orderNumber}
                        <LinkIcon className="h-3 w-3" />
                      </Link>
                      <span className="text-xs text-slate-500 block mt-0.5">{ret.order.customerName}</span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm text-slate-900">{ret.orderItem.productName}</div>
                      {ret.orderItem.sku && <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {ret.orderItem.sku}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-white">
                        {ret.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      {formatPriceServer(ret.refundAmount, currency)}
                    </TableCell>
                    <TableCell>
                      {ret.restocked ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0.5">Yes</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none px-2 py-0.5">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-6">
                      {ret.reason ? (
                        <span className="text-sm text-slate-600">{ret.reason}</span>
                      ) : (
                        <span className="text-sm text-slate-400 italic">No reason provided</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PackageX className="h-8 w-8 text-slate-300" />
                      No returned items found.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
