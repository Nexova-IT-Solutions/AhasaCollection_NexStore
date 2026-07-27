import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { formatPriceServer as formatPrice, getCurrencyServer } from "@/lib/currency";
import Link from "next/link";
import { FileText, User, Phone, Mail, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Accounts Receivable | Admin",
  description: "Customers with outstanding balances",
};

export default async function AccountsReceivablePage() {
  const session = await getServerSession(authOptions);

  if (!hasPermission(session, "reports.accounts_receivable")) {
    redirect("/admin");
  }

  const customersWithDebt = await db.user.findMany({
    where: {
      outstandingBalance: {
        gt: 0,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      outstandingBalance: true,
      ledgerEntries: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      }
    },
    orderBy: {
      outstandingBalance: "desc",
    },
  });

  const currency = await getCurrencyServer();
  const totalOutstanding = customersWithDebt.reduce((sum, customer) => sum + customer.outstandingBalance, 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts Receivable</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Overview of all customers with outstanding credit balances.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm">Total Outstanding</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{formatPrice(totalOutstanding, currency)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <User className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm">Customers in Debt</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{customersWithDebt.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {customersWithDebt.length === 0 ? (
          <div className="p-12 text-center">
            <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No Outstanding Debts</h3>
            <p className="text-slate-500 mt-1">All customer accounts are settled up.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium">Last Activity</th>
                  <th className="px-6 py-4 font-medium text-right">Balance Due</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customersWithDebt.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{customer.name || 'Unnamed Customer'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-slate-600">
                        {customer.phoneNumber && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Phone className="h-3 w-3" /> {customer.phoneNumber}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Mail className="h-3 w-3" /> {customer.email}
                          </div>
                        )}
                        {!customer.phoneNumber && !customer.email && (
                          <span className="text-xs text-slate-400">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {customer.ledgerEntries[0] ? (
                        new Date(customer.ledgerEntries[0].createdAt).toLocaleDateString()
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {formatPrice(customer.outstandingBalance, currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/customers/${customer.id}/ledger`}
                        className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                      >
                        View Ledger
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
