import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <Logo size="lg" className="mb-8" />
      <h1 className="text-4xl font-bold text-brand-brown mb-2">404</h1>
      <p className="text-lg text-[var(--color-text-secondary)] mb-8 text-center">
        This page doesn&apos;t exist. It may have been moved or the URL is
        incorrect.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-lg bg-brand-gold px-6 py-3 text-sm font-semibold text-[var(--color-text-on-gold)] transition-colors hover:bg-gold-400 touch-target"
      >
        Back to Home
      </Link>
    </div>
  );
}
