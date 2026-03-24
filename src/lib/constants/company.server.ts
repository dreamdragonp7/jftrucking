/**
 * Server-only company info with admin-configured overrides.
 *
 * Import from "@/lib/constants/company.server" — only use in:
 * - Server Components
 * - Server Actions
 * - Route Handlers
 * - Cron jobs
 *
 * For client components, use JFT_COMPANY from "@/lib/constants/company".
 */

import { JFT_COMPANY } from "./company";
import { getBusinessSetting } from "@/lib/utils/settings";

export async function getCompanyInfo(): Promise<{
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
}> {
  try {
    const [name, address, city, state, zip, phone, email] = await Promise.all([
      getBusinessSetting("company_name"),
      getBusinessSetting("company_address"),
      getBusinessSetting("company_city"),
      getBusinessSetting("company_state"),
      getBusinessSetting("company_zip"),
      getBusinessSetting("company_phone"),
      getBusinessSetting("company_email"),
    ]);

    return {
      name: name || JFT_COMPANY.name,
      address: address || JFT_COMPANY.address,
      city: city || JFT_COMPANY.city,
      state: state || JFT_COMPANY.state,
      zip: zip || JFT_COMPANY.zip,
      phone: phone || JFT_COMPANY.phone,
      email: email || JFT_COMPANY.email,
    };
  } catch {
    return {
      name: JFT_COMPANY.name,
      address: JFT_COMPANY.address,
      city: JFT_COMPANY.city,
      state: JFT_COMPANY.state,
      zip: JFT_COMPANY.zip,
      phone: JFT_COMPANY.phone,
      email: JFT_COMPANY.email,
    };
  }
}
