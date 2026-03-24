/**
 * Business rule defaults — admin can override via Settings > Business Rules.
 * These are the fallback values when no app_settings row exists for a key.
 */
export const BUSINESS_DEFAULTS = {
  // Delivery auto-confirm
  auto_confirm_days: "1",

  // Invoice settings
  default_payment_terms: "net_30",
  invoice_due_days: "30",
  overdue_reminder_days: "7",

  // Company info (overrides for JFT_COMPANY constants)
  company_name: "J Fudge Trucking Inc",
  company_address: "3401 Sherrye Dr",
  company_city: "Plano",
  company_state: "TX",
  company_zip: "75074",
  company_phone: "(972) 423-7672",
  company_email: "jfudgetrucking@gmail.com",

  // Notification settings
  send_sms_notifications: "true",
  send_email_notifications: "true",

  // Settlement settings
  default_settlement_period: "biweekly",

  // QuickBooks account names
  qb_income_account: "Services",
  qb_expense_account: "Subcontractor Expense",
  qb_bank_account: "Checking",

  // Auto-dispatch
  auto_dispatch_daily_limit: "10",
} as const;

export type BusinessSettingKey = keyof typeof BUSINESS_DEFAULTS;
