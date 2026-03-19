import type { Metadata } from "next";
import { Logo } from "@/components/shared/Logo";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Customer Sign Up",
};

export default function CustomerSignupPage() {
  return (
    <div className="w-full max-w-sm px-4 animate-fade-in">
      <div className="flex flex-col items-center mb-8">
        <Logo size="lg" className="mb-4" />
        <h1 className="text-xl font-bold text-gold-300">Create Account</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Set up your customer portal access
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6">
        <form className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="company"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Company Name
            </label>
            <input
              id="company"
              type="text"
              autoComplete="organization"
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold touch-target"
              placeholder="Your Construction Co."
            />
          </div>
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Contact Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold touch-target"
              placeholder="John Smith"
            />
          </div>
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
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold touch-target"
              placeholder="(512) 555-0100"
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
              autoComplete="new-password"
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold touch-target"
              placeholder="Create a password"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-gold px-4 py-3 text-sm font-semibold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-colors touch-target"
          >
            Create Account
          </button>
        </form>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Link
          href="/customer/login"
          className="text-sm text-gold-300 hover:text-gold-200 transition-colors"
        >
          Already have an account? Sign in
        </Link>
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
