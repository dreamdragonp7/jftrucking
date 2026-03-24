"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Building2,
  Users,
  Package,
  FileText,
  Truck,
  ArrowRightLeft,
  Unlink,
  ExternalLink,
  ShieldCheck,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  getQBConnectionStatusAction,
  getQBAuthUrlAction,
  disconnectQBAction,
  createQBCustomerAction,
  createQBVendorAction,
  createQBItemsAction,
  syncAllInvoicesAction,
  syncAllSettlementsAction,
  runReconciliationAction,
  getQBSetupStatusAction,
} from "../_actions/quickbooks.actions";
import {
  getQBEnvironmentAction,
  switchQBEnvironmentAction,
} from "../_actions/environment.actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectionStatus {
  connected: boolean;
  companyName: string | null;
  environment: string;
  connectedAt: string | null;
  lastSyncTime: string | null;
  tokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  isConfigured: boolean;
}

interface SetupStatus {
  customers: Array<{
    id: string;
    name: string;
    qb_customer_id: string | null;
  }>;
  carriers: Array<{
    id: string;
    name: string;
    qb_vendor_id: string | null;
  }>;
  materialCount: number;
}

interface EnvironmentSummary {
  current: "sandbox" | "production";
  sandbox: { customers: number; carriers: number; invoices: number; payments: number; settlements: number };
  production: { customers: number; carriers: number; invoices: number; payments: number; settlements: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickBooksClient() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [envSummary, setEnvSummary] = useState<EnvironmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);

  const searchParams = useSearchParams();

  // Show OAuth callback feedback via URL search params
  useEffect(() => {
    const error = searchParams.get("error");
    const connected = searchParams.get("connected");
    const company = searchParams.get("company");

    if (error) {
      toast.error("QuickBooks connection failed", {
        description: error === "access_denied"
          ? "You denied access to QuickBooks."
          : error,
      });
    } else if (connected === "true") {
      toast.success(
        company
          ? `Connected to ${company}`
          : "Successfully connected to QuickBooks"
      );
    }
  }, [searchParams]);

