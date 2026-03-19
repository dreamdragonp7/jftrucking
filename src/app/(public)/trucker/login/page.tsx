import type { Metadata } from "next";
import { Logo } from "@/components/shared/Logo";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trucker Login",
};

export default function TruckerLoginPage() {
  return (
    <div className="w-full max-w-sm px-4 animate-fade-in">
      <div className="flex flex-col items-center mb-8">
        <Logo size="lg" className="mb-4" />
        <h1 className="text-xl font-bold text-gold-300">Trucker Portal</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Sign in to view your loads
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6">
        <form className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold touch-target-large"
              placeholder="(512) 555-0100"
            />
          </div>
          <div>
            <label
              htmlFor="pin"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={6}
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold touch-target-large text-center tracking-[0.5em] text-lg"
              placeholder="------"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-gold px-4 py-4 text-base font-semibold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-colors touch-target-large"
          >
            Sign In
          </button>
        </form>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-sm text-[var(--color-text-muted)] hover:text-gold-300 transition-colors"
        >
          &larr; Back to portal selection
        </Link>
      </div>
    </div>
  );
}
