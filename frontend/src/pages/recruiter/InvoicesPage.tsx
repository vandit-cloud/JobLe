import { useEffect, useState } from "react";
import { fetchInvoices } from "../../api/recruiter";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { Pagination } from "../../components/common/Pagination";
import { InvoiceTable } from "../../components/subscription/InvoiceTable";
import type { InvoiceRecord } from "../../types";

export function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  async function load(page = 1) {
    setLoading(true);
    try {
      const response = await fetchInvoices({ page, limit: 10 });
      setInvoices(response.items);
      setPagination({ page: response.pagination.page, totalPages: response.pagination.totalPages });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Invoices" title="Invoice history" description="Review billing history, payment statuses, and invoice records for your organization." />
      {loading ? (
        <LoadingSkeleton className="h-72" />
      ) : invoices.length === 0 ? (
        <EmptyState title="No invoices available" description="Invoices will appear here after successful or pending billing cycles." />
      ) : (
        <>
          <InvoiceTable invoices={invoices} />
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={load} />
        </>
      )}
    </div>
  );
}

