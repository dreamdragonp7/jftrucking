"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Send,
  LayoutGrid,
  TableIcon,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  MessageSquare,
  Pencil,
  XCircle,
  Copy,
  ArrowRight,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, SortableHeader } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { FormDialog } from "@/components/admin/FormDialog";
import { DeleteDialog } from "@/components/admin/DeleteDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DispatchCard } from "./DispatchCard";
import { DispatchForm } from "./DispatchForm";
import { DeliveriesClient } from "../../deliveries/_components/DeliveriesClient";
import {
  createDispatch,
  cancelDispatch,
  sendDispatchNotification,
  cloneDispatch,
} from "../_actions/dispatch.actions";
import { cn } from "@/lib/utils/cn";
import type {
  DispatchWithRelations,
  PurchaseOrderWithRelations,
  DriverWithCarrier,
  TruckWithCarrier,
  Material,
  Site,
} from "@/types/database";
import type { CreateDispatchInput } from "@/lib/schemas/dispatch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeliveryRow {
  id: string;
  ticket_number: string | null;
  net_weight: number | null;
  gross_weight: number | null;
  tare_weight: number | null;
  delivered_at: string;
  confirmation_status: string;
  dispute_reason: string | null;
  driver: { name: string } | null;
  truck: { number: string } | null;
  material: { name: string } | null;
  delivery_site: { name: string } | null;
  dispatch: {
    scheduled_date: string;
    carrier: { name: string } | null;
    purchase_order: {
      po_number: string;
      customer: { name: string } | null;
    } | null;
  } | null;
}

interface DispatchClientProps {
  dispatches: DispatchWithRelations[];
  purchaseOrders: PurchaseOrderWithRelations[];
  drivers: DriverWithCarrier[];
  trucks: TruckWithCarrier[];
  materials: Material[];
  sites: Site[];
  currentDate: string;
  deliveries?: DeliveryRow[];
  initialTab?: "board" | "deliveries";
}

type ViewMode = "cards" | "table";

// ---------------------------------------------------------------------------
// Status groups for card view
// ---------------------------------------------------------------------------

const STATUS_GROUPS = [
  {
    label: "Scheduled",
    statuses: ["scheduled"],
    dotColor: "bg-zinc-400",
  },
  {
    label: "Dispatched / In Progress",
    statuses: ["dispatched", "acknowledged", "in_progress"],
    dotColor: "bg-[var(--color-brand-gold)]",
  },
  {
    label: "Delivered / Pending Confirmation",
    statuses: ["delivered"],
    dotColor: "bg-sky-400",
  },
  {
    label: "Confirmed",
    statuses: ["confirmed"],
    dotColor: "bg-emerald-400",
  },
  {
    label: "Disputed",
    statuses: ["disputed"],
    dotColor: "bg-red-400",
  },
];

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

