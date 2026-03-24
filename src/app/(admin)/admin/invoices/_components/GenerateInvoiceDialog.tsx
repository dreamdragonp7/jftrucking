"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  Search,
  Package,
  DollarSign,
  Truck,
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
  previewInvoiceAction,
  generateInvoiceAction,
} from "../_actions/invoices.actions";
import type { InvoicePreview } from "@/lib/services/invoice.service";

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GenerateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: { id: string; name: string; payment_terms: string }[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GenerateInvoiceDialog({
  open,
  onOpenChange,
  customers,
}: GenerateInvoiceDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [step, setStep] = useState<"form" | "preview">("form");

  // Auto-select if only one customer exists
  const singleCustomer = customers.length === 1;
  const effectiveCustomerId = singleCustomer ? customers[0].id : customerId;

  const resetForm = () => {
    setCustomerId(singleCustomer ? customers[0].id : "");
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
    if (!effectiveCustomerId || !periodStart || !periodEnd) {
      toast.error("Please select a customer and date range");
      return;
    }

    startTransition(async () => {
      const result = await previewInvoiceAction(
        effectiveCustomerId,
        periodStart,
        periodEnd
      );
      if (result.success) {
        setPreview(result.data);
        setStep("preview");
        if (result.data.line_items.length === 0) {
          toast.warning(
            "No confirmed deliveries found for this period and customer."
          );
        }
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleGenerate = () => {
    if (!preview || preview.line_items.length === 0) return;

    startTransition(async () => {
      const result = await generateInvoiceAction(
        effectiveCustomerId,
        periodStart,
        periodEnd
      );
      if (result.success) {
        toast.success(
          `Invoice ${result.data.invoice_number} generated successfully!`
        );
        handleClose(false);
        router.push(`/admin/invoices/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  };

  const selectedCustomer = customers.find((c) => c.id === effectiveCustomerId);

  return (
    <FormDialog
      open={open}
      onOpenChange={handleClose}
      title="Generate Invoice"
      description={
        step === "form"
          ? "Select a customer and date range to find confirmed deliveries."
          : "Review the invoice details before generating."
      }
    >
      {step === "form" ? (
        <div className="flex flex-col gap-5">
          {/* Customer */}
          <div className="space-y-2">
            <Label>Customer</Label>
            {singleCustomer ? (
              <p className="text-sm font-medium text-[var(--color-text-primary)] py-2">
                {customers[0].name}
              </p>
            ) : (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
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

          {selectedCustomer && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Payment terms:{" "}
              <span className="font-mono font-medium">
                {selectedCustomer.payment_terms.replace("net_", "Net ")}
              </span>
            </p>
          )}

          {/* Preview button */}
          <Button
            onClick={handlePreview}
            disabled={isPending || !effectiveCustomerId || !periodStart || !periodEnd}
            className="w-full"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching deliveries...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Preview Invoice
              </span>
            )}
          </Button>
        </div>
      ) : (
        /* Preview step */
        <div className="flex flex-col gap-5">
          {/* Summary cards */}
          {preview && (
            <>
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
                  <Package className="h-4 w-4 mx-auto mb-1 text-[var(--color-text-muted)]" />
                  <p className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
                    {preview.po_count}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                    POs
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] bg-surface-deep p-3 text-center">
                  <DollarSign className="h-4 w-4 mx-auto mb-1 text-[var(--color-brand-gold)]" />
                  <p className="text-lg font-bold font-mono text-[var(--color-brand-gold)]">
                    {formatMoney(preview.total)}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                    Total
                  </p>
                </div>
              </div>

              {/* Line items preview */}
              {preview.line_items.length > 0 ? (
                <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
                  <div className="bg-surface-deep px-4 py-2 border-b border-[var(--color-border)]">
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                      Line Items
                    </p>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {preview.line_items.map((item, i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                              Hauling Services &mdash; {item.material_name}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                              PO #{item.po_number} &bull;{" "}
                              {item.delivery_count} deliveries
                            </p>
                          </div>
                          <p className="text-sm font-bold font-mono text-[var(--color-text-primary)]">
                            {formatMoney(item.amount)}
                          </p>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1 font-mono">
                          {item.quantity.toFixed(1)} {item.unit} @{" "}
                          {formatMoney(item.rate)}/{item.unit === "tons" ? "ton" : "unit"}
                        </p>
                      </div>
                    ))}
                  </div>
                  {/* Totals */}
                  <div className="bg-surface-deep px-4 py-3 border-t border-[var(--color-border)]">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Subtotal
                      </span>
                      <span className="text-sm font-mono text-[var(--color-text-secondary)]">
                        {formatMoney(preview.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Tax (Hauling — Exempt)
                      </span>
                      <span className="text-sm font-mono text-[var(--color-text-muted)]">
                        $0.00
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--color-border)]">
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">
                        Total
                      </span>
                      <span className="text-base font-bold font-mono text-[var(--color-brand-gold)]">
                        {formatMoney(preview.total)}
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
                    There are no confirmed deliveries for this customer in
                    the selected date range.
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
                  disabled={
                    isPending || preview.line_items.length === 0
                  }
                  className="flex-1 bg-brand-gold text-[var(--color-text-on-gold)] hover:bg-gold-400"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Generate Invoice
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
