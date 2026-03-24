"use client";

import { useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchaseOrderForm } from "./PurchaseOrderForm";
import { POProgressBar } from "./POProgressBar";
import {
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
} from "../_actions/purchase-orders.actions";
import type {
  Customer,
  Material,
  Site,
  PurchaseOrderWithRelations,
} from "@/types/database";
import type { CreatePurchaseOrderInput } from "@/lib/schemas/purchase-order";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PurchaseOrdersClientProps {
  purchaseOrders: PurchaseOrderWithRelations[];
  customers: Customer[];
  materials: Material[];
  sites: Site[];
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

function createColumns(
  onEdit: (po: PurchaseOrderWithRelations) => void,
  onDelete: (po: PurchaseOrderWithRelations) => void,
  materials: Material[]
): ColumnDef<PurchaseOrderWithRelations>[] {
  return [
    {
      accessorKey: "po_number",
      header: ({ column }) => (
        <SortableHeader column={column}>PO #</SortableHeader>
      ),
      cell: ({ row }) => (
        <button
          onClick={() => onEdit(row.original)}
          className="font-semibold text-[var(--color-brand-gold)] hover:underline"
        >
          {row.original.po_number}
        </button>
      ),
    },
    {
      accessorKey: "customer.name",
      header: ({ column }) => (
        <SortableHeader column={column}>Customer</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-[var(--color-text-primary)]">
          {row.original.customer?.name ?? "--"}
        </span>
      ),
    },
    {
      accessorKey: "material.name",
      header: "Material",
      cell: ({ row }) => {
        const mat = row.original.material;
        return mat ? (
          <StatusBadge
            status={mat.name.toLowerCase().replace(/\s+/g, "_")}
            label={mat.name}
          />
        ) : (
          "--"
        );
      },
    },
    {
      accessorKey: "delivery_site.name",
      header: "Delivery Site",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)] text-sm">
          {row.original.delivery_site?.name ?? "--"}
        </span>
      ),
    },
    {
      accessorKey: "quantity_ordered",
      header: ({ column }) => (
        <SortableHeader column={column}>Ordered</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-[var(--color-text-primary)]">
          {row.original.quantity_ordered}
        </span>
      ),
    },
    {
      accessorKey: "quantity_delivered",
      header: "Delivered",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-[var(--color-text-secondary)]">
          {row.original.quantity_delivered}
        </span>
      ),
    },
    {
      id: "progress",
      header: "Progress",
      cell: ({ row }) => (
        <POProgressBar
          delivered={row.original.quantity_delivered}
          ordered={row.original.quantity_ordered}
        />
      ),
      size: 160,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const po = row.original;
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
              <DropdownMenuItem onClick={() => onEdit(po)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(po)}
              >
                <Trash2 className="h-4 w-4" />
                Cancel PO
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    },
  ];
}

// ---------------------------------------------------------------------------
// PurchaseOrdersClient
// ---------------------------------------------------------------------------

export function PurchaseOrdersClient({
  purchaseOrders,
  customers,
  materials,
  sites,
}: PurchaseOrdersClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrderWithRelations | null>(
    null
  );
  const [deletingPO, setDeletingPO] =
    useState<PurchaseOrderWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const handleCreate = useCallback(() => {
    setEditingPO(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((po: PurchaseOrderWithRelations) => {
    setEditingPO(po);
    setFormOpen(true);
  }, []);

  const handleDeleteClick = useCallback(
    (po: PurchaseOrderWithRelations) => {
      setDeletingPO(po);
      setDeleteOpen(true);
    },
    []
  );

  const handleSubmit = useCallback(
    async (data: CreatePurchaseOrderInput) => {
      setIsSubmitting(true);
      try {
        const result = editingPO
          ? await updatePurchaseOrder(editingPO.id, data)
          : await createPurchaseOrder(data);

        if (result.success) {
          toast.success(
            editingPO ? "Purchase order updated" : "Purchase order created"
          );
          setFormOpen(false);
          setEditingPO(null);
        } else {
          toast.error(result.error);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingPO]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingPO) return;
    const result = await deletePurchaseOrder(deletingPO.id);
    if (result.success) {
      toast.success("Purchase order cancelled");
    } else {
      toast.error(result.error);
    }
  }, [deletingPO]);

  const columns = createColumns(handleEdit, handleDeleteClick, materials);

  const activeCount = purchaseOrders.filter(
    (po) => po.status === "active"
  ).length;
  const fulfilledCount = purchaseOrders.filter(
    (po) => po.status === "fulfilled"
  ).length;
  const onHoldCount = purchaseOrders.filter(
    (po) => po.status === "on_hold"
  ).length;

  const filteredPOs =
    activeTab === "all"
      ? purchaseOrders
      : purchaseOrders.filter((po) => po.status === activeTab);

  return (
    <div className="animate-slide-up-fade">
      <PageHeader
        iconName="clipboard-list"
        title="Purchase Orders"
        description="Track customer POs and delivery fulfillment"
        actionLabel="New PO"
        onAction={handleCreate}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="all">
            All
            <span className="ml-1.5 text-xs font-mono text-[var(--color-text-muted)]">
              {purchaseOrders.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            <span className="ml-1.5 text-xs font-mono text-[var(--color-text-muted)]">
              {activeCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="fulfilled">Fulfilled</TabsTrigger>
          <TabsTrigger value="on_hold">
            On Hold
            {onHoldCount > 0 && (
              <span className="ml-1.5 text-xs font-mono bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">
                {onHoldCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <DataTable
            columns={columns}
            data={filteredPOs}
            searchKey="po_number"
            searchPlaceholder="Search POs..."
            onRowClick={handleEdit}
            emptyTitle="No purchase orders"
            emptyDescription="Create your first PO to start tracking deliveries."
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPO(null);
        }}
        title={editingPO ? "Edit Purchase Order" : "New Purchase Order"}
        description={
          editingPO
            ? "Update purchase order details below."
            : "Create a new purchase order for a customer."
        }
      >
        <PurchaseOrderForm
          initialData={editingPO}
          customers={customers}
          materials={materials}
          sites={sites}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </FormDialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Cancel Purchase Order"
        entityName={deletingPO?.po_number ?? ""}
        onConfirm={handleDelete}
        description={`This will cancel PO "${deletingPO?.po_number}". Existing deliveries will be preserved.`}
      />
    </div>
  );
}
