"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Chart config
// ---------------------------------------------------------------------------

const chartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "#EDBC18",
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RevenueChartProps {
  data: { date: string; revenue: number }[];
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RevenueChart({ data, isLoading }: RevenueChartProps) {
  if (isLoading) {
    return <RevenueChartSkeleton />;
  }

  const hasData = data.some((d) => d.revenue > 0);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          Revenue Trend
        </h2>
        <span className="text-xs text-[var(--color-text-muted)]">
          Last 30 days
        </span>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-[200px] text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            No revenue data yet
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Revenue will appear here once invoices are created
          </p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[200px] lg:h-[240px] w-full">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EDBC18" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#EDBC18" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickFormatter={(val: string) => {
                const d = new Date(val + "T00:00:00");
                return d.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickFormatter={(val: number) =>
                val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`
              }
              width={48}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => {
                    const d = new Date(label + "T00:00:00");
                    return d.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  formatter={(value) => {
                    const num = typeof value === "number" ? value : 0;
                    return (
                      <span className="font-mono">
                        ${num.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    );
                  }}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#EDBC18"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#EDBC18",
                stroke: "var(--color-surface)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function RevenueChartSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32 bg-[var(--color-surface-hover)]" />
        <Skeleton className="h-4 w-20 bg-[var(--color-surface-hover)]" />
      </div>
      <Skeleton className="h-[200px] lg:h-[240px] w-full rounded-lg bg-[var(--color-surface-hover)]" />
    </div>
  );
}
