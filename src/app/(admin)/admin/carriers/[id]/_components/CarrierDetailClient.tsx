"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Truck as TruckIcon,
  Phone,
  Mail,
  MapPin,
  Shield,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable, SortableHeader } from "@/components/admin/DataTable";
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
import { DriverForm } from "../../_components/DriverForm";
import { TruckForm } from "../../_components/TruckForm";
import {
  createDriver,
  updateDriver,
  deleteDriver,
  createTruck,
  updateTruck,
  deleteTruck,
} from "../../_actions/carriers.actions";
import type { Carrier, Driver, Truck } from "@/types/database";
import type { CreateDriverInput } from "@/lib/schemas/driver";
import type { CreateTruckInput } from "@/lib/schemas/truck";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CarrierDetailClientProps {
  carrier: Carrier;
  drivers: Driver[];
  trucks: Truck[];
}

// ---------------------------------------------------------------------------
// Driver columns
// ---------------------------------------------------------------------------

function createDriverColumns(
  onEdit: (d: Driver) => void,
  onDelete: (d: Driver) => void
): ColumnDef<Driver>[] {
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
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)] font-mono text-xs">
          {row.original.phone || "--"}
        </span>
      ),
    },
    {
      accessorKey: "license_number",
      header: "License #",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)] font-mono text-xs">
          {row.original.license_number || "--"}
        </span>
      ),
    },
    {
      accessorKey: "license_expiry",
      header: "License Expiry",
      cell: ({ row }) => {
        const expiry = row.original.license_expiry;
        if (!expiry) return <span className="text-[var(--color-text-muted)]">--</span>;
        const isExpired = new Date(expiry) < new Date();
        return (
          <span className={`font-mono text-xs ${isExpired ? "text-red-600" : "text-[var(--color-text-secondary)]"}`}>
            {new Date(expiry).toLocaleDateString()}
          </span>
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
            <Button variant="ghost" size="icon-xs">
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
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 50,
    },
  ];
}

// ---------------------------------------------------------------------------
// Truck columns
// ---------------------------------------------------------------------------

function createTruckColumns(
  onEdit: (t: Truck) => void,
  onDelete: (t: Truck) => void
): ColumnDef<Truck>[] {
  return [
    {
      accessorKey: "number",
      header: ({ column }) => (
        <SortableHeader column={column}>Truck #</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="font-mono font-medium text-[var(--color-text-primary)]">
          {row.original.number}
        </span>
      ),
    },
    {
      accessorKey: "license_plate",
      header: "Plate",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-[var(--color-text-secondary)]">
          {row.original.license_plate || "--"}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-[var(--color-text-secondary)]">
          {row.original.type || "--"}
        </span>
      ),
    },
    {
      accessorKey: "capacity_tons",
      header: "Capacity",
      cell: ({ row }) => (
        <span className="font-mono text-[var(--color-text-secondary)]">
          {row.original.capacity_tons
            ? `${row.original.capacity_tons} tons`
            : "--"}
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
            <Button variant="ghost" size="icon-xs">
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
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 50,
    },
  ];
}

// ---------------------------------------------------------------------------
// CarrierDetailClient
// ---------------------------------------------------------------------------

