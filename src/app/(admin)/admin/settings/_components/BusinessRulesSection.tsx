"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import {
  Settings2,
  Loader2,
  Save,
  Bell,
  FileText,
  Truck,
  Building2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateBusinessSettings } from "../_actions/settings.actions";
import { BUSINESS_DEFAULTS, type BusinessSettingKey } from "@/lib/constants/defaults";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BusinessRulesSectionProps {
  currentSettings: Record<string, string>;
}

// ---------------------------------------------------------------------------
// BusinessRulesSection
// ---------------------------------------------------------------------------

export function BusinessRulesSection({ currentSettings }: BusinessRulesSectionProps) {
  const [isPending, startTransition] = useTransition();

  // Build initial state from current settings merged with defaults
  function getVal(key: BusinessSettingKey): string {
    return currentSettings[key] ?? BUSINESS_DEFAULTS[key];
  }

  // Delivery settings
  const [autoConfirmDays, setAutoConfirmDays] = useState(getVal("auto_confirm_days"));

  // Invoice settings
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(getVal("default_payment_terms"));
  const [invoiceDueDays, setInvoiceDueDays] = useState(getVal("invoice_due_days"));
  const [overdueReminderDays, setOverdueReminderDays] = useState(getVal("overdue_reminder_days"));

  // Company info
  const [companyName, setCompanyName] = useState(getVal("company_name"));
  const [companyAddress, setCompanyAddress] = useState(getVal("company_address"));
  const [companyPhone, setCompanyPhone] = useState(getVal("company_phone"));
  const [companyEmail, setCompanyEmail] = useState(getVal("company_email"));

  // Notifications
  const [sendSms, setSendSms] = useState(getVal("send_sms_notifications") === "true");
  const [sendEmail, setSendEmail] = useState(getVal("send_email_notifications") === "true");

  // Settlement
  const [settlementPeriod, setSettlementPeriod] = useState(getVal("default_settlement_period"));

  // QuickBooks account names
  const [qbIncomeAccount, setQbIncomeAccount] = useState(getVal("qb_income_account"));
  const [qbExpenseAccount, setQbExpenseAccount] = useState(getVal("qb_expense_account"));
  const [qbBankAccount, setQbBankAccount] = useState(getVal("qb_bank_account"));

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const settings: Record<string, string> = {
        auto_confirm_days: autoConfirmDays,
        default_payment_terms: defaultPaymentTerms,
        invoice_due_days: invoiceDueDays,
        overdue_reminder_days: overdueReminderDays,
        company_name: companyName,
        company_address: companyAddress,
        company_phone: companyPhone,
        company_email: companyEmail,
        send_sms_notifications: sendSms ? "true" : "false",
        send_email_notifications: sendEmail ? "true" : "false",
        default_settlement_period: settlementPeriod,
        qb_income_account: qbIncomeAccount,
        qb_expense_account: qbExpenseAccount,
        qb_bank_account: qbBankAccount,
      };

      const result = await updateBusinessSettings(settings);
      if (result.success) {
        toast.success("Business rules saved");
      } else {
        toast.error(result.error);
      }
    });
  }, [
    autoConfirmDays, defaultPaymentTerms, invoiceDueDays, overdueReminderDays,
    companyName, companyAddress, companyPhone, companyEmail,
    sendSms, sendEmail, settlementPeriod,
    qbIncomeAccount, qbExpenseAccount, qbBankAccount,
  ]);

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-[var(--color-text-muted)]" />
          <div>
            <CardTitle className="text-base">Business Rules</CardTitle>
            <CardDescription>
              Configure system-wide business logic and defaults
            </CardDescription>
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="hidden sm:inline">Save</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Settings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-4 w-4 text-[var(--color-text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Delivery Settings</h3>
          </div>
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)]">Auto-Confirm Days</label>
                <p className="text-xs text-[var(--color-text-muted)]">Days before unconfirmed deliveries are auto-confirmed</p>
              </div>
              <Input
                type="number"
                min="1"
                max="30"
                value={autoConfirmDays}
                onChange={(e) => setAutoConfirmDays(e.target.value)}
                className="w-20 text-right"
              />
            </div>
          </div>
        </div>

        {/* Invoice Settings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-[var(--color-text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Invoice Settings</h3>
          </div>
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)]">Default Payment Terms</label>
                <p className="text-xs text-[var(--color-text-muted)]">Default terms for new customers</p>
              </div>
              <Select value={defaultPaymentTerms} onValueChange={setDefaultPaymentTerms}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="net_15">Net 15</SelectItem>
                  <SelectItem value="net_30">Net 30</SelectItem>
                  <SelectItem value="net_45">Net 45</SelectItem>
                  <SelectItem value="net_60">Net 60</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)]">Invoice Due Days</label>
                <p className="text-xs text-[var(--color-text-muted)]">Default days until invoice is due</p>
              </div>
              <Input
                type="number"
                min="1"
                max="120"
                value={invoiceDueDays}
                onChange={(e) => setInvoiceDueDays(e.target.value)}
                className="w-20 text-right"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)]">Overdue Reminder Frequency</label>
                <p className="text-xs text-[var(--color-text-muted)]">Days between overdue payment reminders</p>
              </div>
              <Input
                type="number"
                min="1"
                max="30"
                value={overdueReminderDays}
                onChange={(e) => setOverdueReminderDays(e.target.value)}
                className="w-20 text-right"
              />
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-[var(--color-text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Company Information</h3>
          </div>
          <div className="space-y-3 pl-6">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Company Name</label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Address</label>
              <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)]">Phone</label>
                <Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)]">Email</label>
                <Input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-[var(--color-text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Notifications</h3>
          </div>
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)]">SMS Notifications</label>
                <p className="text-xs text-[var(--color-text-muted)]">Send SMS alerts via Twilio</p>
              </div>
              <Switch checked={sendSms} onCheckedChange={setSendSms} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)]">Email Notifications</label>
                <p className="text-xs text-[var(--color-text-muted)]">Send email alerts</p>
              </div>
              <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
            </div>
          </div>
        </div>

        {/* Settlement Settings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-[var(--color-text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Settlement Settings</h3>
          </div>
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)]">Default Period</label>
                <p className="text-xs text-[var(--color-text-muted)]">Default settlement frequency</p>
              </div>
              <Select value={settlementPeriod} onValueChange={setSettlementPeriod}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* QuickBooks Settings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-[var(--color-text-muted)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">QuickBooks</h3>
          </div>
          <div className="space-y-3 pl-6">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Income Account Name</label>
              <p className="text-xs text-[var(--color-text-muted)]">QBO income account for service items</p>
              <Input value={qbIncomeAccount} onChange={(e) => setQbIncomeAccount(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Expense Account Name</label>
              <p className="text-xs text-[var(--color-text-muted)]">QBO expense account for carrier bills</p>
              <Input value={qbExpenseAccount} onChange={(e) => setQbExpenseAccount(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)]">Bank Account Name</label>
              <p className="text-xs text-[var(--color-text-muted)]">QBO bank account for bill payments</p>
              <Input value={qbBankAccount} onChange={(e) => setQbBankAccount(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