  // Load data on mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [statusResult, envResult] = await Promise.all([
        getQBConnectionStatusAction(),
        getQBEnvironmentAction(),
      ]);

      if (statusResult.success) setStatus(statusResult.data);
      if (envResult.success) setEnvSummary(envResult.data);

      // Load setup status if connected
      if (statusResult.success && statusResult.data.connected) {
        const setupResult = await getQBSetupStatusAction();
        if (setupResult.success) setSetupStatus(setupResult.data);
      }
    } catch (err) {
      console.error("Failed to load QB status:", err);
    } finally {
      setLoading(false);
    }
  }

  // ---- Connect to QuickBooks ----
  async function handleConnect() {
    startTransition(async () => {
      const result = await getQBAuthUrlAction();
      if (result.success) {
        window.location.href = result.data.url;
      } else {
        toast.error("Failed to generate authorization URL", {
          description: result.error,
        });
      }
    });
  }

  // ---- Disconnect ----
  async function handleDisconnect() {
    if (!confirm("Disconnect from QuickBooks? You can reconnect later.")) return;

    startTransition(async () => {
      const result = await disconnectQBAction();
      if (result.success) {
        toast.success("Disconnected from QuickBooks");
        await loadData();
      } else {
        toast.error("Failed to disconnect", { description: result.error });
      }
    });
  }

  // ---- Setup actions ----
  async function handleCreateCustomer(customerId: string, name: string) {
    startTransition(async () => {
      const result = await createQBCustomerAction(customerId);
      if (result.success) {
        toast.success(`Customer "${name}" created in QuickBooks`);
        await loadData();
      } else {
        toast.error(`Failed to create customer "${name}"`, {
          description: result.error,
        });
      }
    });
  }

  async function handleCreateVendor(carrierId: string, name: string) {
    startTransition(async () => {
      const result = await createQBVendorAction(carrierId);
      if (result.success) {
        toast.success(`Vendor "${name}" created in QuickBooks (1099 enabled)`);
        await loadData();
      } else {
        toast.error(`Failed to create vendor "${name}"`, {
          description: result.error,
        });
      }
    });
  }

  async function handleCreateItems() {
    startTransition(async () => {
      const result = await createQBItemsAction();
      if (result.success) {
        toast.success(
          `${result.data.created} service item(s) created in QuickBooks`
        );
        if (result.data.errors.length > 0) {
          toast.warning("Some items failed", {
            description: result.data.errors.join("; "),
          });
        }
        await loadData();
      } else {
        toast.error("Failed to create service items", {
          description: result.error,
        });
      }
    });
  }

  // ---- Sync actions ----
  async function handleSyncInvoices() {
    startTransition(async () => {
      const result = await syncAllInvoicesAction();
      if (result.success) {
        toast.success(
          `Invoices synced: ${result.data.synced} success, ${result.data.failed} failed`
        );
        await loadData();
      } else {
        toast.error("Invoice sync failed", { description: result.error });
      }
    });
  }

  async function handleSyncSettlements() {
    startTransition(async () => {
      const result = await syncAllSettlementsAction();
      if (result.success) {
        toast.success(
          `Settlements synced: ${result.data.synced} success, ${result.data.failed} failed`
        );
        await loadData();
      } else {
        toast.error("Settlement sync failed", { description: result.error });
      }
    });
  }

  async function handleReconciliation() {
    startTransition(async () => {
      const result = await runReconciliationAction();
      if (result.success) {
        if (result.data.discrepancies.length === 0) {
          toast.success("Reconciliation complete — no discrepancies found");
        } else {
          toast.warning(
            `Reconciliation found ${result.data.discrepancies.length} discrepancy(s)`,
            {
              description: result.data.discrepancies
                .slice(0, 3)
                .map((d) => d.issue)
                .join("; "),
            }
          );
        }
        await loadData();
      } else {
        toast.error("Reconciliation failed", { description: result.error });
      }
    });
  }

  // ---- Environment switch ----
  async function handleSwitchEnvironment() {
    const targetEnv =
      envSummary?.current === "sandbox" ? "production" : "sandbox";

    setShowSwitchConfirm(false);

    startTransition(async () => {
      const result = await switchQBEnvironmentAction(targetEnv);
      if (result.success) {
        toast.success(
          `Switched to ${targetEnv} mode. ${result.data.cleared} QB record(s) cleared.`,
          {
            description:
              "You will need to reconnect QuickBooks for the new environment.",
          }
        );
        await loadData();
      } else {
        toast.error("Failed to switch environment", {
          description: result.error,
        });
      }
    });
  }

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  const isTokenExpiringSoon =
    status?.connected &&
    status.refreshTokenExpiresAt &&
    new Date(status.refreshTokenExpiresAt).getTime() - Date.now() <
      30 * 24 * 60 * 60 * 1000; // 30 days

  return (
    <div className="space-y-6">
      {/* ── Environment Banner ── */}
      {envSummary?.current === "sandbox" && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
          <FlaskConical className="w-5 h-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium">Sandbox Mode</p>
            <p className="text-xs text-amber-700">
              Connected to Intuit test environment. No real accounting data affected.
            </p>
          </div>
          <Badge variant="secondary" className="bg-amber-200 text-amber-900 hover:bg-amber-200">
            Sandbox
          </Badge>
        </div>
      )}
      {envSummary?.current === "production" && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <span className="text-xs font-medium text-green-700">Production</span>
        </div>
      )}

      {/* ── Connection Status Card ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                  status?.connected
                    ? isTokenExpiringSoon
                      ? "bg-yellow-100 text-yellow-600"
                      : "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {status?.connected ? (
                  isTokenExpiringSoon ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <CardTitle className="text-base">
                  {status?.connected
                    ? isTokenExpiringSoon
                      ? "Token Expiring Soon"
                      : "Connected to QuickBooks"
                    : "Not Connected"}
                </CardTitle>
                <CardDescription>
                  {status?.connected
                    ? `${status.companyName ?? "QuickBooks Company"}`
                    : status?.isConfigured
                      ? "Click Connect to authorize QuickBooks access"
                      : "Set QB_CLIENT_ID, QB_CLIENT_SECRET, and QB_REDIRECT_URI to enable"}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={
                status?.environment === "production" ? "default" : "secondary"
              }
            >
              {status?.environment === "production" ? "Production" : "Sandbox"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {status?.connected && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                  Connected
                </p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {formatRelativeTime(status.connectedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                  Last Sync
                </p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {formatRelativeTime(status.lastSyncTime)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                  Token Expires
                </p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {formatRelativeTime(status.tokenExpiresAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                  Refresh Expires
                </p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {status.refreshTokenExpiresAt
                    ? new Date(
                        status.refreshTokenExpiresAt
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            {!status?.connected ? (
              <Button
                onClick={handleConnect}
                disabled={isPending || !status?.isConfigured}
                className="bg-[#2CA01C] hover:bg-[#269818] text-white"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Connect QuickBooks
              </Button>
            ) : (
              <>
                {isTokenExpiringSoon && (
                  <Button
                    onClick={handleConnect}
                    disabled={isPending}
                    variant="outline"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reconnect
                  </Button>
                )}
                <Button
                  onClick={handleDisconnect}
                  disabled={isPending}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Environment Card ── */}
      {envSummary && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                    envSummary.current === "production"
                      ? "bg-green-100 text-green-600"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {envSummary.current === "production" ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <FlaskConical className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base">
                    QB Environment
                  </CardTitle>
                  <CardDescription>
                    Currently operating in{" "}
                    <span className="font-semibold">{envSummary.current}</span>{" "}
                    mode
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={
                  envSummary.current === "production" ? "default" : "secondary"
                }
              >
                {envSummary.current === "production" ? "Production" : "Sandbox"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Record counts per environment */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Sandbox Records
                </h4>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-[var(--color-text-muted)]">Customers</span>
                  <span className="font-medium text-right">{envSummary.sandbox.customers}</span>
                  <span className="text-[var(--color-text-muted)]">Carriers</span>
                  <span className="font-medium text-right">{envSummary.sandbox.carriers}</span>
                  <span className="text-[var(--color-text-muted)]">Invoices</span>
                  <span className="font-medium text-right">{envSummary.sandbox.invoices}</span>
                  <span className="text-[var(--color-text-muted)]">Payments</span>
                  <span className="font-medium text-right">{envSummary.sandbox.payments}</span>
                  <span className="text-[var(--color-text-muted)]">Settlements</span>
                  <span className="font-medium text-right">{envSummary.sandbox.settlements}</span>
                </div>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Production Records
                </h4>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-[var(--color-text-muted)]">Customers</span>
                  <span className="font-medium text-right">{envSummary.production.customers}</span>
                  <span className="text-[var(--color-text-muted)]">Carriers</span>
                  <span className="font-medium text-right">{envSummary.production.carriers}</span>
                  <span className="text-[var(--color-text-muted)]">Invoices</span>
                  <span className="font-medium text-right">{envSummary.production.invoices}</span>
                  <span className="text-[var(--color-text-muted)]">Payments</span>
                  <span className="font-medium text-right">{envSummary.production.payments}</span>
                  <span className="text-[var(--color-text-muted)]">Settlements</span>
                  <span className="font-medium text-right">{envSummary.production.settlements}</span>
                </div>
              </div>
            </div>

            {/* Switch button */}
            {envSummary.current === "sandbox" && (
              <div>
                {!showSwitchConfirm ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowSwitchConfirm(true)}
                    disabled={isPending}
                    className="text-green-700 border-green-300 hover:bg-green-50"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Switch to Production
                  </Button>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                    <p className="text-sm font-medium text-red-900">
                      Confirm: Switch to Production
                    </p>
                    <p className="text-xs text-red-700">
                      This will clear all sandbox QB IDs from your TMS records and
                      disconnect your current sandbox QuickBooks session. You will need
                      to reconnect QuickBooks using your production company credentials.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSwitchEnvironment}
                        disabled={isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 mr-2" />
                        )}
                        Yes, Switch to Production
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowSwitchConfirm(false)}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {envSummary.current === "production" && (
              <div>
                {!showSwitchConfirm ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowSwitchConfirm(true)}
                    disabled={isPending}
                    className="text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    <FlaskConical className="w-4 h-4 mr-2" />
                    Switch to Sandbox
                  </Button>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                    <p className="text-sm font-medium text-amber-900">
                      Confirm: Switch to Sandbox
                    </p>
                    <p className="text-xs text-amber-700">
                      This will disconnect your production QuickBooks session. Production
                      QB IDs will remain on your records but will not be used until you
                      switch back. You will need to reconnect using sandbox credentials.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSwitchEnvironment}
                        disabled={isPending}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <FlaskConical className="w-4 h-4 mr-2" />
                        )}
                        Yes, Switch to Sandbox
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowSwitchConfirm(false)}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Only show setup & sync controls when connected */}
      {status?.connected && (
        <>
          {/* ── Setup Section ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                One-Time Setup
              </CardTitle>
              <CardDescription>
                Create TMS entities in QuickBooks. You only need to do this once
                per entity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customers */}
              <div>
                <h4 className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4" />
                  Customers
                </h4>
                {setupStatus?.customers && setupStatus.customers.length > 0 ? (
                  <div className="space-y-1.5">
                    {setupStatus.customers.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[var(--color-surface-elevated)]"
                      >
                        <div className="flex items-center gap-2">
                          {c.qb_customer_id ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[var(--color-text-muted)]" />
                          )}
                          <span className="text-sm">{c.name}</span>
                          {c.qb_customer_id && (
                            <span className="text-xs text-[var(--color-text-muted)]">
                              QB #{c.qb_customer_id}
                            </span>
                          )}
                        </div>
                        {!c.qb_customer_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleCreateCustomer(c.id, c.name)
                            }
                            disabled={isPending}
                          >
                            {isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Create"
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    No active customers found
                  </p>
                )}
              </div>

              <Separator />

              {/* Carriers (Vendors) */}
              <div>
                <h4 className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4" />
                  Vendors (Carriers)
                  <span className="text-xs text-[var(--color-text-muted)]">
                    1099 tracking enabled
                  </span>
                </h4>
                {setupStatus?.carriers && setupStatus.carriers.length > 0 ? (
                  <div className="space-y-1.5">
                    {setupStatus.carriers.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[var(--color-surface-elevated)]"
                      >
                        <div className="flex items-center gap-2">
                          {c.qb_vendor_id ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[var(--color-text-muted)]" />
                          )}
                          <span className="text-sm">{c.name}</span>
                          {c.qb_vendor_id && (
                            <span className="text-xs text-[var(--color-text-muted)]">
                              QB #{c.qb_vendor_id}
                            </span>
                          )}
                        </div>
                        {!c.qb_vendor_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleCreateVendor(c.id, c.name)
                            }
                            disabled={isPending}
                          >
                            {isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Create"
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    No active carriers found
                  </p>
                )}
              </div>

              <Separator />

              {/* Service Items */}
              <div>
                <h4 className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4" />
                  Service Items
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {setupStatus?.materialCount ?? 0} active material(s)
                  </span>
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCreateItems}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4 mr-2" />
                  )}
                  Create Service Items
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Sync Controls ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Sync Controls
              </CardTitle>
              <CardDescription>
                Manually sync records between TMS and QuickBooks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleSyncInvoices}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  Sync All Invoices
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSyncSettlements}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Truck className="w-4 h-4 mr-2" />
                  )}
                  Sync All Settlements
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReconciliation}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                  )}
                  Full Reconciliation
                </Button>
              </div>
            </CardContent>
          </Card>

        </>
      )}
    </div>
  );
}