export function CarrierDetailClient({
  carrier,
  drivers,
  trucks,
}: CarrierDetailClientProps) {
  // Driver state
  const [driverFormOpen, setDriverFormOpen] = useState(false);
  const [driverDeleteOpen, setDriverDeleteOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null);
  const [driverSubmitting, setDriverSubmitting] = useState(false);

  // Truck state
  const [truckFormOpen, setTruckFormOpen] = useState(false);
  const [truckDeleteOpen, setTruckDeleteOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [deletingTruck, setDeletingTruck] = useState<Truck | null>(null);
  const [truckSubmitting, setTruckSubmitting] = useState(false);

  // Driver handlers
  const handleDriverSubmit = useCallback(
    async (data: CreateDriverInput) => {
      setDriverSubmitting(true);
      try {
        const result = editingDriver
          ? await updateDriver(editingDriver.id, data)
          : await createDriver(data);
        if (result.success) {
          toast.success(editingDriver ? "Driver updated" : "Driver added");
          setDriverFormOpen(false);
          setEditingDriver(null);
        } else {
          toast.error(result.error);
        }
      } finally {
        setDriverSubmitting(false);
      }
    },
    [editingDriver]
  );

  const handleDriverDelete = useCallback(async () => {
    if (!deletingDriver) return;
    const result = await deleteDriver(deletingDriver.id);
    if (result.success) toast.success("Driver removed");
    else toast.error(result.error);
  }, [deletingDriver]);

  // Truck handlers
  const handleTruckSubmit = useCallback(
    async (data: CreateTruckInput) => {
      setTruckSubmitting(true);
      try {
        const result = editingTruck
          ? await updateTruck(editingTruck.id, data)
          : await createTruck(data);
        if (result.success) {
          toast.success(editingTruck ? "Truck updated" : "Truck added");
          setTruckFormOpen(false);
          setEditingTruck(null);
        } else {
          toast.error(result.error);
        }
      } finally {
        setTruckSubmitting(false);
      }
    },
    [editingTruck]
  );

  const handleTruckDelete = useCallback(async () => {
    if (!deletingTruck) return;
    const result = await deleteTruck(deletingTruck.id);
    if (result.success) toast.success("Truck removed");
    else toast.error(result.error);
  }, [deletingTruck]);

  const driverColumns = createDriverColumns(
    (d) => { setEditingDriver(d); setDriverFormOpen(true); },
    (d) => { setDeletingDriver(d); setDriverDeleteOpen(true); }
  );

  const truckColumns = createTruckColumns(
    (t) => { setEditingTruck(t); setTruckFormOpen(true); },
    (t) => { setDeletingTruck(t); setTruckDeleteOpen(true); }
  );

  return (
    <div className="animate-slide-up-fade space-y-6">
      {/* Back button */}
      <Link
        href="/admin/carriers"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Carriers
      </Link>

      {/* Carrier info card */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl text-[var(--color-text-primary)]">
              {carrier.name}
            </CardTitle>
            <StatusBadge status={carrier.status} className="mt-2" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {carrier.contact_name && (
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <UserPlus className="h-4 w-4 text-[var(--color-text-muted)]" />
                {carrier.contact_name}
              </div>
            )}
            {carrier.phone && (
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <Phone className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span className="font-mono">{carrier.phone}</span>
              </div>
            )}
            {carrier.email && (
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <Mail className="h-4 w-4 text-[var(--color-text-muted)]" />
                {carrier.email}
              </div>
            )}
            {carrier.address && (
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <MapPin className="h-4 w-4 text-[var(--color-text-muted)]" />
                {carrier.address}
              </div>
            )}
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
              <span className="text-[var(--color-text-muted)] text-xs">Dispatch Fee:</span>
              <span className="font-mono font-medium text-[var(--color-text-primary)]">
                ${carrier.dispatch_fee_weekly.toFixed(2)}/wk
              </span>
            </div>
            {carrier.ein && (
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <FileText className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span className="font-mono">{carrier.ein}</span>
              </div>
            )}
            {carrier.insurance_expiry && (
              <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                <Shield className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span className="font-mono">
                  Ins: {new Date(carrier.insurance_expiry).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Drivers & Trucks tabs */}
      <Tabs defaultValue="drivers">
        <TabsList variant="line">
          <TabsTrigger value="drivers">
            Drivers
            <span className="ml-1.5 text-xs font-mono text-[var(--color-text-muted)]">
              {drivers.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="trucks">
            Trucks
            <span className="ml-1.5 text-xs font-mono text-[var(--color-text-muted)]">
              {trucks.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Drivers tab */}
        <TabsContent value="drivers" className="mt-4">
          <DataTable
            columns={driverColumns}
            data={drivers}
            searchKey="name"
            searchPlaceholder="Search drivers..."
            emptyTitle="No drivers"
            emptyDescription="Add drivers for this carrier."
            toolbar={
              <Button
                size="sm"
                onClick={() => {
                  setEditingDriver(null);
                  setDriverFormOpen(true);
                }}
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Driver</span>
              </Button>
            }
          />
        </TabsContent>

        {/* Trucks tab */}
        <TabsContent value="trucks" className="mt-4">
          <DataTable
            columns={truckColumns}
            data={trucks}
            searchKey="number"
            searchPlaceholder="Search trucks..."
            emptyTitle="No trucks"
            emptyDescription="Add trucks for this carrier."
            toolbar={
              <Button
                size="sm"
                onClick={() => {
                  setEditingTruck(null);
                  setTruckFormOpen(true);
                }}
              >
                <TruckIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Add Truck</span>
              </Button>
            }
          />
        </TabsContent>
      </Tabs>

      {/* Driver Form Dialog */}
      <FormDialog
        open={driverFormOpen}
        onOpenChange={(open) => {
          setDriverFormOpen(open);
          if (!open) setEditingDriver(null);
        }}
        title={editingDriver ? "Edit Driver" : "Add Driver"}
        description={`${editingDriver ? "Update" : "Add a new"} driver for ${carrier.name}.`}
      >
        <DriverForm
          carrierId={carrier.id}
          initialData={editingDriver}
          onSubmit={handleDriverSubmit}
          isSubmitting={driverSubmitting}
        />
      </FormDialog>

      {/* Truck Form Dialog */}
      <FormDialog
        open={truckFormOpen}
        onOpenChange={(open) => {
          setTruckFormOpen(open);
          if (!open) setEditingTruck(null);
        }}
        title={editingTruck ? "Edit Truck" : "Add Truck"}
        description={`${editingTruck ? "Update" : "Add a new"} truck for ${carrier.name}.`}
      >
        <TruckForm
          carrierId={carrier.id}
          initialData={editingTruck}
          onSubmit={handleTruckSubmit}
          isSubmitting={truckSubmitting}
        />
      </FormDialog>

      {/* Delete Dialogs */}
      <DeleteDialog
        open={driverDeleteOpen}
        onOpenChange={setDriverDeleteOpen}
        entityName={deletingDriver?.name ?? ""}
        onConfirm={handleDriverDelete}
      />
      <DeleteDialog
        open={truckDeleteOpen}
        onOpenChange={setTruckDeleteOpen}
        entityName={deletingTruck ? `Truck ${deletingTruck.number}` : ""}
        onConfirm={handleTruckDelete}
      />
    </div>
  );
}
