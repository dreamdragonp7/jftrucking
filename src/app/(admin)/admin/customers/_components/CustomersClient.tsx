"use client";

import { useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerForm } from "./CustomerForm";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  approveCustomer,
} from "../_actions/customers.actions";
import type { Customer } from "@/types/database";
import type { CreateCustomerInput } from "@/lib/schemas/customer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CustomersClientProps {
  customers: Customer[];
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

function createColumns(
  onEdit: (c: Customer) => void,
  onDelete: (c: Customer) => void,
  onApprove: (c: Customer) => void
): ColumnDef<Customer>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column}>Company</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-[var(--color-text-primary)]">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "billing_email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original.billing_email || "--"}
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
      accessorKey: "payment_terms",
      header: "Terms",
      cell: ({ row }) => (
        <StatusBadge status={row.original.payment_terms} />
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
        const customer = row.original;
        const isPending = customer.status === ("pending" as string);

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
              {isPending && (
                <>
                  <DropdownMenuItem onClick={() => onApprove(customer)}>
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => onEdit(customer)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(customer)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
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
// CustomersClient
// ---------------------------------------------------------------------------

export function CustomersClient({ customers }: CustomersClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const handleCreate = useCallback(() => {
    setEditingCustomer(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((customer: Customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  }, []);

  const handleDeleteClick = useCallback((customer: Customer) => {
    setDeletingCustomer(customer);
    setDeleteOpen(true);
  }, []);

  const handleApprove = useCallback(async (customer: Customer) => {
    const result = await approveCustomer(customer.id);
    if (result.success) {
      toast.success(`${customer.name} approved`);
    } else {
      toast.error(result.error);
    }
  }, []);

  const handleSubmit = useCallback(
    async (data: CreateCustomerInput) => {
      setIsSubmitting(true);
      try {
        const result = editingCustomer
          ? await updateCustomer(editingCustomer.id, data)
          : await createCustomer(data);

        if (result.success) {
          toast.success(
            editingCustomer ? "Customer updated" : "Customer created"
          );
          setFormOpen(false);
          setEditingCustomer(null);
        } else {
          toast.error(result.error);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingCustomer]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingCustomer) return;
    const result = await deleteCustomer(deletingCustomer.id);
    if (result.success) {
      toast.success("Customer deactivated");
    } else {
      toast.error(result.error);
    }
  }, [deletingCustomer]);

  const columns = createColumns(handleEdit, handleDeleteClick, handleApprove);

  const pendingCount = customers.filter(
    (c) => c.status === ("pending" as string)
  ).length;

  const filteredCustomers =
    activeTab === "all"
      ? customers
      : activeTab === "active"
        ? customers.filter((c) => c.status === "active")
        : customers.filter((c) => c.status === ("pending" as string));

  return (
    <div className="animate-slide-up-fade">
      <PageHeader
        iconName="building"
        title="Customers"
        description="Manage customer accounts and billing"
        actionLabel="Add Customer"
        onAction={handleCreate}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="all">
            All
            <span className="ml-1.5 text-xs font-mono text-[var(--color-text-muted)]">
              {customers.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Approval
            {pendingCount > 0 && (
              <span className="ml-1.5 text-xs font-mono bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <DataTable
            columns={columns}
            data={filteredCustomers}
            searchKey="name"
            searchPlaceholder="Search customers..."
            onRowClick={handleEdit}
            emptyTitle="No customers yet"
            emptyDescription="Add your first customer to get started."
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingCustomer(null);
        }}
        title={editingCustomer ? "Edit Customer" : "New Customer"}
        description={
          editingCustomer
            ? "Update customer details below."
            : "Add a new customer account."
        }
      >
        <CustomerForm
          initialData={editingCustomer}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </FormDialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={deletingCustomer?.name ?? ""}
        onConfirm={handleDelete}
        description={`This will deactivate "${deletingCustomer?.name}". Existing invoices and orders will be preserved.`}
      />
    </div>
  );
}
