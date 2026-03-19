import type { Metadata } from "next";
import { Logo } from "@/components/shared/Logo";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Login",
};

export default function AdminLoginPage() {
  return (
    <div className="w-full max-w-sm px-4 animate-fade-in">
      <div className="flex flex-col items-center mb-8">
        <Logo size="lg" className="mb-4" />
        <h1 className="text-xl font-bold text-gold-300">Admin Portal</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Sign in to manage dispatch and operations
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6">
        <form className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold touch-target"
              placeholder="admin@jfudgetrucking.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold touch-target"
              placeholder="Enter password"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-gold px-4 py-3 text-sm font-semibold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-colors touch-target"
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
