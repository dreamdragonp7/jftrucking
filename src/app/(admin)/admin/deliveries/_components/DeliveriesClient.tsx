"use client";

import { useState, useMemo } from "react";
import {
  Truck,
  Search,
  Calendar,
  Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface DeliveriesClientProps {
  deliveries: DeliveryRow[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadCSV(deliveries: DeliveryRow[]) {
  const headers = ["Date", "Ticket #", "Customer", "Material", "Site", "Driver", "Carrier", "Weight (tons)", "Status"];
  const rows = deliveries.map((d) => [
    new Date(d.delivered_at).toLocaleDateString(),
    d.ticket_number ?? "",
    `"${(d.dispatch?.purchase_order?.customer as { name?: string } | null)?.name ?? ""}"`,
    `"${d.material?.name ?? ""}"`,
    `"${d.delivery_site?.name ?? ""}"`,
    `"${d.driver?.name ?? ""}"`,
    `"${(d.dispatch?.carrier as { name?: string } | null)?.name ?? ""}"`,
    d.net_weight?.toFixed(1) ?? "",
    d.confirmation_status,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "deliveries.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// DeliveriesClient
// ---------------------------------------------------------------------------

export function DeliveriesClient({ deliveries }: DeliveriesClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return deliveries.filter((d) => {
      if (statusFilter !== "all" && d.confirmation_status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const customerName = ((d.dispatch?.purchase_order?.customer) as { name?: string } | null)?.name ?? "";
        const driverName = d.driver?.name ?? "";
        const materialName = d.material?.name ?? "";
        const ticket = d.ticket_number ?? "";
        if (
          !customerName.toLowerCase().includes(q) &&
          !driverName.toLowerCase().includes(q) &&
          !materialName.toLowerCase().includes(q) &&
          !ticket.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [deliveries, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <Input
            placeholder="Search by ticket, customer, driver, material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => downloadCSV(filtered)}>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No deliveries found"
          description={search || statusFilter !== "all" ? "Try adjusting your filters" : "Deliveries will appear here once drivers submit them"}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface)]">
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Ticket #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Material</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] hidden lg:table-cell">Site</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] hidden lg:table-cell">Driver</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Weight</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Status</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--color-surface)]">
              {filtered.map((d) => {
                const customerName = ((d.dispatch?.purchase_order?.customer) as { name?: string } | null)?.name ?? "-";
                const carrierName = ((d.dispatch?.carrier) as { name?: string } | null)?.name;

                return (
                  <tr key={d.id} className="border-b border-[var(--color-border-subtle)] hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-[var(--color-text-primary)]">{new Date(d.delivered_at).toLocaleDateString()}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{new Date(d.delivered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--color-text-primary)]">
                      {d.ticket_number ?? `D-${d.id.slice(0, 6)}`}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-[var(--color-text-primary)] truncate max-w-[150px]">{customerName}</p>
                      {d.dispatch?.purchase_order?.po_number && (
                        <p className="text-xs text-[var(--color-text-muted)] font-mono">PO: {d.dispatch.purchase_order.po_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-primary)]">{d.material?.name ?? "-"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-[var(--color-text-secondary)]">{d.delivery_site?.name ?? "-"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-[var(--color-text-primary)]">{d.driver?.name ?? "-"}</p>
                      {carrierName && <p className="text-xs text-[var(--color-text-muted)]">{carrierName}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-text-primary)]">
                      {d.net_weight ? `${d.net_weight.toFixed(1)}t` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.confirmation_status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-[var(--color-text-muted)] text-right">
        Showing {filtered.length} of {deliveries.length} deliveries
      </p>
    </div>
  );
}
