/**
 * JFT company information used on invoices, emails, and PDFs.
 * Shared between client and server components.
 *
 * These are the hardcoded defaults. Server-side code should use
 * getCompanyInfo() from "@/lib/constants/company.server" for values
 * that may have been overridden in admin settings.
 */
export const JFT_COMPANY = {
  name: "J Fudge Trucking Inc",
  address: "3401 Sherrye Dr",
  city: "Plano",
  state: "TX",
  zip: "75074",
  phone: "(972) 423-7672",
  email: "jfudgetrucking@gmail.com",
} as const;
