"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Wallet,
  Loader2,
  Search,
  Truck,
  DollarSign,
  CalendarDays,
} from "lucide-react";

import { FormDialog } from "@/components/admin/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  previewSettlementAction,
  generateSettlementAction,
} from "../_actions/settlements.actions";
import type { SettlementPreview } from "@/lib/services/settlement.service";

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

function formatDate(dateStr: string) {
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

interface GenerateSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carriers: { id: string; name: string; dispatch_fee_weekly: number }[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GenerateSettlementDialog({
  open,
  onOpenChange,
  carriers,
}: GenerateSettlementDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [carrierId, setCarrierId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [step, setStep] = useState<"form" | "preview">("form");

  // Auto-select if only one carrier exists
  const singleCarrier = carriers.length === 1;
  const effectiveCarrierId = singleCarrier ? carriers[0].id : carrierId;

  const resetForm = () => {
    setCarrierId(singleCarrier ? carriers[0].id : "");
    setPeriodStart("");
    setPeriodEnd("");
    setPreview(null);
    setStep("form");
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const handlePreview = () => {
    if (!effectiveCarrierId || !periodStart || !periodEnd) {
      toast.error("Please select a carrier and date range");
      return;
    }

    startTransition(async () => {
      const result = await previewSettlementAction(
        effectiveCarrierId,
        periodStart,
        periodEnd
      );
      if (result.success) {
        setPreview(result.data);
        setStep("preview");
        if (result.data.lines.length === 0) {
          toast.warning(
            "No confirmed deliveries found for this carrier in the selected period."
          );
        }
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleGenerate = () => {
    if (!preview || preview.lines.length === 0) return;

    startTransition(async () => {
      const result = await generateSettlementAction(
        effectiveCarrierId,
        periodStart,
        periodEnd
      );
      if (result.success) {
        toast.success("Settlement generated successfully!");
        handleClose(false);
        router.push(`/admin/settlements/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  };

  const selectedCarrier = carriers.find((c) => c.id === effectiveCarrierId);

  return (
    <FormDialog
      open={open}
      onOpenChange={handleClose}
      title="Generate Settlement"
      description={
        step === "form"
          ? "Select a carrier and billing period to calculate the settlement."
          : "Review the settlement details before generating."
      }
    >
      {step === "form" ? (
        <div className="flex flex-col gap-5">
          {/* Carrier */}
          <div className="space-y-2">
            <Label>Carrier</Label>
            {singleCarrier ? (
              <p className="text-sm font-medium text-[var(--color-text-primary)] py-2">
                {carriers[0].name}
              </p>
            ) : (
              <Select value={carrierId} onValueChange={setCarrierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select carrier..." />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Period Start</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Period End</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          {selectedCarrier && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Dispatch fee:{" "}
              <span className="font-mono font-medium">
                {formatMoney(selectedCarrier.dispatch_fee_weekly)}/week
              </span>
            </p>
          )}

          {/* Preview button */}
          <Button
            onClick={handlePreview}
            disabled={isPending || !effectiveCarrierId || !periodStart || !periodEnd}
            className="w-full"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Preview Settlement
              </span>
            )}
          </Button>
        </div>
      ) : (
        /* Preview step */
        <div className="flex flex-col gap-5">
          {preview && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-[var(--color-border)] bg-surface-deep p-3 text-center">
                  <Truck className="h-4 w-4 mx-auto mb-1 text-[var(--color-text-muted)]" />
                  <p className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
                    {preview.delivery_count}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                    Deliveries
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] bg-surface-deep p-3 text-center">
                  <CalendarDays className="h-4 w-4 mx-auto mb-1 text-[var(--color-text-muted)]" />
                  <p className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
                    {preview.weeks_in_period}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                    Weeks
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] bg-surface-deep p-3 text-center">
                  <DollarSign className="h-4 w-4 mx-auto mb-1 text-[var(--color-brand-gold)]" />
                  <p className="text-lg font-bold font-mono text-[var(--color-brand-gold)]">
                    {formatMoney(preview.total_amount)}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                    Total Due
                  </p>
                </div>
              </div>

              {/* Line items */}
              {preview.lines.length > 0 ? (
                <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
                  <div className="bg-surface-deep px-4 py-2 border-b border-[var(--color-border)]">
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                      Hauling Deliveries
                    </p>
                  </div>
                  <div className="divide-y divide-[var(--color-border)] max-h-[300px] overflow-y-auto">
                    {preview.lines.map((line) => (
                      <div
                        key={line.delivery_id}
                        className="px-4 py-2.5 flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm text-[var(--color-text-primary)]">
                            {line.material_name}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {formatDate(line.delivery_date)}
                            {line.ticket_number
                              ? ` \u2022 #${line.ticket_number}`
                              : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-[var(--color-text-primary)]">
                            {formatMoney(line.amount)}
                          </p>
                          <p className="text-xs font-mono text-[var(--color-text-muted)]">
                            {(line.net_weight ?? 0).toFixed(1)} {line.unit} @{" "}
                            {formatMoney(line.rate)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="bg-surface-deep px-4 py-3 border-t border-[var(--color-border)]">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Hauling Subtotal
                      </span>
                      <span className="text-sm font-mono text-[var(--color-text-secondary)]">
                        {formatMoney(preview.hauling_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Dispatch Fee ({preview.weeks_in_period} weeks @{" "}
                        {formatMoney(
                          preview.dispatch_fee / preview.weeks_in_period
                        )}
                        /wk)
                      </span>
                      <span className="text-sm font-mono text-[var(--color-text-secondary)]">
                        {formatMoney(preview.dispatch_fee)}
                      </span>
                    </div>
                    {preview.deductions > 0 && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          Deductions
                        </span>
                        <span className="text-sm font-mono text-red-600">
                          ({formatMoney(preview.deductions)})
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--color-border)]">
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">
                        Total Due
                      </span>
                      <span className="text-base font-bold font-mono text-[var(--color-brand-gold)]">
                        {formatMoney(preview.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-center">
                  <p className="text-sm text-amber-600 font-medium">
                    No confirmed deliveries found
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    There are no confirmed deliveries for this carrier in the
                    selected period.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("form")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isPending || preview.lines.length === 0}
                  className="flex-1 bg-brand-gold text-[var(--color-text-on-gold)] hover:bg-gold-400"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Generate Settlement
                    </span>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </FormDialog>
  );
}
