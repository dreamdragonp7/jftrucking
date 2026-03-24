"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  MapPin,
  User,
  Truck,
  Package,
  Calendar,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveDispute } from "../_actions/disputes.actions";
import type { DeliveryWithRelations } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DisputesClientProps {
  openDisputes: DeliveryWithRelations[];
  resolvedDisputes: DeliveryWithRelations[];
}

// ---------------------------------------------------------------------------
// Helper: Extract customer name from delivery
// ---------------------------------------------------------------------------

function getCustomerName(delivery: DeliveryWithRelations): string {
  const dispatch = delivery.dispatch as unknown as Record<string, unknown> | null;
  if (!dispatch) return "Unknown";
  const po = dispatch.purchase_order as Record<string, unknown> | null;
  if (!po) return "Unknown";
  const customer = po.customer as { name?: string } | null;
  return customer?.name ?? "Unknown";
}

function getCarrierName(delivery: DeliveryWithRelations): string {
  const dispatch = delivery.dispatch as unknown as Record<string, unknown> | null;
  if (!dispatch) return "Unknown";
  const carrier = dispatch.carrier as { name?: string } | null;
  return carrier?.name ?? "Unknown";
}

// ---------------------------------------------------------------------------
// DisputeRow
// ---------------------------------------------------------------------------

function DisputeRow({
  delivery,
  onResolve,
}: {
  delivery: DeliveryWithRelations;
  onResolve: (id: string, resolution: "confirm" | "reject", notes: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveAction, setResolveAction] = useState<"confirm" | "reject">("confirm");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const isOpen = delivery.confirmation_status === "disputed";
  const customerName = getCustomerName(delivery);
  const carrierName = getCarrierName(delivery);
  const driverName = delivery.driver?.name ?? "Unknown Driver";
  const materialName = delivery.material?.name ?? "Unknown Material";
  const siteName = delivery.delivery_site?.name ?? "Unknown Site";
  const ticketRef = delivery.ticket_number ?? `D-${delivery.id.slice(0, 8)}`;

  const handleResolve = () => {
    startTransition(async () => {
      const result = await resolveDispute(delivery.id, resolveAction, notes);
      if (result.success) {
        toast.success(resolveAction === "confirm" ? "Delivery confirmed" : "Delivery rejected");
        setResolveDialogOpen(false);
        setNotes("");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] overflow-hidden">
        {/* Summary row */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-hover transition-colors"
        >
          <div className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 ${isOpen ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
            {isOpen ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          </div>

          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-1 sm:gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                {ticketRef}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {new Date(delivery.delivered_at).toLocaleDateString()}
              </p>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm text-[var(--color-text-primary)] truncate">{customerName}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{driverName}</p>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm text-[var(--color-text-primary)] truncate">{materialName}</p>
              <p className="text-xs text-[var(--color-text-muted)] font-mono">
                {delivery.net_weight ? `${delivery.net_weight.toFixed(1)} tons` : "N/A"}
              </p>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm text-[var(--color-text-secondary)] truncate line-clamp-2">
                {delivery.dispute_reason || "No reason provided"}
              </p>
            </div>
            <div className="hidden sm:flex items-center">
              <StatusBadge status={delivery.confirmation_status} />
            </div>
          </div>

          <div className="flex-shrink-0 text-[var(--color-text-muted)]">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {/* Expanded detail panel */}
        {expanded && (
          <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-surface-deep)] animate-slide-up-fade">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Delivery details */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Delivery Details</h4>
                <div className="space-y-2">
                  <DetailRow icon={Calendar} label="Delivered" value={new Date(delivery.delivered_at).toLocaleString()} />
                  <DetailRow icon={FileText} label="Ticket #" value={delivery.ticket_number ?? "N/A"} />
                  <DetailRow icon={Package} label="Material" value={materialName} />
                  <DetailRow icon={MapPin} label="Site" value={siteName} />
                  <DetailRow icon={Truck} label="Carrier" value={carrierName} />
                  <DetailRow icon={User} label="Driver" value={driverName} />
                  <DetailRow
                    icon={Package}
                    label="Weight"
                    value={delivery.net_weight ? `${delivery.net_weight.toFixed(1)} tons (Gross: ${delivery.gross_weight?.toFixed(1) ?? "N/A"}, Tare: ${delivery.tare_weight?.toFixed(1) ?? "N/A"})` : "Not recorded"}
                    mono
                  />
                </div>

                {delivery.ticket_photo_url && (
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> Ticket Photo
                    </p>
                    <a
                      href={delivery.ticket_photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-brand-gold hover:underline"
                    >
                      <Eye className="h-4 w-4" />
                      View Ticket Photo
                    </a>
                  </div>
                )}
              </div>

              {/* Right: Dispute info + Actions */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Dispute Information</h4>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-medium text-red-600">Customer&apos;s Dispute Reason</p>
                    <p className="text-sm text-[var(--color-text-primary)]">
                      {delivery.dispute_reason || "No reason provided"}
                    </p>
                  </CardContent>
                </Card>

                {delivery.dispute_resolution && (
                  <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-xs font-medium text-emerald-600">Resolution</p>
                      <p className="text-sm text-[var(--color-text-primary)]">
                        {delivery.dispute_resolution}
                      </p>
                      {delivery.dispute_resolved_at && (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Resolved {new Date(delivery.dispute_resolved_at).toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {isOpen && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        setResolveAction("confirm");
                        setResolveDialogOpen(true);
                      }}
                      size="sm"
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm Delivery
                    </Button>
                    <Button
                      onClick={() => {
                        setResolveAction("reject");
                        setResolveDialogOpen(true);
                      }}
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Delivery
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resolveAction === "confirm" ? "Confirm Delivery" : "Reject Delivery"}
            </DialogTitle>
            <DialogDescription>
              {resolveAction === "confirm"
                ? "Override the customer's dispute and confirm this delivery. It will be included in the next invoice."
                : "Agree with the customer's dispute. This delivery will be cancelled and not invoiced."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">
                Resolution Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain the reason for this decision..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={isPending}
              variant={resolveAction === "reject" ? "destructive" : "default"}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : resolveAction === "confirm" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {resolveAction === "confirm" ? "Confirm" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// DetailRow helper
// ---------------------------------------------------------------------------

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-[var(--color-text-muted)] mt-0.5 flex-shrink-0" />
      <span className="text-xs text-[var(--color-text-muted)] w-16 flex-shrink-0">{label}</span>
      <span className={`text-sm text-[var(--color-text-primary)] ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DisputesClient
// ---------------------------------------------------------------------------

export function DisputesClient({ openDisputes, resolvedDisputes }: DisputesClientProps) {
  return (
    <Tabs defaultValue="open" className="space-y-4">
      <TabsList>
        <TabsTrigger value="open" className="gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          Open
          {openDisputes.length > 0 && (
            <span className="ml-1 text-xs font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">
              {openDisputes.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="resolved" className="gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Resolved
        </TabsTrigger>
      </TabsList>

      <TabsContent value="open" className="space-y-3">
        {openDisputes.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No open disputes"
            description="All delivery disputes have been resolved. Great job!"
          />
        ) : (
          openDisputes.map((d) => (
            <DisputeRow
              key={d.id}
              delivery={d}
              onResolve={() => {}}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="resolved" className="space-y-3">
        {resolvedDisputes.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No resolved disputes"
            description="Dispute resolutions will appear here once you resolve any open disputes."
          />
        ) : (
          resolvedDisputes.map((d) => (
            <DisputeRow
              key={d.id}
              delivery={d}
              onResolve={() => {}}
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
