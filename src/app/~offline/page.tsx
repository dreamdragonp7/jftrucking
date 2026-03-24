import { Logo } from "@/components/shared/Logo";

export const dynamic = "force-static";

/**
 * Offline fallback page — shown by the service worker when the user
 * navigates to a page without a network connection.
 *
 * Uses minimal JS-independent styling so it works even if bundles
 * fail to load. The "Try Again" button uses a form action fallback
 * alongside a client-side click handler for progressive enhancement.
 */
export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--color-surface-deep)] px-6 py-12 text-center">
      <div className="max-w-sm flex flex-col items-center gap-6">
        {/* Logo */}
        <Logo size="xl" />

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-brand-brown">
            You&apos;re Offline
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Don&apos;t worry — your pending deliveries are saved and will sync
            when you&apos;re back online.
          </p>
        </div>

        {/* Try Again — works without JS via form GET to current page */}
        <form action="">
          <button
            type="submit"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-brand-gold text-[var(--color-text-on-gold)] font-semibold text-base transition-all hover:bg-gold-400 active:scale-[0.98] touch-target-comfortable"
          >
            Try Again
          </button>
        </form>

        {/* Connection hint */}
        <p className="text-xs text-[var(--color-text-muted)]">
          Check your Wi-Fi or cellular connection and try again.
        </p>
      </div>
    </div>
  );
}
