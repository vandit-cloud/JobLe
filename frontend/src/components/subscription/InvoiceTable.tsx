import type { InvoiceRecord } from "../../types";
import { formatCurrency, formatDate } from "../../lib/utils";

export function InvoiceTable({ invoices }: { invoices: InvoiceRecord[] }) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Invoice</th>
              <th className="px-5 py-4">Plan</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice._id} className="border-t border-slate-100">
                <td className="px-5 py-4 font-semibold text-slate-800">{invoice.invoiceNumber}</td>
                <td className="px-5 py-4 text-sm text-slate-600">{invoice.planName}</td>
                <td className="px-5 py-4 text-sm text-slate-600">{formatCurrency(invoice.totalAmount, invoice.currency)}</td>
                <td className="px-5 py-4 text-sm text-slate-600">{invoice.status}</td>
                <td className="px-5 py-4 text-sm text-slate-600">{formatDate(invoice.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

