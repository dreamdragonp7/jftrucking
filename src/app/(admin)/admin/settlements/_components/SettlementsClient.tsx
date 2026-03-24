"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Wallet,
  MoreHorizontal,
  Eye,
  CheckCircle,
  CreditCard,
  Trash2,
  Download,
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

import { GenerateSettlementDialog } from "./GenerateSettlementDialog";
import {
  approveSettlementAction,
  paySettlementAction,
  deleteSettlementAction,
} from "../_actions/settlements.actions";
import type { CarrierSettlement } from "@/types/database";

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

interface SettlementsClientProps {
  settlements: SettlementRow[];
  carriers: { id: string; name: string; dispatch_fee_weekly: number }[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettlementsClient({
  settlements,
  carriers,
}: SettlementsClientProps) {
  const router = useRouter();
  const [showGenerate, setShowGenerate] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleApprove = (settlementId: string) => {
    startTransition(async () => {
      const result = await approveSettlementAction(settlementId);
      if (result.success) {
        toast.success("Settlement approved");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handlePay = (settlementId: string) => {
    startTransition(async () => {
      const result = await paySettlementAction(settlementId);
      if (result.success) {
        toast.success("Settlement payment initiated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = (settlementId: string) => {
    startTransition(async () => {
      const result = await deleteSettlementAction(settlementId);
      if (result.success) {
        toast.success("Settlement deleted");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  // Columns
  const columns: ColumnDef<SettlementRow>[] = [
    {
      id: "settlement_id",
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
      accessorKey: "carrier.name",
      id: "carrier",
      header: ({ column }) => (
        <SortableHeader column={column}>Carrier</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original.carrier?.name ?? "\u2014"}
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
      accessorKey: "hauling_amount",
      header: ({ column }) => (
        <SortableHeader column={column} className="justify-end">
          Hauling
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-[var(--color-text-secondary)] text-right block">
          {formatMoney(row.original.hauling_amount)}
        </span>
      ),
    },
    {
      accessorKey: "dispatch_fee",
      header: ({ column }) => (
        <SortableHeader column={column} className="justify-end">
          Dispatch Fee
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-[var(--color-text-secondary)] text-right block">
          {formatMoney(row.original.dispatch_fee)}
        </span>
      ),
    },
    {
      accessorKey: "deductions",
      header: "Deductions",
      cell: ({ row }) =>
        row.original.deductions > 0 ? (
          <span className="font-mono text-red-600 text-right block">
            ({formatMoney(row.original.deductions)})
          </span>
        ) : (
          <span className="font-mono text-[var(--color-text-muted)] text-right block">
            $0.00
          </span>
        ),
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => (
        <SortableHeader column={column} className="justify-end">
          Total
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono font-bold text-[var(--color-text-primary)] text-right block">
          {formatMoney(row.original.total_amount)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} />
      ),
      filterFn: (row, _id, filterValue) => {
        if (!filterValue || filterValue === "all") return true;
        return row.original.status === filterValue;
      },
    },
    {
      id: "actions",
      header: "",
      size: 60,
      cell: ({ row }) => {
        const settlement = row.original;
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
                  router.push(`/admin/settlements/${settlement.id}`)
                }
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`/api/settlements/${settlement.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {settlement.status === "draft" && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleApprove(settlement.id)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => handleDelete(settlement.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {settlement.status === "approved" && (
                <DropdownMenuItem
                  onClick={() => handlePay(settlement.id)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay Now
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Tab filtering
  const filterByTab = (tab: string) => {
    if (tab === "all") return settlements;
    return settlements.filter((s) => s.status === tab);
  };

  // Tab counts
  const counts = {
    all: settlements.length,
    draft: settlements.filter((s) => s.status === "draft").length,
    approved: settlements.filter((s) => s.status === "approved").length,
    paid: settlements.filter((s) => s.status === "paid").length,
  };

  return (
    <div className="animate-slide-up-fade">
      <PageHeader
        iconName="wallet"
        title="Carrier Settlements"
        description="Generate, approve, and pay carrier settlements"
        actionLabel="Generate Settlement"
        onAction={() => setShowGenerate(true)}
      />

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({counts.draft})</TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({counts.approved})
          </TabsTrigger>
          <TabsTrigger value="paid">Paid ({counts.paid})</TabsTrigger>
        </TabsList>

        {(["all", "draft", "approved", "paid"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <DataTable
              columns={columns}
              data={filterByTab(tab)}
              searchKey="carrier"
              searchPlaceholder="Search settlements..."
              emptyIcon={
                <Wallet className="h-10 w-10 text-[var(--color-text-muted)]" />
              }
              emptyTitle="No settlements found"
              emptyDescription={
                tab === "all"
                  ? "Generate your first carrier settlement to get started."
                  : `No ${tab} settlements.`
              }
              onRowClick={(row) =>
                router.push(`/admin/settlements/${row.id}`)
              }
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Generate Settlement Dialog */}
      <GenerateSettlementDialog
        open={showGenerate}
        onOpenChange={setShowGenerate}
        carriers={carriers}
      />
    </div>
  );
}
