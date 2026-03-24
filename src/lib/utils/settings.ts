import * as settingsData from "@/lib/data/settings.data";
import { BUSINESS_DEFAULTS, type BusinessSettingKey } from "@/lib/constants/defaults";

/**
 * Get a business setting value, falling back to the default if not set.
 * Safe to call from server-side code (Server Components, Actions, cron routes).
 */
export async function getBusinessSetting(key: BusinessSettingKey): Promise<string> {
  const value = await settingsData.getSetting(key);
  return value ?? BUSINESS_DEFAULTS[key];
}

/**
 * Get a business setting as a number, falling back to the default.
 */
export async function getBusinessSettingNumber(key: BusinessSettingKey): Promise<number> {
  const value = await getBusinessSetting(key);
  const num = Number(value);
  return isNaN(num) ? Number(BUSINESS_DEFAULTS[key]) : num;
}

/**
 * Get a business setting as a boolean, falling back to the default.
 */
export async function getBusinessSettingBool(key: BusinessSettingKey): Promise<boolean> {
  const value = await getBusinessSetting(key);
  return value === "true";
}
