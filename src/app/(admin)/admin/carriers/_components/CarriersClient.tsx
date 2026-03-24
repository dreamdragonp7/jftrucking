"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, SortableHeader } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { FormDialog } from "@/components/admin/FormDialog";
import { DeleteDialog } from "@/components/admin/DeleteDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CarrierForm } from "./CarrierForm";
import {
  createCarrier,
  updateCarrier,
  deleteCarrier,
} from "../_actions/carriers.actions";
import type { Carrier } from "@/types/database";
import type { CreateCarrierInput } from "@/lib/schemas/carrier";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CarrierWithCounts extends Carrier {
  drivers_count?: number;
  trucks_count?: number;
}

interface CarriersClientProps {
  carriers: CarrierWithCounts[];
}

// ---------------------------------------------------------------------------
// Insurance status helper
// ---------------------------------------------------------------------------

function getInsuranceStatus(expiry: string | null) {
  if (!expiry) return { label: "Not Set", variant: "muted" as const };
  const today = new Date();
  const expiryDate = new Date(expiry);
  const daysUntil = Math.ceil(
    (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil < 0) return { label: "Expired", variant: "expired" as const };
  if (daysUntil <= 30) return { label: `${daysUntil}d left`, variant: "warning" as const };
  return { label: expiryDate.toLocaleDateString(), variant: "ok" as const };
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

function createColumns(
  onEdit: (c: Carrier) => void,
  onDelete: (c: Carrier) => void
): ColumnDef<CarrierWithCounts>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column}>Company</SortableHeader>
      ),
      cell: ({ row }) => (
        <Link
          href={`/admin/carriers/${row.original.id}`}
          className="font-medium text-[var(--color-text-primary)] hover:text-brand-brown transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "contact_name",
      header: "Contact",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original.contact_name || "--"}
        </span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)] font-mono text-xs">
          {row.original.phone || "--"}
        </span>
      ),
    },
    {
      accessorKey: "dispatch_fee_weekly",
      header: ({ column }) => (
        <SortableHeader column={column}>Fee/Week</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-[var(--color-text-primary)]">
          ${row.original.dispatch_fee_weekly.toFixed(2)}
        </span>
      ),
    },
    {
      id: "insurance",
      header: "Insurance",
      cell: ({ row }) => {
        const status = getInsuranceStatus(row.original.insurance_expiry);
        const Icon =
          status.variant === "expired"
            ? ShieldAlert
            : status.variant === "warning"
              ? Shield
              : ShieldCheck;
        const color =
          status.variant === "expired"
            ? "text-red-600"
            : status.variant === "warning"
              ? "text-amber-600"
              : status.variant === "muted"
                ? "text-[var(--color-text-muted)]"
                : "text-emerald-600";

        return (
          <div className={`flex items-center gap-1.5 text-xs ${color}`}>
            <Icon className="h-3.5 w-3.5" />
            <span className="font-mono">{status.label}</span>
          </div>
        );
      },
    },
    {
      id: "w9",
      header: "W-9",
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.w9_url ? (
            <span className="text-emerald-600 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              On file
            </span>
          ) : (
            <span className="text-[var(--color-text-muted)]">Missing</span>
          )}
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
      cell: ({ row }) => (
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
            <DropdownMenuItem asChild>
              <Link href={`/admin/carriers/${row.original.id}`}>
                <Eye className="h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(row.original)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 50,
    },
  ];
}

// ---------------------------------------------------------------------------
// CarriersClient
// ---------------------------------------------------------------------------

export function CarriersClient({ carriers }: CarriersClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [deletingCarrier, setDeletingCarrier] = useState<Carrier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = useCallback(() => {
    setEditingCarrier(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((carrier: Carrier) => {
    setEditingCarrier(carrier);
    setFormOpen(true);
  }, []);

  const handleDeleteClick = useCallback((carrier: Carrier) => {
    setDeletingCarrier(carrier);
    setDeleteOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (data: CreateCarrierInput) => {
      setIsSubmitting(true);
      try {
        const result = editingCarrier
          ? await updateCarrier(editingCarrier.id, data)
          : await createCarrier(data);

        if (result.success) {
          toast.success(
            editingCarrier ? "Carrier updated" : "Carrier created"
          );
          setFormOpen(false);
          setEditingCarrier(null);
        } else {
          toast.error(result.error);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingCarrier]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingCarrier) return;
    const result = await deleteCarrier(deletingCarrier.id);
    if (result.success) {
      toast.success("Carrier deactivated");
    } else {
      toast.error(result.error);
    }
  }, [deletingCarrier]);

  const columns = createColumns(handleEdit, handleDeleteClick);

  return (
    <div className="animate-slide-up-fade">
      <PageHeader
        iconName="users"
        title="Carriers"
        description="Manage carrier profiles, drivers, and trucks"
        actionLabel="Add Carrier"
        onAction={handleCreate}
      />

      <DataTable
        columns={columns}
        data={carriers}
        searchKey="name"
        searchPlaceholder="Search carriers..."
        emptyTitle="No carriers yet"
        emptyDescription="Add your first carrier to start dispatching."
      />

      {/* Create/Edit Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingCarrier(null);
        }}
        title={editingCarrier ? "Edit Carrier" : "New Carrier"}
        description={
          editingCarrier
            ? "Update carrier details."
            : "Add a new carrier company."
        }
      >
        <CarrierForm
          initialData={editingCarrier}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </FormDialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={deletingCarrier?.name ?? ""}
        onConfirm={handleDelete}
        description={`This will deactivate "${deletingCarrier?.name}" and their drivers/trucks.`}
      />
    </div>
  );
}
