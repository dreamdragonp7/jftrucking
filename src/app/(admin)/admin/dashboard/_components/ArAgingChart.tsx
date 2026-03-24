"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { ArAgingBucket } from "../_lib/dashboard.loader";

// ---------------------------------------------------------------------------
// Chart config
// ---------------------------------------------------------------------------

const chartConfig: ChartConfig = {
  amount: {
    label: "Amount",
  },
  current: {
    label: "Current",
    color: "#16A34A",
  },
  "1-30": {
    label: "1-30 days",
    color: "#EDBC18",
  },
  "31-60": {
    label: "31-60 days",
    color: "#D97706",
  },
  "61-90": {
    label: "61-90 days",
    color: "#F97316",
  },
  "90+": {
    label: "90+ days",
    color: "#DC2626",
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArAgingChartProps {
  data: ArAgingBucket[];
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArAgingChart({ data, isLoading }: ArAgingChartProps) {
  if (isLoading) {
    return <ArAgingChartSkeleton />;
  }

  const hasData = data.some((d) => d.amount > 0);
  const totalOutstanding = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          AR Aging
        </h2>
        {totalOutstanding > 0 && (
          <span className="text-sm font-mono font-medium text-[var(--color-text-primary)]">
            ${totalOutstanding.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-[180px] text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            No outstanding receivables
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            AR aging data will appear once invoices are sent
          </p>
        </div>
      ) : (
        <>
          <ChartContainer config={chartConfig} className="h-[180px] lg:h-[200px] w-full">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 4, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                horizontal={false}
              />
              <YAxis
                dataKey="label"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                width={72}
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                tickFormatter={(val: number) =>
                  val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
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
              <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={20}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
            {data
              .filter((d) => d.amount > 0)
              .map((bucket) => (
                <div key={bucket.label} className="flex items-center gap-1.5">
                  <div
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: bucket.color }}
                  />
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {bucket.label}
                  </span>
                  <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                    ${bucket.amount.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ArAgingChartSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-24 bg-[var(--color-surface-hover)]" />
        <Skeleton className="h-4 w-24 bg-[var(--color-surface-hover)]" />
      </div>
      <Skeleton className="h-[180px] lg:h-[200px] w-full rounded-lg bg-[var(--color-surface-hover)]" />
    </div>
  );
}
