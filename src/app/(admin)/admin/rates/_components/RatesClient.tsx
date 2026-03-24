"use client";

import { useState, useCallback, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, XCircle, Calculator } from "lucide-react";
import { toast } from "sonner";
import { DataTable, SortableHeader } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { FormDialog } from "@/components/admin/FormDialog";
import { DeleteDialog } from "@/components/admin/DeleteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RateForm } from "./RateForm";
import { createRate, updateRate, deactivateRate } from "../_actions/rates.actions";
import type { RateWithRelations } from "@/lib/data/rates.data";
import type { Rate, Customer, Carrier, Material, Site } from "@/types/database";
import type { CreateRateInput } from "@/lib/schemas/rate";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RatesClientProps {
  rates: RateWithRelations[];
  customers: Pick<Customer, "id" | "name">[];
  carriers: Pick<Carrier, "id" | "name">[];
  materials: Pick<Material, "id" | "name">[];
  sites: Pick<Site, "id" | "name">[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRateActive(rate: RateWithRelations): boolean {
  if (!rate.expiration_date) return true;
  return new Date(rate.expiration_date) >= new Date();
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

function createColumns(
  onEdit: (r: RateWithRelations) => void,
  onDeactivate: (r: RateWithRelations) => void
): ColumnDef<RateWithRelations>[] {
  return [
    {
      id: "entity",
      header: ({ column }) => (
        <SortableHeader column={column}>Customer / Carrier</SortableHeader>
      ),
      accessorFn: (row) =>
        row.type === "customer"
          ? row.customer?.name ?? "--"
          : row.carrier?.name ?? "--",
      cell: ({ row }) => {
        const r = row.original;
        const name =
          r.type === "customer"
            ? r.customer?.name
            : r.carrier?.name;
        return (
          <div className="flex items-center gap-2">
            <StatusBadge status={r.type} />
            <span className="font-medium text-[var(--color-text-primary)]">
              {name ?? "--"}
            </span>
          </div>
        );
      },
    },
    {
      id: "material",
      header: "Material",
      accessorFn: (row) => row.material?.name ?? "--",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original.material?.name ?? "--"}
        </span>
      ),
    },
    {
      accessorKey: "rate_per_unit",
      header: ({ column }) => (
        <SortableHeader column={column}>Rate</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono font-medium text-[var(--color-text-primary)]">
          ${row.original.rate_per_unit.toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "rate_type",
      header: "Type",
      cell: ({ row }) => <StatusBadge status={row.original.rate_type} />,
    },
    {
      id: "pickup",
      header: "Pickup",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)] text-xs">
          {row.original.pickup_site?.name ?? "Any"}
        </span>
      ),
    },
    {
      id: "delivery",
      header: "Delivery",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)] text-xs">
          {row.original.delivery_site?.name ?? "Any"}
        </span>
      ),
    },
    {
      accessorKey: "effective_date",
      header: "Effective",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-[var(--color-text-secondary)]">
          {new Date(row.original.effective_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "expiry",
      header: "Expiry",
      cell: ({ row }) => {
        const exp = row.original.expiration_date;
        if (!exp) {
          return (
            <StatusBadge status="active" label="Active" />
          );
        }
        const active = isRateActive(row.original);
        return (
          <span
            className={`font-mono text-xs ${
              active ? "text-[var(--color-text-secondary)]" : "text-red-600"
            }`}
          >
            {new Date(exp).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const active = isRateActive(row.original);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {active && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDeactivate(row.original)}
                >
                  <XCircle className="h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    },
  ];
}

// ---------------------------------------------------------------------------
// Margin card
// ---------------------------------------------------------------------------

function MarginSummary({ rates }: { rates: RateWithRelations[] }) {
  const margins = useMemo(() => {
    const materialMap = new Map<
      string,
      { name: string; customerRate: number | null; carrierRate: number | null }
    >();

    for (const r of rates) {
      if (!isRateActive(r)) continue;
      const matId = r.material_id;
      const matName = r.material?.name ?? "Unknown";
      if (!materialMap.has(matId)) {
        materialMap.set(matId, { name: matName, customerRate: null, carrierRate: null });
      }
      const entry = materialMap.get(matId)!;
      if (r.type === "customer" && (entry.customerRate === null || r.rate_per_unit > entry.customerRate)) {
        entry.customerRate = r.rate_per_unit;
      }
      if (r.type === "carrier" && (entry.carrierRate === null || r.rate_per_unit < entry.carrierRate)) {
        entry.carrierRate = r.rate_per_unit;
      }
    }

    return Array.from(materialMap.values())
      .filter((m) => m.customerRate !== null && m.carrierRate !== null)
      .map((m) => ({
        material: m.name,
        customerRate: m.customerRate!,
        carrierRate: m.carrierRate!,
        margin: m.customerRate! - m.carrierRate!,
        pct:
          m.customerRate! > 0
            ? ((m.customerRate! - m.carrierRate!) / m.customerRate!) * 100
            : 0,
      }));
  }, [rates]);

  if (margins.length === 0) return null;

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-[var(--color-text-primary)]">
          Margin Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {margins.map((m) => (
            <div
              key={m.material}
              className="rounded-lg border border-[var(--color-border)] p-3 space-y-1"
            >
              <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                {m.material}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-lg font-bold text-emerald-600">
                  ${m.margin.toFixed(2)}
                </span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">
                  ({m.pct.toFixed(1)}%)
                </span>
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
                ${m.customerRate.toFixed(2)} cust - ${m.carrierRate.toFixed(2)}{" "}
                carrier
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// RatesClient
// ---------------------------------------------------------------------------

export function RatesClient({
  rates,
  customers,
  carriers,
  materials,
  sites,
}: RatesClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<RateWithRelations | null>(null);
  const [deactivatingRate, setDeactivatingRate] =
    useState<RateWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const handleCreate = useCallback(() => {
    setEditingRate(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((rate: RateWithRelations) => {
    setEditingRate(rate);
    setFormOpen(true);
  }, []);

  const handleDeactivateClick = useCallback((rate: RateWithRelations) => {
    setDeactivatingRate(rate);
    setDeactivateOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (data: CreateRateInput) => {
      setIsSubmitting(true);
      try {
        const result = editingRate
          ? await updateRate(editingRate.id, data)
          : await createRate(data);

        if (result.success) {
          toast.success(editingRate ? "Rate updated" : "Rate created");
          setFormOpen(false);
          setEditingRate(null);
        } else {
          toast.error(result.error);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingRate]
  );

  const handleDeactivate = useCallback(async () => {
    if (!deactivatingRate) return;
    const result = await deactivateRate(deactivatingRate.id);
    if (result.success) {
      toast.success("Rate deactivated");
    } else {
      toast.error(result.error);
    }
  }, [deactivatingRate]);

  const columns = createColumns(handleEdit, handleDeactivateClick);

  const filteredRates =
    activeTab === "all"
      ? rates
      : activeTab === "customer"
        ? rates.filter((r) => r.type === "customer")
        : rates.filter((r) => r.type === "carrier");

  return (
    <div className="animate-slide-up-fade space-y-6">
      <PageHeader
        iconName="calculator"
        title="Rate Cards"
        description="Customer and carrier material pricing"
        actionLabel="New Rate"
        onAction={handleCreate}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="all">
            All Rates
            <span className="ml-1.5 text-xs font-mono text-[var(--color-text-muted)]">
              {rates.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="customer">Customer Rates</TabsTrigger>
          <TabsTrigger value="carrier">Carrier Rates</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <DataTable
            columns={columns}
            data={filteredRates}
            searchKey="entity"
            searchPlaceholder="Search rates..."
            onRowClick={handleEdit}
            emptyTitle="No rates configured"
            emptyDescription="Create your first rate card for a customer or carrier."
          />
        </TabsContent>
      </Tabs>

      {/* Margin summary */}
      <MarginSummary rates={rates} />

      {/* Create/Edit Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingRate(null);
        }}
        title={editingRate ? "Edit Rate" : "New Rate"}
        description={
          editingRate
            ? "Update rate details."
            : "Create a new rate card for a customer or carrier."
        }
      >
        <RateForm
          initialData={editingRate}
          customers={customers}
          carriers={carriers}
          materials={materials}
          sites={sites}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </FormDialog>

      {/* Deactivate Dialog */}
      <DeleteDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate Rate"
        entityName={
          deactivatingRate
            ? `${deactivatingRate.material?.name} rate`
            : ""
        }
        description={`This will set the expiration date to today. The rate will no longer be used for new dispatches.`}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
