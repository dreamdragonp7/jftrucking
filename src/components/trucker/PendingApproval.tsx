"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { Logo } from "@/components/shared/Logo";

/**
 * Full-screen inactive account gate.
 * Shown to drivers whose profile status is "inactive".
 * They cannot access the trucker portal until admin reactivates their account.
 * @deprecated With simplified ProfileStatus (active | inactive), users sign up as "active".
 * This component is retained for the case where an admin deactivates a driver account.
 */
export function PendingApproval({
  signOutAction,
}: {
  signOutAction: () => Promise<void>;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface-deep px-6 safe-all">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center max-w-xs"
      >
        {/* Logo */}
        <Logo size="lg" className="mb-8" />

        {/* Clock icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-20 h-20 rounded-full bg-[var(--color-brand-gold)]/10 flex items-center justify-center mb-6"
        >
          <Clock className="w-10 h-10 text-brand-gold" />
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-2xl font-bold text-[var(--color-text-primary)] mb-3"
        >
          Account Inactive
        </motion.h1>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="text-base text-[var(--color-text-secondary)] leading-relaxed mb-8"
        >
          Your account is currently inactive. Please contact
          J Fudge Trucking for more information.
        </motion.p>

        {/* Sign Out button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="w-full"
        >
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full h-14 rounded-xl border border-[var(--color-border)] bg-surface text-base font-medium text-[var(--color-text-secondary)] hover:bg-surface-hover hover:text-[var(--color-text-primary)] transition-colors touch-target-large"
            >
              Sign Out
            </button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
