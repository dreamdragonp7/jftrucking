"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  FileText,
  Send,
  Download,
  Trash2,
  MoreHorizontal,
  Eye,
  RotateCw,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, SortableHeader } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { GenerateInvoiceDialog } from "./GenerateInvoiceDialog";
import {
  sendInvoiceAction,
  deleteInvoiceAction,
} from "../_actions/invoices.actions";
import type { Invoice } from "@/types/database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(invoice: Invoice): boolean {
  if (["paid", "cancelled", "draft"].includes(invoice.status)) return false;
  return new Date(invoice.due_date) < new Date();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InvoiceRow = Invoice & { customer: { name: string } };

interface InvoicesClientProps {
  invoices: InvoiceRow[];
  customers: { id: string; name: string; payment_terms: string }[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoicesClient({ invoices, customers }: InvoicesClientProps) {
  const router = useRouter();
  const [showGenerate, setShowGenerate] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSend = (invoiceId: string) => {
    startTransition(async () => {
      const result = await sendInvoiceAction(invoiceId);
      if (result.success) {
        toast.success("Invoice sent successfully");
        if (result.data.emailError) {
          toast.warning(`Email note: ${result.data.emailError}`);
        }
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = (invoiceId: string) => {
    startTransition(async () => {
      const result = await deleteInvoiceAction(invoiceId);
      if (result.success) {
        toast.success("Invoice deleted");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  // Columns
  const columns: ColumnDef<InvoiceRow>[] = [
    {
      accessorKey: "invoice_number",
      header: ({ column }) => (
        <SortableHeader column={column}>Invoice #</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono font-bold text-[var(--color-text-primary)]">
          {row.original.invoice_number}
        </span>
      ),
    },
    {
      accessorKey: "customer.name",
      id: "customer",
      header: ({ column }) => (
        <SortableHeader column={column}>Customer</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original.customer?.name ?? "—"}
        </span>
      ),
    },
    {
      id: "period",
      header: "Period",
      cell: ({ row }) => (
        <span className="text-xs text-[var(--color-text-muted)]">
          {formatDate(row.original.period_start)} &ndash;{" "}
          {formatDate(row.original.period_end)}
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: ({ column }) => (
        <SortableHeader column={column} className="justify-end">
          Amount
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono font-bold text-[var(--color-text-primary)] text-right block">
          {formatMoney(row.original.total)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const overdue = isOverdue(row.original);
        return (
          <StatusBadge
            status={overdue ? "overdue" : row.original.status}
            label={overdue ? "Overdue" : undefined}
          />
        );
      },
      filterFn: (row, _id, filterValue) => {
        if (!filterValue || filterValue === "all") return true;
        if (filterValue === "overdue") return isOverdue(row.original);
        return row.original.status === filterValue;
      },
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => (
        <SortableHeader column={column}>Due Date</SortableHeader>
      ),
      cell: ({ row }) => {
        const overdue = isOverdue(row.original);
        return (
          <span
            className={`font-mono text-sm ${
              overdue
                ? "text-red-600 font-bold"
                : "text-[var(--color-text-secondary)]"
            }`}
          >
            {formatDate(row.original.due_date)}
          </span>
        );
      },
    },
    {
      accessorKey: "sent_at",
      header: "Sent",
      cell: ({ row }) => (
        <span className="text-xs text-[var(--color-text-muted)] font-mono">
          {formatDate(row.original.sent_at)}
        </span>
      ),
    },
    {
      accessorKey: "paid_at",
      header: "Paid",
      cell: ({ row }) => (
        <span className="text-xs text-emerald-600 font-mono">
          {formatDate(row.original.paid_at)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 60,
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/admin/invoices/${invoice.id}`)
                }
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`/api/invoices/${invoice.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {invoice.status === "draft" && (
                <DropdownMenuItem onClick={() => handleSend(invoice.id)}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invoice
                </DropdownMenuItem>
              )}
              {invoice.status === "sent" && (
                <DropdownMenuItem onClick={() => handleSend(invoice.id)}>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Resend
                </DropdownMenuItem>
              )}
              {invoice.status === "sent" && (
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/admin/invoices/${invoice.id}`)
                  }
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Paid
                </DropdownMenuItem>
              )}
              {invoice.status === "draft" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => handleDelete(invoice.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Tab filtering
  const filterByTab = (tab: string) => {
    if (tab === "all") return invoices;
    if (tab === "overdue") return invoices.filter(isOverdue);
    return invoices.filter((inv) => inv.status === tab);
  };

  // Tab counts
  const counts = {
    all: invoices.length,
    draft: invoices.filter((i) => i.status === "draft").length,
    sent: invoices.filter((i) => i.status === "sent").length,
    paid: invoices.filter((i) => i.status === "paid").length,
    overdue: invoices.filter(isOverdue).length,
  };

  return (
    <div className="animate-slide-up-fade">
      <PageHeader
        iconName="file-text"
        title="Invoices"
        description="Generate, manage, and send customer invoices"
        actionLabel="Generate Invoice"
        onAction={() => setShowGenerate(true)}
      />

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">
            All ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Draft ({counts.draft})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({counts.sent})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid ({counts.paid})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            <span className={counts.overdue > 0 ? "text-red-600" : ""}>
              Overdue ({counts.overdue})
            </span>
          </TabsTrigger>
        </TabsList>

        {(["all", "draft", "sent", "paid", "overdue"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <DataTable
              columns={columns}
              data={filterByTab(tab)}
              searchKey="invoice_number"
              searchPlaceholder="Search invoices..."
              emptyIcon={<FileText className="h-10 w-10 text-[var(--color-text-muted)]" />}
              emptyTitle="No invoices found"
              emptyDescription={
                tab === "all"
                  ? "Generate your first invoice to get started."
                  : `No ${tab} invoices.`
              }
              onRowClick={(row) =>
                router.push(`/admin/invoices/${row.id}`)
              }
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Generate Invoice Dialog */}
      <GenerateInvoiceDialog
        open={showGenerate}
        onOpenChange={setShowGenerate}
        customers={customers}
      />
    </div>
  );
}
