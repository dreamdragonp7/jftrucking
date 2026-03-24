"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, SortableHeader } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaymentWithRelations, CarrierSettlement } from "@/types/database";

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
  return new Date(
    dateStr.includes("T") ? dateStr : dateStr + "T00:00:00"
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettlementRow = CarrierSettlement & { carrier: { name: string } };

interface PaymentsClientProps {
  payments: PaymentWithRelations[];
  settlements: SettlementRow[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaymentsClient({
  payments,
  settlements,
}: PaymentsClientProps) {
  const router = useRouter();

  // Received payments columns (from customers)
  const receivedColumns: ColumnDef<PaymentWithRelations>[] = [
    {
      id: "reference",
      header: ({ column }) => (
        <SortableHeader column={column}>Reference</SortableHeader>
      ),
      accessorFn: (row) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = row.invoice as any;
        return invoice?.invoice_number ?? "\u2014";
      },
      cell: ({ row }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = row.original.invoice as any;
        return (
          <span className="font-mono font-bold text-[var(--color-text-primary)]">
            {invoice?.invoice_number ?? "\u2014"}
          </span>
        );
      },
    },
    {
      id: "from",
      header: "From",
      cell: ({ row }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const customer = row.original.customer as any;
        return (
          <span className="text-[var(--color-text-secondary)]">
            {customer?.name ?? "\u2014"}
          </span>
        );
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <SortableHeader column={column} className="justify-end">
          Amount
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono font-bold text-emerald-600 text-right block">
          {formatMoney(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="font-medium text-[11px] border bg-sky-500/15 text-sky-600 border-sky-500/20 uppercase"
        >
          {row.original.payment_method}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "paid_at",
      header: ({ column }) => (
        <SortableHeader column={column}>Date</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-[var(--color-text-secondary)]">
          {formatDate(row.original.paid_at)}
        </span>
      ),
    },
  ];

  // Sent payments columns (to carriers)
  const sentColumns: ColumnDef<SettlementRow>[] = [
    {
      id: "reference",
      header: ({ column }) => (
        <SortableHeader column={column}>Settlement #</SortableHeader>
      ),
      accessorFn: (row) => row.id.slice(0, 8).toUpperCase(),
      cell: ({ row }) => (
        <span className="font-mono font-bold text-[var(--color-text-primary)]">
          {row.original.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      id: "to",
      header: "To",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original.carrier?.name ?? "\u2014"}
        </span>
      ),
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => (
        <SortableHeader column={column} className="justify-end">
          Amount
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono font-bold text-orange-600 text-right block">
          {formatMoney(row.original.total_amount)}
        </span>
      ),
    },
    {
      id: "method",
      header: "Method",
      cell: () => (
        <Badge
          variant="outline"
          className="font-medium text-[11px] border bg-sky-500/15 text-sky-600 border-sky-500/20 uppercase"
        >
          ACH
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-[var(--color-text-secondary)]">
          {formatDate(row.original.paid_at ?? row.original.approved_at)}
        </span>
      ),
    },
  ];

  // Combined "All" view — merge both types into a unified display
  interface CombinedRow {
    id: string;
    reference: string;
    entity: string;
    amount: number;
    method: string;
    status: string;
    date: string | null;
    direction: "received" | "sent";
    linkHref: string;
  }

  const allRows: CombinedRow[] = [
    ...payments.map((p): CombinedRow => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = p.invoice as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = p.customer as any;
      return {
        id: p.id,
        reference: invoice?.invoice_number ?? "\u2014",
        entity: customer?.name ?? "\u2014",
        amount: p.amount,
        method: p.payment_method,
        status: p.status,
        date: p.paid_at,
        direction: "received",
        linkHref: `/admin/invoices/${p.invoice_id}`,
      };
    }),
    ...settlements.map((s): CombinedRow => ({
      id: s.id,
      reference: s.id.slice(0, 8).toUpperCase(),
      entity: s.carrier?.name ?? "\u2014",
      amount: s.total_amount,
      method: "ach",
      status: s.status,
      date: s.paid_at ?? s.approved_at,
      direction: "sent",
      linkHref: `/admin/settlements/${s.id}`,
    })),
  ].sort((a, b) => {
    const dateA = a.date ?? "";
    const dateB = b.date ?? "";
    return dateB.localeCompare(dateA);
  });

  const allColumns: ColumnDef<CombinedRow>[] = [
    {
      id: "direction",
      header: "",
      size: 40,
      cell: ({ row }) =>
        row.original.direction === "received" ? (
          <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
        ) : (
          <ArrowUpRight className="h-4 w-4 text-orange-600" />
        ),
    },
    {
      accessorKey: "reference",
      header: ({ column }) => (
        <SortableHeader column={column}>Reference</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono font-bold text-[var(--color-text-primary)]">
          {row.original.reference}
        </span>
      ),
    },
    {
      id: "entity",
      header: "From / To",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original.entity}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <SortableHeader column={column} className="justify-end">
          Amount
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <span
          className={`font-mono font-bold text-right block ${
            row.original.direction === "received"
              ? "text-emerald-600"
              : "text-orange-600"
          }`}
        >
          {row.original.direction === "received" ? "+" : "-"}
          {formatMoney(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="font-medium text-[11px] border bg-sky-500/15 text-sky-600 border-sky-500/20 uppercase"
        >
          {row.original.method}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <SortableHeader column={column}>Date</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-[var(--color-text-secondary)]">
          {formatDate(row.original.date)}
        </span>
      ),
    },
  ];

  // Tab counts
  const counts = {
    all: allRows.length,
    received: payments.length,
    sent: settlements.length,
  };

  return (
    <div className="animate-slide-up-fade">
      <PageHeader
        iconName="dollar"
        title="Payments"
        description="Track customer payments and carrier payouts"
      />

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="received">
            <ArrowDownLeft className="h-3.5 w-3.5 mr-1" />
            Received ({counts.received})
          </TabsTrigger>
          <TabsTrigger value="sent">
            <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
            Sent ({counts.sent})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <DataTable
            columns={allColumns}
            data={allRows}
            searchKey="reference"
            searchPlaceholder="Search payments..."
            emptyIcon={
              <DollarSign className="h-10 w-10 text-[var(--color-text-muted)]" />
            }
            emptyTitle="No payments found"
            emptyDescription="Payments will appear here as invoices are paid and settlements processed."
            onRowClick={(row) => router.push(row.linkHref)}
          />
        </TabsContent>

        <TabsContent value="received">
          <DataTable
            columns={receivedColumns}
            data={payments}
            searchKey="reference"
            searchPlaceholder="Search received payments..."
            emptyIcon={
              <ArrowDownLeft className="h-10 w-10 text-[var(--color-text-muted)]" />
            }
            emptyTitle="No payments received"
            emptyDescription="Payments from customers will appear here."
            onRowClick={(row) =>
              router.push(`/admin/invoices/${row.invoice_id}`)
            }
          />
        </TabsContent>

        <TabsContent value="sent">
          <DataTable
            columns={sentColumns}
            data={settlements}
            searchKey="reference"
            searchPlaceholder="Search sent payments..."
            emptyIcon={
              <ArrowUpRight className="h-10 w-10 text-[var(--color-text-muted)]" />
            }
            emptyTitle="No payments sent"
            emptyDescription="Carrier settlement payments will appear here."
            onRowClick={(row) =>
              router.push(`/admin/settlements/${row.id}`)
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
