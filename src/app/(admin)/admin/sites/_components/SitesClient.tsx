"use client";

import { useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, MapPin } from "lucide-react";
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
import { SiteForm } from "./SiteForm";
import { createSite, updateSite, deleteSite } from "../_actions/sites.actions";
import type { SiteWithCustomer, Customer } from "@/types/database";
import type { CreateSiteInput } from "@/lib/schemas/site";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SitesClientProps {
  sites: SiteWithCustomer[];
  customers: Pick<Customer, "id" | "name">[];
}

// ---------------------------------------------------------------------------
// Columns — defined outside component to avoid recreation
// ---------------------------------------------------------------------------

function createColumns(
  onEdit: (site: SiteWithCustomer) => void,
  onDelete: (site: SiteWithCustomer) => void
): ColumnDef<SiteWithCustomer>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column}>Name</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-[var(--color-text-primary)]">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <StatusBadge status={row.original.type} />,
      filterFn: (row, _id, filterValue) => {
        if (!filterValue || filterValue === "all") return true;
        return row.original.type === filterValue;
      },
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => {
        const { city, state } = row.original;
        if (!city && !state) return <span className="text-[var(--color-text-muted)]">--</span>;
        return (
          <span className="text-[var(--color-text-secondary)]">
            {[city, state].filter(Boolean).join(", ")}
          </span>
        );
      },
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const customer = row.original.customer;
        if (!customer) return <span className="text-[var(--color-text-muted)]">--</span>;
        return (
          <span className="text-[var(--color-text-secondary)]">
            {customer.name}
          </span>
        );
      },
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => {
        const { contact_name, contact_phone } = row.original;
        if (!contact_name && !contact_phone)
          return <span className="text-[var(--color-text-muted)]">--</span>;
        return (
          <div className="text-sm">
            {contact_name && (
              <div className="text-[var(--color-text-secondary)]">
                {contact_name}
              </div>
            )}
            {contact_phone && (
              <div className="text-xs text-[var(--color-text-muted)] font-mono">
                {contact_phone}
              </div>
            )}
          </div>
        );
      },
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
// SitesClient
// ---------------------------------------------------------------------------

export function SitesClient({ sites, customers }: SitesClientProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteWithCustomer | null>(null);
  const [deletingSite, setDeletingSite] = useState<SiteWithCustomer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const handleCreate = useCallback(() => {
    setEditingSite(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((site: SiteWithCustomer) => {
    setEditingSite(site);
    setFormOpen(true);
  }, []);

  const handleDeleteClick = useCallback((site: SiteWithCustomer) => {
    setDeletingSite(site);
    setDeleteOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (data: CreateSiteInput) => {
      setIsSubmitting(true);
      try {
        const result = editingSite
          ? await updateSite(editingSite.id, data)
          : await createSite(data);

        if (result.success) {
          toast.success(editingSite ? "Site updated" : "Site created");
          setFormOpen(false);
          setEditingSite(null);
        } else {
          toast.error(result.error);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingSite]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingSite) return;
    const result = await deleteSite(deletingSite.id);
    if (result.success) {
      toast.success("Site deactivated");
    } else {
      toast.error(result.error);
    }
  }, [deletingSite]);

  const columns = createColumns(handleEdit, handleDeleteClick);

  // Filter sites by tab
  const filteredSites =
    activeTab === "all"
      ? sites
      : activeTab === "quarry_plant"
        ? sites.filter((s) => s.type === "quarry" || s.type === "plant")
        : sites.filter((s) => s.type === "jobsite");

  return (
    <div className="animate-slide-up-fade">
      <PageHeader
        iconName="map-pin"
        title="Sites"
        description="Quarries, plants, and job site locations"
        actionLabel="Add Site"
        onAction={handleCreate}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="all">
            All Sites
            <span className="ml-1.5 text-xs font-mono text-[var(--color-text-muted)]">
              {sites.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="quarry_plant">Quarries / Plants</TabsTrigger>
          <TabsTrigger value="jobsite">Job Sites</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <DataTable
            columns={columns}
            data={filteredSites}
            searchKey="name"
            searchPlaceholder="Search sites..."
            onRowClick={handleEdit}
            emptyTitle="No sites yet"
            emptyDescription="Add your first quarry, plant, or job site."
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingSite(null);
        }}
        title={editingSite ? "Edit Site" : "New Site"}
        description={
          editingSite
            ? "Update site details below."
            : "Add a new quarry, plant, or job site."
        }
      >
        <SiteForm
          initialData={editingSite}
          customers={customers}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </FormDialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName={deletingSite?.name ?? ""}
        onConfirm={handleDelete}
        description={`This will deactivate "${deletingSite?.name}". The site will no longer appear in dispatch options.`}
      />
    </div>
  );
}
