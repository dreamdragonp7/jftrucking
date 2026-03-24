"use client";

import {
  Building2,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JFT_COMPANY } from "@/lib/constants/company";

// ---------------------------------------------------------------------------
// CompanyInfoSection — displays read-only company info from constants
// ---------------------------------------------------------------------------

export function CompanyInfoSection() {
  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[var(--color-text-muted)]" />
          <div>
            <CardTitle className="text-base">Company Information</CardTitle>
            <CardDescription>Used on invoices, settlements, and emails</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoRow icon={Building2} label="Company Name" value={JFT_COMPANY.name} />
        <InfoRow icon={MapPin} label="Address" value={`${JFT_COMPANY.address}, ${JFT_COMPANY.city}, ${JFT_COMPANY.state} ${JFT_COMPANY.zip}`} />
        <InfoRow icon={Phone} label="Phone" value={JFT_COMPANY.phone} />
        <InfoRow icon={Mail} label="Email" value={JFT_COMPANY.email} />
        <p className="text-xs text-[var(--color-text-muted)] pt-2">
          To update company info, scroll down to the Business Rules section below.
        </p>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0" />
      <span className="text-xs text-[var(--color-text-muted)] w-24 flex-shrink-0">{label}</span>
      <span className="text-sm text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}
