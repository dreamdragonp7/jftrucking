"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Download,
  Trash2,
  CheckCircle,
  RotateCw,
  FileText,
  Loader2,
  Calendar,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusTimeline } from "@/components/admin/StatusTimeline";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { JFT_COMPANY } from "@/lib/constants/company";
import type { InvoiceWithDetails } from "@/types/database";
import {
  sendInvoiceAction,
  deleteInvoiceAction,
  markInvoicePaidAction,
  resendInvoiceAction,
} from "../../_actions/invoices.actions";

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

function formatDate(dateStr: string | null) {
  if (!dateStr) return "\u2014";
  return new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(invoice: InvoiceWithDetails): boolean {
  if (["paid", "cancelled", "draft"].includes(invoice.status)) return false;
  return new Date(invoice.due_date) < new Date();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface InvoiceDetailClientProps {
  invoice: InvoiceWithDetails;
}

export function InvoiceDetailClient({ invoice }: InvoiceDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("ach");

  const overdue = isOverdue(invoice);
  const customer = invoice.customer;
  const lineItems = invoice.line_items ?? [];

  const handleSend = () => {
    startTransition(async () => {
      const result = await sendInvoiceAction(invoice.id);
      if (result.success) {
        toast.success("Invoice sent");
        if (result.data.emailError) {
          toast.warning(`Email note: ${result.data.emailError}`);
        }
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleResend = () => {
    startTransition(async () => {
      const result = await resendInvoiceAction(invoice.id);
      if (result.success) {
        toast.success("Invoice resent");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteInvoiceAction(invoice.id);
      if (result.success) {
        toast.success("Invoice deleted");
        router.push("/admin/invoices");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleMarkPaid = () => {
    startTransition(async () => {
      const result = await markInvoicePaidAction(
        invoice.id,
        paidAt,
        paymentMethod
      );
      if (result.success) {
        toast.success("Invoice marked as paid");
        setShowPayDialog(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  // Timeline steps
  const timelineSteps = [
    {
      status: "draft",
      label: "Draft",
      timestamp: invoice.created_at,
    },
    {
      status: "sent",
      label: "Sent",
      timestamp: invoice.sent_at,
    },
    {
      status: "paid",
      label: "Paid",
      timestamp: invoice.paid_at,
    },
  ];

  return (
    <div className="animate-slide-up-fade max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin/invoices"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Invoices
      </Link>

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono text-[var(--color-text-primary)]">
              {invoice.invoice_number}
            </h1>
            <StatusBadge
              status={overdue ? "overdue" : invoice.status}
              label={overdue ? "Overdue" : undefined}
            />
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {customer.name} &bull; {formatDate(invoice.period_start)} &ndash;{" "}
            {formatDate(invoice.period_end)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </a>
          </Button>
          {invoice.status === "draft" && (
            <>
              <Button size="sm" onClick={handleSend} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Send
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-300"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </>
          )}
          {invoice.status === "sent" && (
            <>
              <Button
                size="sm"
                onClick={() => setShowPayDialog(true)}
                disabled={isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark Paid
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                disabled={isPending}
              >
                <RotateCw className="h-4 w-4 mr-1" />
                Resend
              </Button>
            </>
          )}
          {overdue && (
            <>
              <Button
                size="sm"
                onClick={() => setShowPayDialog(true)}
                disabled={isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark Paid
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                disabled={isPending}
              >
                <RotateCw className="h-4 w-4 mr-1" />
                Resend
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4 mb-6">
        <StatusTimeline
          steps={timelineSteps}
          currentStatus={
            invoice.status === "paid"
              ? "paid"
              : invoice.sent_at
                ? "sent"
                : "draft"
          }
          orientation="horizontal"
        />
      </div>

      {/* Invoice card — mirrors PDF layout */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[var(--color-border)]">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-brown-700 flex items-center justify-center text-[var(--color-text-on-brown)]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">
                    {JFT_COMPANY.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Aggregate Hauling Services
                  </p>
                </div>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] space-y-0.5 mt-2">
                <p>{JFT_COMPANY.address}</p>
                <p>
                  {JFT_COMPANY.city}, {JFT_COMPANY.state} {JFT_COMPANY.zip}
                </p>
                <p>{JFT_COMPANY.phone}</p>
                <p>{JFT_COMPANY.email}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[var(--color-brand-brown)] tracking-wider mb-3">
                INVOICE
              </p>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[var(--color-text-muted)]">
                    Invoice #:
                  </span>
                  <span className="font-mono font-bold text-[var(--color-text-primary)]">
                    {invoice.invoice_number}
                  </span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[var(--color-text-muted)]">Date:</span>
                  <span className="font-mono text-[var(--color-text-secondary)]">
                    {formatDate(invoice.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[var(--color-text-muted)]">
                    Due Date:
                  </span>
                  <span
                    className={cn(
                      "font-mono font-bold",
                      overdue
                        ? "text-red-600"
                        : "text-[var(--color-text-secondary)]"
                    )}
                  >
                    {formatDate(invoice.due_date)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border)]">
            <div>
              <p className="text-[10px] text-[var(--color-brand-brown)] uppercase tracking-widest font-bold mb-2">
                Bill To
              </p>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">
                {customer.name}
              </p>
              {customer.billing_address && (
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {customer.billing_address}
                </p>
              )}
              {customer.billing_email && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  {customer.billing_email}
                </p>
              )}
              {customer.phone && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  {customer.phone}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-brand-brown)] uppercase tracking-widest font-bold mb-2">
                PO Reference
              </p>
              {lineItems.map((li) => {
                const po = li.purchase_order as {
                  po_number: string;
                } | null;
                return po ? (
                  <p
                    key={li.id}
                    className="text-xs font-mono text-[var(--color-text-secondary)]"
                  >
                    #{po.po_number}
                  </p>
                ) : null;
              })}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                  Description
                </th>
                <th className="text-right py-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold w-20">
                  Qty
                </th>
                <th className="text-right py-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold w-24">
                  Rate
                </th>
                <th className="text-right py-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold w-28">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length > 0 ? (
                lineItems.map((item) => {
                  const po = item.purchase_order as {
                    po_number: string;
                  } | null;
                  const unitLabel =
                    item.unit === "tons" ? "tons" : item.unit ?? "units";
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-[var(--color-border)]/50"
                    >
                      <td className="py-3">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          {item.description}
                        </p>
                        {po && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            PO #{po.po_number}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono text-[var(--color-text-secondary)]">
                        <span>
                          {item.quantity.toLocaleString("en-US", {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] block">
                          {unitLabel}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono text-[var(--color-text-secondary)]">
                        <span>{formatMoney(item.rate)}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] block">
                          /{unitLabel === "tons" ? "ton" : "unit"}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-[var(--color-text-primary)]">
                        {formatMoney(item.amount)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-center text-[var(--color-text-muted)]"
                  >
                    No line items
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">
                  Subtotal
                </span>
                <span className="font-mono text-[var(--color-text-secondary)]">
                  {formatMoney(invoice.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">
                  Tax (Hauling — Exempt)
                </span>
                <span className="font-mono text-[var(--color-text-muted)]">
                  $0.00
                </span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-[var(--color-border)]">
                <span className="text-[var(--color-text-primary)]">
                  Total
                </span>
                <span className="font-mono text-[var(--color-brand-gold)]">
                  {formatMoney(invoice.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment terms */}
          <div className="mt-6 rounded-lg border-l-4 border-l-[var(--color-brand-gold)] bg-surface-deep p-4">
            <p className="text-[10px] text-[var(--color-brand-brown)] uppercase tracking-widest font-bold mb-2">
              Payment Information
            </p>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[var(--color-text-muted)]">
                  Terms:
                </span>
                <span className="ml-1 font-medium text-[var(--color-text-secondary)]">
                  {customer.payment_terms.replace("net_", "Net ")}
                </span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">
                  Method:
                </span>
                <span className="ml-1 font-medium text-[var(--color-text-secondary)]">
                  ACH / Check
                </span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">Due:</span>
                <span
                  className={cn(
                    "ml-1 font-medium font-mono",
                    overdue
                      ? "text-red-600"
                      : "text-[var(--color-text-secondary)]"
                  )}
                >
                  {formatDate(invoice.due_date)}
                </span>
              </div>
            </div>
          </div>

          {/* Tax note */}
          <p className="mt-4 text-[10px] text-[var(--color-text-muted)] text-center italic">
            Hauling services are not subject to Texas sales tax per Texas Tax Code
            Chapter 151. This invoice reflects transportation/hauling services only.
          </p>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                Notes
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] bg-surface-deep text-center">
          <p className="text-xs text-[var(--color-text-muted)]">
            {JFT_COMPANY.name} &bull; {JFT_COMPANY.phone} &bull;{" "}
            {JFT_COMPANY.email}
          </p>
        </div>
      </div>

      {/* Mark Paid Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>
              Record payment for {invoice.invoice_number} ({formatMoney(invoice.total)})
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ach">ACH Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowPayDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkPaid}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Confirm Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
