import type { Metadata } from "next";
import { Suspense } from "react";
import { loadDashboardData } from "./_lib/dashboard.loader";
import { KpiCard, KpiCardSkeleton } from "./_components/KpiCard";
import { PendingActions } from "./_components/PendingActions";
import { RecentDeliveries } from "./_components/RecentDeliveries";
import { RevenueChart } from "./_components/RevenueChart";
import { ArAgingChart } from "./_components/ArAgingChart";
import { QBHealthWidget } from "./_components/QBHealthWidget";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Force dynamic so dashboard data is always fresh
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// KPI Skeletons for Suspense fallback
// ---------------------------------------------------------------------------

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <KpiCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard content (server component, fetches data)
// ---------------------------------------------------------------------------

async function DashboardContent() {
  const data = await loadDashboardData();
  const { kpi, pendingActions, recentDeliveries, revenueByDay, arAging, qbHealth } = data;

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <KpiCard
          title="Today's Loads"
          value={kpi.todaysLoads.toLocaleString()}
          trend={kpi.todaysLoadsTrend}
          subtitle="vs 7-day avg"
          iconName="truck"
          index={0}
        />
        <KpiCard
          title="This Week"
          value={kpi.weekLoads.toLocaleString()}
          subtitle="loads dispatched"
          iconName="calendar"
          index={1}
        />
        <KpiCard
          title="Revenue This Month"
          value={`$${kpi.monthRevenue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          isCurrency
          iconName="dollar"
          index={2}
        />
        <KpiCard
          title="After Carrier Pay"
          value={`$${kpi.grossMargin.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          trend={kpi.marginPercent}
          subtitle={`${kpi.marginPercent}% of revenue`}
          isCurrency
          iconName="trending"
          index={3}
        />
        <KpiCard
          title="Outstanding AR"
          value={`$${kpi.outstandingInvoices.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          subtitle={
            kpi.overdueInvoices > 0
              ? `${kpi.overdueInvoices} overdue`
              : "all current"
          }
          isCurrency
          iconName="file"
          index={4}
        />
        <KpiCard
          title="Payables"
          value={`$${kpi.payablesAmount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          subtitle={
            kpi.payablesCount > 0
              ? `${kpi.payablesCount} settlement${kpi.payablesCount === 1 ? "" : "s"} pending`
              : "all clear"
          }
          isCurrency
          iconName="wallet"
          index={5}
        />
      </div>

      {/* QBO Health Widget */}
      <QBHealthWidget data={qbHealth} index={6} />

      {/* Pending Actions */}
      <PendingActions actions={pendingActions} />

      {/* Two-column layout: Recent deliveries + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Left column */}
        <RecentDeliveries deliveries={recentDeliveries} />

        {/* Right column */}
        <div className="flex flex-col gap-4 lg:gap-6">
          <RevenueChart data={revenueByDay} />
          <ArAgingChart data={arAging} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading fallback
// ---------------------------------------------------------------------------

function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <KpiSkeleton />
      <PendingActions actions={[]} isLoading />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <RecentDeliveries deliveries={[]} isLoading />
        <div className="flex flex-col gap-4 lg:gap-6">
          <RevenueChart data={[]} isLoading />
          <ArAgingChart data={[]} isLoading />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  return (
    <div className="animate-fade-in">
      <Suspense fallback={<DashboardLoading />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
