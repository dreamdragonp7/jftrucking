/**
 * Rate Calculation Utility
 *
 * THE critical math module: every financial calculation in the system flows
 * through calculateAmount(). This fixes the per-load vs per-ton bug where
 * all rates were previously treated as per-ton.
 *
 * JFT pricing reality:
 *   - Most rates are PER LOAD ($185/load, $375/load)
 *   - Some rates are PER TON ($X.XX/ton)
 *   - The rate_type field on the rates table controls which formula applies
 *
 * Example of the bug this fixes:
 *   10 loads of Backfill at $185/load, each ~10 tons
 *   WRONG:  100 tons x $185 = $18,500
 *   CORRECT: 10 loads x $185 = $1,850
 */

import type { RateType } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateCalcInput {
  rateType: RateType;
  ratePerUnit: number;
  /** Total net weight in tons (sum across deliveries). Null if weights not recorded. */
  netWeight: number | null;
  /** Number of deliveries (each delivery = 1 load). */
  deliveryCount: number;
}

export interface RateCalcResult {
  /** The billable quantity (tons for per_ton, load count for per_load). */
  quantity: number;
  /** Total dollar amount = ratePerUnit * quantity. */
  amount: number;
  /** Human-readable unit label for invoices/settlements. */
  unit: string;
  /** True if per_ton rate was used but net_weight was null/zero. */
  missingWeight: boolean;
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

export function calculateAmount(input: RateCalcInput): RateCalcResult {
  const { rateType, ratePerUnit, netWeight, deliveryCount } = input;

  switch (rateType) {
    case "per_load":
      return {
        quantity: deliveryCount,
        amount: parseFloat((ratePerUnit * deliveryCount).toFixed(2)),
        unit: "loads",
        missingWeight: false,
      };

    case "per_ton":
    default: {
      const tons = netWeight ?? 0;
      const missingWeight = tons === 0 && deliveryCount > 0;

      if (missingWeight) {
        console.warn(
          `[rate-calc] per_ton rate applied but net_weight is ${netWeight} for ${deliveryCount} delivery(ies). Amount will be $0.`
        );
      }

      return {
        quantity: parseFloat(tons.toFixed(2)),
        amount: parseFloat((ratePerUnit * tons).toFixed(2)),
        unit: "tons",
        missingWeight,
      };
    }
  }
}
