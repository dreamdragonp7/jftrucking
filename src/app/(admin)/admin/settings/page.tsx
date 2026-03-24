import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import * as materialsData from "@/lib/data/materials.data";
import * as profilesData from "@/lib/data/profiles.data";
import * as settingsData from "@/lib/data/settings.data";
import { requireRole } from "@/lib/supabase/auth";
import { MaterialsSection } from "./_components/MaterialsSection";
import { CompanyInfoSection } from "./_components/CompanyInfoSection";
import { UserManagementSection } from "./_components/UserManagementSection";
import { BusinessRulesSection } from "./_components/BusinessRulesSection";

export const metadata: Metadata = {
  title: "Settings",
};

export const dynamic = "force-dynamic";

async function SettingsContent() {
  const [auth, materialsResult, profilesResult, allSettings] = await Promise.all([
    requireRole("admin"),
    materialsData.getAll(),
    profilesData.getAll({ limit: 100 }),
    settingsData.getAllSettings(),
  ]);

  // Convert settings array to a Record for easy lookup
  const settingsMap: Record<string, string> = {};
  for (const s of allSettings) {
    settingsMap[s.key] = s.value;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <CompanyInfoSection />
      <BusinessRulesSection currentSettings={settingsMap} />
      <UserManagementSection users={profilesResult.data} currentUserId={auth.user.id} />
      <MaterialsSection materials={materialsResult.data} />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-48 rounded-lg" />
      ))}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="animate-slide-up-fade space-y-6">
      <PageHeader
        iconName="settings"
        title="Settings"
        description="System configuration, business rules, and user management"
      />

      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
