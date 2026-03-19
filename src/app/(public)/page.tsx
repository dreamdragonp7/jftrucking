import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { Truck, HardHat, Building2 } from "lucide-react";

const PORTALS = [
  {
    label: "Admin Portal",
    description: "Dispatch, invoicing, and fleet management",
    href: "/admin/login",
    icon: Building2,
  },
  {
    label: "Trucker Portal",
    description: "View loads, confirm deliveries",
    href: "/trucker/login",
    icon: Truck,
  },
  {
    label: "Customer Portal",
    description: "Place orders, track deliveries, pay invoices",
    href: "/customer/login",
    icon: HardHat,
  },
] as const;

export default function HomePage() {
  return (
    <main className="flex flex-col items-center px-4 py-8 w-full max-w-md mx-auto animate-fade-in">
      <Logo size="xl" className="mb-4" />
      <h1 className="text-2xl font-bold text-gold-300 mb-1 text-center">
        J Fudge Trucking
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-8 text-center">
        Aggregate Hauling &middot; Texas
      </p>

      <div className="w-full flex flex-col gap-3">
        {PORTALS.map((portal) => {
          const Icon = portal.icon;
          return (
            <Link
              key={portal.href}
              href={portal.href}
              className="group flex items-center gap-4 w-full rounded-xl border border-[var(--color-border)] bg-surface p-4 transition-all hover:bg-surface-elevated hover:border-[var(--color-border-strong)] touch-target-comfortable"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-brown-700 text-gold-300 group-hover:bg-brand-gold group-hover:text-[var(--color-text-on-gold)] transition-colors">
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-base font-semibold text-[var(--color-text-primary)]">
                  {portal.label}
                </span>
                <span className="block text-sm text-[var(--color-text-secondary)]">
                  {portal.description}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-[var(--color-text-muted)] text-center">
        &copy; {new Date().getFullYear()} J Fudge Trucking LLC. All rights
        reserved.
      </p>
    </main>
  );
}