function createTableColumns(
  onSendSMS: (id: string) => Promise<void>,
  onCancel: (d: DispatchWithRelations) => void,
  onClone: (d: DispatchWithRelations) => void,
  onEdit: (d: DispatchWithRelations) => void
): ColumnDef<DispatchWithRelations>[] {
  return [
    {
      id: "dispatch_number",
      header: ({ column }) => (
        <SortableHeader column={column}>Dispatch #</SortableHeader>
      ),
      accessorFn: (row) => row.id,
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold text-[var(--color-brand-gold)]">
          #D-{String(row.index + 1).padStart(4, "0")}
        </span>
      ),
    },
    {
      accessorKey: "scheduled_date",
      header: ({ column }) => (
        <SortableHeader column={column}>Date</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-[var(--color-text-secondary)]">
          {new Date(row.original.scheduled_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      accessorKey: "material.name",
      header: "Material",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-primary)]">
          {row.original.material?.name ?? "--"}
        </span>
      ),
    },
    {
      id: "weight",
      header: "Weight",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.truck?.capacity_tons
            ? `${row.original.truck.capacity_tons}T`
            : "--"}
        </span>
      ),
    },
    {
      id: "route",
      header: "Route",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">
            {row.original.pickup_site?.name ?? "--"}
          </span>
          <ArrowRight className="h-3 w-3 text-[var(--color-text-muted)]" />
          <span className="text-[var(--color-text-secondary)]">
            {row.original.delivery_site?.name ?? "--"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "driver.name",
      header: "Driver",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-primary)]">
          {row.original.driver?.name ?? "--"}
        </span>
      ),
    },
    {
      id: "po",
      header: "PO",
      cell: ({ row }) => (
        <span className="text-xs font-mono text-[var(--color-text-muted)]">
          {row.original.purchase_order?.po_number ?? "--"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const d = row.original;
        const canDispatch = d.status === "scheduled";
        const canCancel = ["scheduled", "dispatched"].includes(d.status);
        const canEdit = d.status === "scheduled";

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
              {canDispatch && (
                <DropdownMenuItem
                  onClick={() => onSendSMS(d.id)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Dispatch SMS
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(d)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onClone(d)}>
                <Copy className="h-4 w-4" />
                Quick Clone
              </DropdownMenuItem>
              {(canDispatch || canEdit) && canCancel && (
                <DropdownMenuSeparator />
              )}
              {canCancel && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onCancel(d)}
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
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
// DispatchClient
// ---------------------------------------------------------------------------

export function DispatchClient({
  dispatches,
  purchaseOrders,
  drivers,
  trucks,
  materials,
  sites,
  currentDate,
  deliveries = [],
  initialTab = "board",
}: DispatchClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancellingDispatch, setCancellingDispatch] =
    useState<DispatchWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date navigation
  const [selectedDate, setSelectedDate] = useState(currentDate);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [materialFilter, setMaterialFilter] = useState<string>("all");

  // Date helpers
  const navigateDate = useCallback(
    (direction: -1 | 0 | 1) => {
      if (direction === 0) {
        const today = new Date().toISOString().split("T")[0];
        setSelectedDate(today);
        router.push(`/admin/dispatch?date=${today}`);
        return;
      }
      const current = new Date(selectedDate);
      current.setDate(current.getDate() + direction);
      const newDate = current.toISOString().split("T")[0];
      setSelectedDate(newDate);
      router.push(`/admin/dispatch?date=${newDate}`);
    },
    [selectedDate, router]
  );

  const formattedDate = useMemo(() => {
    return new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  // Filter dispatches
  const filteredDispatches = useMemo(() => {
    return dispatches.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (driverFilter !== "all" && d.driver_id !== driverFilter) return false;
      if (materialFilter !== "all" && d.material_id !== materialFilter)
        return false;
      return true;
    });
  }, [dispatches, statusFilter, driverFilter, materialFilter]);

  // Group dispatches by status for card view
  const groupedDispatches = useMemo(() => {
    return STATUS_GROUPS.map((group) => ({
      ...group,
      dispatches: filteredDispatches.filter((d) =>
        group.statuses.includes(d.status)
      ),
    })).filter((g) => g.dispatches.length > 0);
  }, [filteredDispatches]);

  // Handlers
  const handleCreate = useCallback(() => {
    setFormOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (data: CreateDispatchInput) => {
      setIsSubmitting(true);
      try {
        const result = await createDispatch(data);
        if (result.success) {
          toast.success("Dispatch created");
          setFormOpen(false);
        } else {
          toast.error(result.error);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const handleSendSMS = useCallback(async (dispatchId: string) => {
    const result = await sendDispatchNotification(dispatchId);
    if (result.success) {
      if (result.data.smsStatus === "skipped_no_config") {
        toast.success(
          "Dispatch status updated (SMS skipped — Twilio not configured)"
        );
      } else {
        toast.success("SMS sent to driver");
      }
    } else {
      toast.error(result.error);
    }
  }, []);

  const handleCancel = useCallback((d: DispatchWithRelations) => {
    setCancellingDispatch(d);
    setDeleteOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    if (!cancellingDispatch) return;
    const result = await cancelDispatch(cancellingDispatch.id);
    if (result.success) {
      toast.success("Dispatch cancelled");
    } else {
      toast.error(result.error);
    }
  }, [cancellingDispatch]);

  const handleClone = useCallback(
    async (d: DispatchWithRelations) => {
      const tomorrow = new Date(selectedDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const newDate = tomorrow.toISOString().split("T")[0];

      const result = await cloneDispatch(d.id, newDate);
      if (result.success) {
        toast.success(
          `Dispatch cloned for ${tomorrow.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        );
      } else {
        toast.error(result.error);
      }
    },
    [selectedDate]
  );

  const handleEdit = useCallback(
    (d: DispatchWithRelations) => {
      // For now, navigate to detail page for editing
      router.push(`/admin/dispatch/${d.id}`);
    },
    [router]
  );

  const handleRowClick = useCallback(
    (d: DispatchWithRelations) => {
      router.push(`/admin/dispatch/${d.id}`);
    },
    [router]
  );

  const tableColumns = useMemo(
    () => createTableColumns(handleSendSMS, handleCancel, handleClone, handleEdit),
    [handleSendSMS, handleCancel, handleClone, handleEdit]
  );

  // Unique drivers/materials in current data for filters
  const dispatchDrivers = useMemo(() => {
    const seen = new Map<string, string>();
    dispatches.forEach((d) => {
      if (d.driver?.name) seen.set(d.driver_id, d.driver.name);
    });
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [dispatches]);

  const dispatchMaterials = useMemo(() => {
    const seen = new Map<string, string>();
    dispatches.forEach((d) => {
      if (d.material?.name) seen.set(d.material_id, d.material.name);
    });
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [dispatches]);

  return (
    <div className="animate-slide-up-fade">
      <Tabs defaultValue={initialTab}>
        {/* Tab bar + page header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <TabsList variant="line">
            <TabsTrigger value="board" className="gap-1.5">
              <Send className="h-4 w-4" />
              Dispatch Board
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="gap-1.5">
              <Package className="h-4 w-4" />
              Deliveries
            </TabsTrigger>
          </TabsList>

          {/* Actions (only relevant for dispatch board) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border border-[var(--color-border)] rounded-lg p-0.5">
              <Button
                variant={viewMode === "cards" ? "secondary" : "ghost"}
                size="icon-xs"
                onClick={() => setViewMode("cards")}
                aria-label="Card view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon-xs"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
              >
                <TableIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button onClick={handleCreate} size="sm">
              New Dispatch
            </Button>
          </div>
        </div>

        {/* ── Dispatch Board tab ── */}
        <TabsContent value="board">
          {/* Date navigation */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => navigateDate(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDate(0)}
              className="font-medium"
            >
              {formattedDate}
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => navigateDate(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drivers</SelectItem>
                {dispatchDrivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Materials</SelectItem>
                {dispatchMaterials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xs text-[var(--color-text-muted)] font-mono ml-auto">
              {filteredDispatches.length} dispatch
              {filteredDispatches.length !== 1 ? "es" : ""}
            </span>
          </div>

          {/* Card View */}
          {viewMode === "cards" && (
            <div className="space-y-6">
              {groupedDispatches.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Send className="h-10 w-10 text-[var(--color-text-muted)]" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      No dispatches for this date
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)] max-w-sm">
                      Create a new dispatch or navigate to a different date.
                    </p>
                  </div>
                </div>
              )}

              {groupedDispatches.map((group) => (
                <div key={group.label}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={cn("h-2.5 w-2.5 rounded-full", group.dotColor)}
                    />
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {group.label}
                    </h3>
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">
                      ({group.dispatches.length})
                    </span>
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.dispatches.map((d, i) => (
                      <DispatchCard
                        key={d.id}
                        dispatch={d}
                        dispatchNumber={i + 1}
                        onSendSMS={handleSendSMS}
                        onCancel={handleCancel}
                        onClone={handleClone}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <DataTable
              columns={tableColumns}
              data={filteredDispatches}
              searchKey="driver.name"
              searchPlaceholder="Search dispatches..."
              onRowClick={handleRowClick}
              emptyTitle="No dispatches for this date"
              emptyDescription="Create a new dispatch or navigate to a different date."
            />
          )}
        </TabsContent>

        {/* ── Deliveries tab ── */}
        <TabsContent value="deliveries">
          <DeliveriesClient deliveries={deliveries} />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="New Dispatch"
        description="Assign a load to a driver."
      >
        <DispatchForm
          purchaseOrders={purchaseOrders}
          drivers={drivers}
          trucks={trucks}
          materials={materials}
          sites={sites}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </FormDialog>

      {/* Cancel Dialog */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Cancel Dispatch"
        entityName={`dispatch for ${cancellingDispatch?.driver?.name ?? "driver"}`}
        onConfirm={handleConfirmCancel}
        description="This will cancel the dispatch. The driver will not be notified automatically."
      />
    </div>
  );
}
